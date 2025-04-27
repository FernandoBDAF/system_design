#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to check if a resource exists
check_resource() {
    kubectl get $1 $2 -n $3 &> /dev/null
    return $?
}

# Function to create secret if it doesn't exist
create_secret() {
    if ! check_resource secret $1 $2; then
        echo "Creating secret $1 in namespace $2..."
        kubectl create secret generic $1 --from-literal=password=$3 --namespace=$2
        print_status $? "Secret $1 created"
    else
        echo -e "${YELLOW}Secret $1 already exists in namespace $2${NC}"
    fi
}

# Function to check pod status
check_pods() {
    local namespace=$1
    local label=$2
    echo "Checking pods in namespace $namespace with label $label..."
    kubectl get pods -n $namespace -l $label -o wide
    local ready=$(kubectl get pods -n $namespace -l $label -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | tr ' ' '\n' | grep -c "True")
    local total=$(kubectl get pods -n $namespace -l $label -o jsonpath='{.items[*].metadata.name}' | wc -w)
    if [ "$ready" -ne "$total" ]; then
        echo "Error: Not all pods are ready in namespace $namespace"
        return 1
    fi
    return 0
}

# Function to check service endpoints
check_endpoints() {
    local namespace=$1
    local service=$2
    echo "Checking endpoints for service $service in namespace $namespace..."
    kubectl get endpoints $service -n $namespace
    local endpoints=$(kubectl get endpoints $service -n $namespace -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
    if [ "$endpoints" -eq "0" ]; then
        echo "Error: No endpoints found for service $service"
        return 1
    fi
    return 0
}

# Function to check network policies
check_network_policies() {
    local namespace=$1
    echo "Checking network policies in namespace $namespace..."
    kubectl get networkpolicies -n $namespace
}

# Function to check resource usage
check_resources() {
    local namespace=$1
    echo "Checking resource usage in namespace $namespace..."
    if kubectl top pods -n $namespace &> /dev/null; then
        kubectl top pods -n $namespace
    else
        echo -e "${YELLOW}Warning: Metrics API not available. Skipping resource usage check.${NC}"
    fi
}

echo "Starting comprehensive deployment test..."

# Step 1: Setup validation
echo "Step 1: Validating initial setup..."
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl not found"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: docker not found"
    exit 1
fi

# Step 2: Create namespaces
echo "Step 2: Creating namespaces..."
kubectl apply -f "${SCRIPT_DIR}/namespaces.yaml"
echo "Waiting for namespaces to be active..."
sleep 5

# Verify namespaces
for ns in client-layer server-layer data-layer observability-layer; do
    if ! kubectl get namespace $ns &> /dev/null; then
        echo "Error: Namespace $ns not created"
        exit 1
    fi
done
print_status 0 "Namespaces created and verified"

# Step 3: Apply RBAC configurations
echo "Step 3: Applying RBAC configurations..."
kubectl apply -f "${SCRIPT_DIR}/rbac.yaml"
kubectl apply -f "${SCRIPT_DIR}/service-account.yaml"
print_status $? "RBAC configurations applied"

# Step 4: Verify service accounts
echo "Step 4: Verifying service accounts..."
kubectl get serviceaccount pod-reader -n server-layer || {
    echo "Error: pod-reader service account not found in server-layer"
    exit 1
}
kubectl get serviceaccount pod-reader -n observability-layer || {
    echo "Error: pod-reader service account not found in observability-layer"
    exit 1
}
print_status 0 "Service accounts verified"

# Step 5: Create required secrets and configmaps
echo "Step 5: Creating required secrets and configmaps..."
create_secret postgres-secret data-layer profile123
create_secret redis-secret data-layer redis
create_secret grafana-secret observability-layer admin

# Step 6: Test network policies
echo "Step 6: Testing network policies..."
kubectl apply -f "${SCRIPT_DIR}/network-policies.yaml"

# Step 7: Deploy components layer by layer
echo "Step 7: Testing layer deployments..."

# Build images first
echo "Building Docker images..."
docker build -t server:latest -f server/Dockerfile server/
docker build -t client:latest -f client/Dockerfile client/
docker build -t worker:latest -f worker/Dockerfile worker/
echo "Loading images into Kind cluster..."
kind load docker-image server:latest --name profile-service
kind load docker-image client:latest --name profile-service
kind load docker-image worker:latest --name profile-service

# Data Layer
echo "Deploying data layer..."
kubectl apply -f "${SCRIPT_DIR}/postgresql.yaml" -n data-layer
kubectl apply -f "${SCRIPT_DIR}/redis.yaml" -n data-layer
echo "Waiting for data layer components..."
kubectl wait --for=condition=ready pod -l app=postgres -n data-layer --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n data-layer --timeout=120s

# Verify data layer
echo "Verifying data layer..."
check_pods "data-layer" "app=postgres"
check_pods "data-layer" "app=redis"
check_endpoints "data-layer" "postgres"
check_endpoints "data-layer" "redis"
check_network_policies "data-layer"
check_resources "data-layer"

# Server Layer
echo "Deploying server layer..."
kubectl apply -f "${SCRIPT_DIR}/rabbitmq.yaml" -n server-layer
echo "Waiting for RabbitMQ to be fully operational..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n server-layer --timeout=120s

# Start port-forwarding for RabbitMQ management API
echo "Setting up port-forward for RabbitMQ management API..."
kubectl port-forward -n server-layer svc/rabbitmq 15672:15672 &
PORT_FORWARD_PID=$!

# Wait for RabbitMQ management API to be responsive
echo "Waiting for RabbitMQ management API..."
until curl -s http://localhost:15672/api/overview > /dev/null; do
    echo "Waiting for RabbitMQ management API..."
    sleep 5
done

# Kill the port-forward process
kill $PORT_FORWARD_PID
echo "RabbitMQ is fully operational"

# Now deploy server and worker
kubectl apply -f "${SCRIPT_DIR}/server.yaml" -n server-layer
kubectl apply -f "${SCRIPT_DIR}/worker.yaml" -n server-layer
echo "Waiting for server layer components..."
kubectl wait --for=condition=ready pod -l app=server -n server-layer --timeout=120s
kubectl wait --for=condition=ready pod -l app=worker -n server-layer --timeout=120s

# Verify server layer
echo "Verifying server layer..."
check_pods "server-layer" "app=rabbitmq"
check_pods "server-layer" "app=server"
check_pods "server-layer" "app=worker"
check_endpoints "server-layer" "rabbitmq"
check_endpoints "server-layer" "server"
check_network_policies "server-layer"
check_resources "server-layer"

# Client Layer
echo "Deploying client layer..."
kubectl apply -f "${SCRIPT_DIR}/client.yaml" -n client-layer
echo "Waiting for client layer components..."
kubectl wait --for=condition=ready pod -l app=client -n client-layer --timeout=120s

# Verify client layer
echo "Verifying client layer..."
check_pods "client-layer" "app=client"
check_endpoints "client-layer" "client"
check_network_policies "client-layer"
check_resources "client-layer"

# Observability Layer
echo "Deploying observability layer..."
kubectl apply -f "${SCRIPT_DIR}/monitoring.yaml" -n observability-layer
echo "Waiting for observability components..."
kubectl wait --for=condition=ready pod -l app=prometheus -n observability-layer --timeout=120s
kubectl wait --for=condition=ready pod -l app=grafana -n observability-layer --timeout=120s

# Verify observability layer
echo "Verifying observability layer..."
check_pods "observability-layer" "app=prometheus"
check_pods "observability-layer" "app=grafana"
check_endpoints "observability-layer" "prometheus"
check_endpoints "observability-layer" "grafana"
check_network_policies "observability-layer"
check_resources "observability-layer"

# Step 8: Test cross-layer communication
echo "Step 8: Testing cross-layer communication..."

# Test client to server communication
echo "Testing client to server communication..."
CLIENT_POD=$(kubectl get pod -n client-layer -l app=client -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n client-layer $CLIENT_POD -- wget -qO- http://server.server-layer:8080/health || {
    echo "Error: Client to server communication failed"
    exit 1
}
print_status 0 "Client to server communication successful"

# Test server to database communication
echo "Testing server to database communication..."
SERVER_POD=$(kubectl get pod -n server-layer -l app=server -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n server-layer $SERVER_POD -- sh -c 'nc -zv postgres.data-layer 5432' || {
    echo "Error: Server to database communication failed"
    exit 1
}
print_status 0 "Server to database communication successful"

# Test server to Redis communication
echo "Testing server to Redis communication..."
kubectl exec -n server-layer $SERVER_POD -- sh -c 'nc -zv redis.data-layer 6379' || {
    echo "Error: Server to Redis communication failed"
    exit 1
}
print_status 0 "Server to Redis communication successful"

# Test server to RabbitMQ communication
echo "Testing server to RabbitMQ communication..."
kubectl exec -n server-layer $SERVER_POD -- sh -c 'nc -zv rabbitmq.server-layer 5672' || {
    echo "Error: Server to RabbitMQ communication failed"
    exit 1
}
print_status 0 "Server to RabbitMQ communication successful"

# Test observability to server communication
echo "Testing observability to server communication..."
PROMETHEUS_POD=$(kubectl get pod -n observability-layer -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n observability-layer $PROMETHEUS_POD -- wget -qO- http://server.server-layer:8081/metrics || {
    echo "Error: Observability to server communication failed"
    exit 1
}
print_status 0 "Observability to server communication successful"

echo -e "${GREEN}All cross-layer communication tests passed!${NC}"

# Step 9: Test observability setup
echo "Step 9: Testing observability setup..."
PROMETHEUS_POD=$(kubectl get pod -n observability-layer -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n observability-layer $PROMETHEUS_POD -- curl -s http://localhost:9090/-/healthy || {
    echo "Error: Prometheus health check failed"
    exit 1
}

# Step 10: Verify resource allocation
echo "Step 10: Verifying resource allocation..."
kubectl describe nodes | grep -A 5 "Allocated resources"

# Final status check
echo "Step 11: Final status check..."
kubectl get pods --all-namespaces

echo -e "${GREEN}Deployment test completed successfully!${NC}"

# Wait for all pods to be ready
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod --all -n data-layer --timeout=300s
kubectl wait --for=condition=ready pod --all -n server-layer --timeout=300s
kubectl wait --for=condition=ready pod --all -n client-layer --timeout=300s
kubectl wait --for=condition=ready pod --all -n observability-layer --timeout=300s

echo "Deployment completed!" 