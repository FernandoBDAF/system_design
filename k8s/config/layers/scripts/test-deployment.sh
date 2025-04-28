#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
    return 1
}

# Function to check if a resource exists
check_resource() {
    kubectl get $1 $2 -n $3 &> /dev/null
    return $?
}

# Function to create secret if it doesn't exist
create_secret() {
    local name=$1
    local namespace=$2
    local key=$3
    local value=$4
    
    if ! check_resource secret $name $namespace; then
        echo "Creating secret $name in namespace $namespace..."
        kubectl create secret generic $name \
            --from-literal=$key=$value \
            --namespace=$namespace \
            --dry-run=client -o yaml | kubectl apply -f -
        print_status "Secret $name created"
    else
        print_warning "Secret $name already exists in namespace $namespace"
    fi
}

# Function to check pod status
check_pods() {
    local namespace=$1
    local label=$2
    echo "Checking pods in namespace $namespace with label $label..."
    
    # Wait for pods to be created
    local timeout=60
    local start_time=$(date +%s)
    while ! kubectl get pods -n $namespace -l $label &>/dev/null; do
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $timeout ]; then
            print_error "Timeout waiting for pods in namespace $namespace with label $label"
            return 1
        fi
        sleep 2
    done
    
    kubectl get pods -n $namespace -l $label -o wide
    local ready=$(kubectl get pods -n $namespace -l $label -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | tr ' ' '\n' | grep -c "True")
    local total=$(kubectl get pods -n $namespace -l $label -o jsonpath='{.items[*].metadata.name}' | wc -w)
    
    if [ "$ready" -ne "$total" ]; then
        print_error "Not all pods are ready in namespace $namespace"
        return 1
    fi
    print_status "All pods are ready in namespace $namespace"
    return 0
}

# Function to check service endpoints
check_endpoints() {
    local namespace=$1
    local service=$2
    echo "Checking endpoints for service $service in namespace $namespace..."
    
    # Wait for endpoints to be created
    local timeout=60
    local start_time=$(date +%s)
    while ! kubectl get endpoints $service -n $namespace &>/dev/null; do
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $timeout ]; then
            print_error "Timeout waiting for endpoints of service $service in namespace $namespace"
            return 1
        fi
        sleep 2
    done
    
    kubectl get endpoints $service -n $namespace
    local endpoints=$(kubectl get endpoints $service -n $namespace -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
    
    if [ "$endpoints" -eq "0" ]; then
        print_error "No endpoints found for service $service"
        return 1
    fi
    print_status "Service $service has active endpoints"
    return 0
}

# Function to check network policies
check_network_policies() {
    local namespace=$1
    echo "Checking network policies in namespace $namespace..."
    kubectl get networkpolicies -n $namespace
    print_status "Network policies checked in namespace $namespace"
}

# Function to check resource usage
check_resources() {
    local namespace=$1
    echo "Checking resource usage in namespace $namespace..."
    kubectl top pods -n $namespace 2>/dev/null || print_warning "Metrics API not available - continuing without resource metrics"
    return 0
}

# Function to test TCP connectivity
test_tcp_connection() {
    local namespace=$1
    local pod=$2
    local target_host=$3
    local target_port=$4
    local timeout=$5
    
    echo "Testing TCP connection from $pod to $target_host:$target_port..."
    kubectl exec -n $namespace $pod -- timeout $timeout bash -c "nc -z -v $target_host $target_port" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "TCP connection successful"
        return 0
    else
        print_error "TCP connection failed"
        return 1
    fi
}

# Function to clean up resources
cleanup() {
    echo "Cleaning up test resources..."
    kubectl delete namespace test-namespace --wait=false 2>/dev/null || true
    print_status "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

echo "Starting comprehensive deployment test..."

# Step 1: Setup validation
echo "Step 1: Validating initial setup..."
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "docker not found"
    exit 1
fi

# Step 2: Test namespace creation
echo "Step 2: Testing namespace creation..."
kubectl apply -f k8s/config/infrastructure/namespaces.yaml
echo "Waiting for namespaces to be active..."
sleep 5

# Verify namespaces
for ns in client-layer server-layer data-layer observability-layer; do
    if ! kubectl get namespace $ns &> /dev/null; then
        print_error "Namespace $ns not created"
        exit 1
    fi
    print_status "Namespace $ns created"
done

# Step 3: Create required secrets and configmaps
echo "Step 3: Creating required secrets and configmaps..."
create_secret "postgres-secret" "data-layer" "POSTGRES_PASSWORD" "profile123"
create_secret "redis-secret" "data-layer" "password" "redis"
create_secret "grafana-secret" "observability-layer" "GF_SECURITY_ADMIN_PASSWORD" "admin"

# Step 4: Test network policies
echo "Step 4: Testing network policies..."
kubectl apply -f k8s/config/infrastructure/network-policies.yaml

# Step 5: Deploy components layer by layer
echo "Step 5: Testing layer deployments..."

# Build images if they don't exist
echo "Checking Docker images..."
for image in server:latest client:latest worker:latest; do
    if ! docker image inspect $image &>/dev/null; then
        print_warning "Image $image not found, building..."
        case $image in
            server:latest)
                docker build -t server:latest -f server/Dockerfile server/
                ;;
            client:latest)
                docker build -t client:latest -f client/Dockerfile client/
                ;;
            worker:latest)
                docker build -t worker:latest -f worker/Dockerfile worker/
                ;;
        esac
    fi
done

echo "Loading images into Kind cluster..."
kind load docker-image server:latest client:latest worker:latest --name profile-service

# Data Layer
echo "Deploying data layer..."
kubectl apply -f k8s/config/layers/data/postgresql.yaml -n data-layer
kubectl apply -f k8s/config/layers/data/redis.yaml -n data-layer
kubectl apply -f k8s/config/layers/data/rabbitmq.yaml -n data-layer

echo "Waiting for data layer components..."
kubectl wait --for=condition=ready pod -l app=postgres -n data-layer --timeout=180s
kubectl wait --for=condition=ready pod -l app=redis -n data-layer --timeout=180s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n data-layer --timeout=180s

# Verify data layer
echo "Verifying data layer..."
check_pods "data-layer" "app=postgres"
check_pods "data-layer" "app=redis"
check_pods "data-layer" "app=rabbitmq"
check_endpoints "data-layer" "postgres"
check_endpoints "data-layer" "redis"
check_endpoints "data-layer" "rabbitmq"
check_network_policies "data-layer"
check_resources "data-layer"

# Server Layer
echo "Deploying server layer..."
kubectl apply -f k8s/config/layers/server/server.yaml -n server-layer
kubectl apply -f k8s/config/layers/server/worker.yaml -n server-layer

echo "Waiting for server layer components..."
kubectl wait --for=condition=ready pod -l app=server -n server-layer --timeout=180s
kubectl wait --for=condition=ready pod -l app=worker -n server-layer --timeout=180s

# Verify server layer
echo "Verifying server layer..."
check_pods "server-layer" "app=server"
check_pods "server-layer" "app=worker"
check_endpoints "server-layer" "server"
check_network_policies "server-layer"
check_resources "server-layer"

# Client Layer
echo "Deploying client layer..."
kubectl apply -f k8s/config/layers/client/client.yaml -n client-layer

echo "Waiting for client layer components..."
kubectl wait --for=condition=ready pod -l app=client -n client-layer --timeout=180s

# Verify client layer
echo "Verifying client layer..."
check_pods "client-layer" "app=client"
check_endpoints "client-layer" "client"
check_network_policies "client-layer"
check_resources "client-layer"

# Observability Layer
echo "Deploying observability layer..."
kubectl apply -f k8s/config/layers/observability/monitoring.yaml -n observability-layer

echo "Waiting for observability components..."
kubectl wait --for=condition=ready pod -l app=prometheus -n observability-layer --timeout=180s
kubectl wait --for=condition=ready pod -l app=grafana -n observability-layer --timeout=180s

# Verify observability layer
echo "Verifying observability layer..."
check_pods "observability-layer" "app=prometheus"
check_pods "observability-layer" "app=grafana"
check_endpoints "observability-layer" "prometheus"
check_endpoints "observability-layer" "grafana"
check_network_policies "observability-layer"
check_resources "observability-layer"

# Step 6: Test cross-layer communication
echo "Step 6: Testing cross-layer communication..."

# Get a server pod for testing
SERVER_POD=$(kubectl get pod -n server-layer -l app=server -o jsonpath='{.items[0].metadata.name}')

# Test server to PostgreSQL connection
echo "Testing server to PostgreSQL connection..."
test_tcp_connection "server-layer" "$SERVER_POD" "postgresql.data-layer.svc.cluster.local" "5432" "5"

# Test server to Redis connection
echo "Testing server to Redis connection..."
test_tcp_connection "server-layer" "$SERVER_POD" "redis.data-layer.svc.cluster.local" "6379" "5"

# Test server to RabbitMQ connection
echo "Testing server to RabbitMQ connection..."
test_tcp_connection "server-layer" "$SERVER_POD" "rabbitmq.data-layer.svc.cluster.local" "5672" "5"

# Test client to server connection
echo "Testing client to server connection..."
CLIENT_POD=$(kubectl get pod -n client-layer -l app=client -o jsonpath='{.items[0].metadata.name}')
test_tcp_connection "client-layer" "$CLIENT_POD" "server.server-layer.svc.cluster.local" "8080" "5"

# Step 7: Test observability setup
echo "Step 7: Testing observability setup..."

# Test Prometheus health
echo "Testing Prometheus health..."
PROMETHEUS_POD=$(kubectl get pod -n observability-layer -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n observability-layer $PROMETHEUS_POD -- wget -qO- http://localhost:9090/-/healthy &>/dev/null; then
    print_status "Prometheus is healthy"
else
    print_error "Prometheus health check failed"
fi

# Test Grafana health
echo "Testing Grafana health..."
GRAFANA_POD=$(kubectl get pod -n observability-layer -l app=grafana -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n observability-layer $GRAFANA_POD -- wget -qO- http://localhost:3000/api/health &>/dev/null; then
    print_status "Grafana is healthy"
else
    print_error "Grafana health check failed"
fi

print_status "Deployment test completed successfully!" 