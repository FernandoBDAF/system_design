#!/bin/bash

# Exit on error
set -e

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "Error: $1 is required but not installed"
        exit 1
    fi
}

# Function to check Kubernetes cluster status
check_cluster() {
    echo "Checking Kubernetes cluster status..."
    kubectl cluster-info
    if [ $? -ne 0 ]; then
        echo "Error: Cannot connect to Kubernetes cluster"
        exit 1
    fi
}

# Function to check namespace existence
check_namespace() {
    local namespace=$1
    if ! kubectl get namespace $namespace &> /dev/null; then
        echo "Namespace $namespace does not exist"
        return 1
    fi
    return 0
}

# Check required commands
echo "Checking required commands..."
check_command kubectl
check_command docker
check_command make

# Check Kubernetes cluster
check_cluster

# Check for existing namespaces
echo "Checking for existing namespaces..."
namespaces=("client-layer" "server-layer" "data-layer" "observability-layer")
for ns in "${namespaces[@]}"; do
    if check_namespace $ns; then
        echo "Warning: Namespace $ns already exists"
        read -p "Do you want to delete it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete namespace $ns
        else
            echo "Skipping namespace $ns"
        fi
    fi
done

# Check Docker images
echo "Checking required Docker images..."
images=("client:latest" "server:latest" "worker:latest")
for image in "${images[@]}"; do
    if ! docker image inspect $image &> /dev/null; then
        echo "Error: Image $image not found. Please run 'make build' first"
        exit 1
    fi
done

# Check file permissions
echo "Checking file permissions..."
chmod +x k8s/apply-layers.sh
chmod +x k8s/validate-setup.sh

echo "Validation completed successfully!" 