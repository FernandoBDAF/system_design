#!/bin/bash

# Array to store PIDs of port-forward processes
declare -a PIDS=()

# Function to kill all port-forward processes
cleanup() {
    echo "Cleaning up port-forward processes..."
    for pid in "${PIDS[@]}"; do
        if ps -p $pid > /dev/null; then
            kill $pid 2>/dev/null || true
        fi
    done
    exit 0
}

# Function to find an available port
find_available_port() {
    local base_port=$1
    local port=$base_port
    while lsof -i :$port > /dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Function to start port forwarding for a service
start_port_forward() {
    local service=$1
    local namespace=$2
    local port=$3
    local target_port=$4

    # Check if the service exists
    if ! kubectl get service -n $namespace $service &>/dev/null; then
        echo "Warning: Service $service not found in namespace $namespace. Skipping..."
        return
    fi

    # Check if port is available, find alternative if not
    if lsof -i :$port > /dev/null 2>&1; then
        local new_port=$(find_available_port $port)
        echo "Warning: Port $port is in use. Using alternative port $new_port for $service"
        port=$new_port
    fi

    echo "Starting port forward for $service on port $port..."
    kubectl port-forward -n $namespace svc/$service $port:$target_port &
    PIDS+=($!)
}

# Set up trap to clean up on script exit
trap cleanup EXIT INT TERM

# Start port forwarding for all services
start_port_forward client client-layer 3000 3000
start_port_forward server server-layer 8080 8080
start_port_forward postgres data-layer 5432 5432
start_port_forward redis data-layer 6379 6379
start_port_forward rabbitmq data-layer 5672 5672
start_port_forward rabbitmq data-layer 15672 15672
start_port_forward prometheus observability-layer 9090 9090
start_port_forward grafana observability-layer 3001 3000

echo "All port forwards started. Press Ctrl+C to stop all."
echo "Access points:"
echo "  Client UI:     http://localhost:3000"
echo "  Server API:    http://localhost:8080"
echo "  PostgreSQL:    postgres://localhost:5432"
echo "  Redis:         redis://localhost:6379"
echo "  RabbitMQ:      amqp://localhost:5672"
echo "  RabbitMQ UI:   http://localhost:15672"
echo "  Prometheus:    http://localhost:9090"
echo "  Grafana:       http://localhost:3001"

# Wait for all background processes
wait 