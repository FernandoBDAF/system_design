#!/bin/bash

# Exit on error
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

# Function to check if a resource exists and is ready
check_resource() {
    local resource_type=$1
    local resource_name=$2
    local namespace=$3
    local timeout=${4:-300}  # Default timeout of 300 seconds (5 minutes)
    local start_time=$(date +%s)
    local status
    
    echo "Waiting for $resource_type/$resource_name in namespace $namespace..."
    
    while true; do
        if [[ "$resource_type" == "statefulset" ]]; then
            status=$(kubectl get $resource_type $resource_name -n $namespace -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            desired=$(kubectl get $resource_type $resource_name -n $namespace -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
            if [[ "$status" == "$desired" && "$desired" != "0" ]]; then
                print_status "$resource_type $resource_name is ready in namespace $namespace"
                return 0
            fi
        elif [[ "$resource_type" == "deployment" ]]; then
            status=$(kubectl get $resource_type $resource_name -n $namespace -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
            desired=$(kubectl get $resource_type $resource_name -n $namespace -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
            if [[ "$status" == "$desired" && "$desired" != "0" ]]; then
                print_status "$resource_type $resource_name is ready in namespace $namespace"
                return 0
            fi
        else
            status=$(kubectl get $resource_type $resource_name -n $namespace -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
            if [[ "$status" == "True" ]]; then
                print_status "$resource_type $resource_name is ready in namespace $namespace"
                return 0
            fi
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            print_error "Timeout waiting for $resource_type $resource_name in namespace $namespace"
            kubectl describe $resource_type $resource_name -n $namespace
            return 1
        fi
        
        sleep 5
    done
}

# Function to create a resource with error handling
create_resource() {
    local file=$1
    local namespace=$2
    
    echo "Creating resource from $file in namespace $namespace..."
    if ! kubectl apply -f $file -n $namespace 2>/dev/null; then
        print_error "Failed to create resource from $file in namespace $namespace"
        return 1
    fi
    print_status "Created resource from $file in namespace $namespace"
    return 0
}

# Function to create a secret if it doesn't exist
create_secret() {
    local name=$1
    local namespace=$2
    local key=$3
    local value=$4
    
    echo "Creating secret $name in namespace $namespace..."
    if ! kubectl create secret generic $name \
        --from-literal=$key=$value \
        --namespace=$namespace \
        --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null; then
        print_error "Failed to create secret $name in namespace $namespace"
        return 1
    fi
    print_status "Created/updated secret $name in namespace $namespace"
    return 0
}

# Function to wait for namespace to be active
wait_for_namespace() {
    local namespace=$1
    local timeout=30
    local start_time=$(date +%s)
    
    echo "Waiting for namespace $namespace to be active..."
    while true; do
        if kubectl get namespace $namespace -o jsonpath='{.status.phase}' 2>/dev/null | grep -q "Active"; then
            print_status "Namespace $namespace is active"
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            print_error "Timeout waiting for namespace $namespace to be active"
            return 1
        fi
        
        sleep 2
    done
}

# Create namespaces
echo "Creating namespaces..."
create_resource "k8s/config/infrastructure/namespaces.yaml" "default"

# Wait for namespaces to be active
for ns in client-layer server-layer data-layer observability-layer; do
    wait_for_namespace $ns
done

# Create network policies
echo "Creating network policies..."
kubectl apply -f k8s/config/infrastructure/network-policies.yaml

# Create RBAC configurations
echo "Creating RBAC configurations..."
kubectl apply -f k8s/config/infrastructure/rbac.yaml

# Create secrets
echo "Creating secrets..."
create_secret "postgres-secret" "data-layer" "POSTGRES_PASSWORD" "postgres"
create_secret "redis-secret" "data-layer" "password" "redis"
create_secret "grafana-secret" "observability-layer" "GF_SECURITY_ADMIN_PASSWORD" "admin"

# Deploy data layer components
echo "Deploying data layer components..."
create_resource "k8s/config/layers/data/postgresql.yaml" "data-layer"
create_resource "k8s/config/layers/data/redis.yaml" "data-layer"
create_resource "k8s/config/layers/data/rabbitmq.yaml" "data-layer"

# Wait for data layer components
check_resource "statefulset" "postgresql" "data-layer" 180 &
check_resource "deployment" "redis" "data-layer" 180 &
check_resource "statefulset" "rabbitmq" "data-layer" 180 &
wait

# Deploy server layer components
echo "Deploying server layer components..."
create_resource "k8s/config/layers/server/server.yaml" "server-layer"
create_resource "k8s/config/layers/server/worker.yaml" "server-layer"

# Deploy client layer components
echo "Deploying client layer components..."
create_resource "k8s/config/layers/client/client.yaml" "client-layer"

# Wait for server and client layer components
check_resource "deployment" "server" "server-layer" 180 &
check_resource "deployment" "worker" "server-layer" 180 &
check_resource "deployment" "client" "client-layer" 180 &
wait

# Deploy observability layer components
echo "Deploying observability layer components..."
create_resource "k8s/config/layers/observability/monitoring.yaml" "observability-layer"

# Wait for observability components
check_resource "deployment" "prometheus" "observability-layer" 180 &
check_resource "deployment" "grafana" "observability-layer" 180 &
wait

print_status "Deployment completed successfully!"
echo "Note: Some components may still be initializing. Use 'kubectl get pods -A' to check status." 