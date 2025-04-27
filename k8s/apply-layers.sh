#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to check if a command succeeded
check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1 failed"
        exit 1
    fi
}

# Function to wait for pods to be ready
wait_for_pods() {
    local namespace=$1
    local label=$2
    local timeout=$3
    
    echo "Waiting for pods with label $label in namespace $namespace to be ready..."
    kubectl wait --for=condition=ready pod -l $label -n $namespace --timeout=${timeout}s
    check_command "Waiting for pods with label $label"
}

# Apply namespaces
kubectl apply -f "${SCRIPT_DIR}/namespace.yaml"

# Apply network policies
kubectl apply -f "${SCRIPT_DIR}/network-policies.yaml"

# Apply RBAC configuration
kubectl apply -f "${SCRIPT_DIR}/rbac.yaml"

# Create secrets if they don't exist
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD=postgres \
  --namespace=data-layer \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secret \
  --from-literal=REDIS_PASSWORD=redis \
  --namespace=data-layer \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic grafana-secret \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD=admin \
  --namespace=observability-layer \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy data layer components
echo "Deploying data layer components..."
kubectl apply -f "${SCRIPT_DIR}/postgresql.yaml"
check_command "Deploying PostgreSQL"
kubectl apply -f "${SCRIPT_DIR}/redis.yaml"
check_command "Deploying Redis"

# Wait for data layer pods to be ready
wait_for_pods "data-layer" "app=postgres" 300
wait_for_pods "data-layer" "app=redis" 300

# Deploy server layer components
echo "Deploying server layer components..."
kubectl apply -f "${SCRIPT_DIR}/rabbitmq.yaml"
check_command "Deploying RabbitMQ"
kubectl apply -f "${SCRIPT_DIR}/server.yaml"
check_command "Deploying Server"
kubectl apply -f "${SCRIPT_DIR}/worker.yaml"
check_command "Deploying Worker"

# Wait for server layer pods to be ready
wait_for_pods "server-layer" "app=rabbitmq" 300
wait_for_pods "server-layer" "app=server" 300
wait_for_pods "server-layer" "app=worker" 300

# Deploy client layer components
echo "Deploying client layer components..."
kubectl apply -f "${SCRIPT_DIR}/client.yaml"
check_command "Deploying Client"

# Wait for client layer pods to be ready
wait_for_pods "client-layer" "app=client" 300

# Deploy observability layer components
echo "Deploying observability layer components..."
kubectl apply -f "${SCRIPT_DIR}/monitoring.yaml"
check_command "Deploying Monitoring"

# Wait for observability layer pods to be ready
wait_for_pods "observability-layer" "app=prometheus" 300
wait_for_pods "observability-layer" "app=grafana" 300

echo "Layer-based deployment completed successfully!" 