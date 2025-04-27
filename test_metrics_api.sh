#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Testing Metrics API Endpoints${NC}\n"

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

# Check required commands
check_command kubectl
check_command jq

# Function to test metrics endpoint
test_metrics_endpoint() {
    echo -e "${GREEN}Testing $1 metrics...${NC}"
    
    # Get the metrics
    if [ "$1" == "nodes" ]; then
        metrics=$(kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes 2>/dev/null)
    else
        metrics=$(kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/profile-service/pods 2>/dev/null)
    fi

    # Check if we got a response
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Could not access metrics API${NC}"
        echo "Make sure metrics-server is running and port-forward is active"
        exit 1
    fi

    # Parse and display metrics
    if [ "$1" == "nodes" ]; then
        echo "$metrics" | jq -r '.items[] | "Node: \(.metadata.name)\n  CPU: \(.usage.cpu)\n  Memory: \(.usage.memory)\n"'
    else
        echo "$metrics" | jq -r '.items[] | "Pod: \(.metadata.name)\n  CPU: \(.containers[0].usage.cpu)\n  Memory: \(.containers[0].usage.memory)\n"'
    fi
}

# Test node metrics
test_metrics_endpoint "nodes"

echo -e "\n${GREEN}Testing pod metrics...${NC}\n"

# Test pod metrics
test_metrics_endpoint "pods"

# Test specific pod metrics with labels
echo -e "\n${GREEN}Testing specific pod metrics...${NC}\n"

# Server pods
echo -e "${GREEN}Server Pods:${NC}"
kubectl get pods -n profile-service -l app=profile-server -o json | \
jq -r '.items[] | "Pod: \(.metadata.name)\n  Status: \(.status.phase)\n  IP: \(.status.podIP)\n"'

# Worker pods
echo -e "\n${GREEN}Worker Pods:${NC}"
kubectl get pods -n profile-service -l app=profile-worker -o json | \
jq -r '.items[] | "Pod: \(.metadata.name)\n  Status: \(.status.phase)\n  IP: \(.status.podIP)\n"'

# Database pods
echo -e "\n${GREEN}Database Pods:${NC}"
kubectl get pods -n profile-service -l app=postgres -o json | \
jq -r '.items[] | "Pod: \(.metadata.name)\n  Status: \(.status.phase)\n  IP: \(.status.podIP)\n"'

echo -e "\n${GREEN}Metrics API test completed${NC}" 