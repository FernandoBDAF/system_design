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
    exit 1
}

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed"
    fi
    print_status "$1 is installed"
}

# Function to check Kubernetes cluster status
check_cluster() {
    echo "Checking Kubernetes cluster status..."
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
    fi
    print_status "Connected to Kubernetes cluster"
    
    # Check if Kind cluster exists
    if ! kind get clusters | grep -q "profile-service"; then
        print_error "Kind cluster 'profile-service' not found"
    fi
    print_status "Kind cluster 'profile-service' exists"
}

# Function to check namespace existence
check_namespace() {
    local namespace=$1
    if kubectl get namespace $namespace &> /dev/null; then
        print_warning "Namespace $namespace already exists - will be recreated"
        kubectl delete namespace $namespace --wait=false &> /dev/null || true
    fi
}

# Function to check if image exists in Kind cluster
check_kind_image() {
    local image=$1
    if ! docker image inspect $image &> /dev/null; then
        print_warning "Image $image not found locally"
        return 1
    fi
    print_status "Image $image exists locally"
    return 0
}

echo "Starting validation..."

# Check required commands
echo "Checking required commands..."
check_command kubectl
check_command docker
check_command make
check_command kind

# Check Kubernetes cluster
check_cluster

# Check for existing namespaces
echo "Checking namespaces..."
namespaces=("client-layer" "server-layer" "data-layer" "observability-layer")
for ns in "${namespaces[@]}"; do
    check_namespace $ns
done

# Check Docker images
echo "Checking required Docker images..."
images=("client:latest" "server:latest" "worker:latest")
missing_images=0
for image in "${images[@]}"; do
    if ! check_kind_image $image; then
        missing_images=$((missing_images + 1))
    fi
done

if [ $missing_images -gt 0 ]; then
    print_warning "Some images are missing. They will be built during deployment."
fi

# Check file permissions and existence
echo "Checking script permissions and existence..."
script_dir="k8s/config/layers/scripts"
scripts=("apply-layers.sh" "validate-setup.sh" "test-deployment.sh")
for script in "${scripts[@]}"; do
    if [ ! -f "$script_dir/$script" ]; then
        print_error "Script $script_dir/$script not found"
    fi
    chmod +x "$script_dir/$script" 2>/dev/null || print_error "Cannot set execute permission on $script_dir/$script"
    print_status "Script $script_dir/$script is executable"
done

# Check config files existence
echo "Checking configuration files..."
config_files=(
    "k8s/config/layers/client/client.yaml"
    "k8s/config/layers/server/server.yaml"
    "k8s/config/layers/server/worker.yaml"
    "k8s/config/layers/data/postgresql.yaml"
    "k8s/config/layers/data/redis.yaml"
    "k8s/config/layers/data/rabbitmq.yaml"
    "k8s/config/layers/observability/monitoring.yaml"
    "k8s/config/infrastructure/network-policies.yaml"
    "k8s/config/infrastructure/rbac.yaml"
)

for file in "${config_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Configuration file $file not found"
    fi
    print_status "Configuration file $file exists"
done

print_status "Validation completed successfully!" 