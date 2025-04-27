#!/bin/bash

# Function to start port forwarding for a service
start_port_forward() {
    local service=$1
    local port=$2
    local target_port=$3
    local namespace="profile-service"
    local resource_type="deployment"

    # Check if the service is a StatefulSet
    if kubectl get statefulset -n $namespace $service &>/dev/null; then
        resource_type="statefulset"
    fi

    echo "Starting port forward for $service on port $port..."
    kubectl port-forward -n $namespace $resource_type/$service $port:$target_port &
}

# Check if ports are already in use
check_port() {
  local port=$1
  if lsof -i :$port > /dev/null 2>&1; then
    echo "Warning: Port $port is already in use. Skipping..."
    return 1
  fi
  return 0
}

# Start port forwarding for all services
start_port_forward client 3000 3000
start_port_forward server 8080 8080
start_port_forward worker 8081 8080
start_port_forward postgres 5432 5432
start_port_forward redis 6379 6379
start_port_forward rabbitmq 5672 5672
start_port_forward rabbitmq 15672 15672
start_port_forward prometheus 9090 9090
start_port_forward grafana 3001 3000

echo "All port forwards started. Press Ctrl+C to stop all."
echo "Access points:"
echo "  Client UI:     http://localhost:3000"
echo "  Server API:    http://localhost:8080"
echo "  PostgreSQL:    postgres://profile:profile123@localhost:5432/profile_service"
echo "  Redis:         redis://localhost:6379"
echo "  RabbitMQ:      amqp://localhost:5672"
echo "  RabbitMQ UI:   http://localhost:15672"
echo "  Prometheus:    http://localhost:9090"
echo "  Grafana:       http://localhost:3001"

# Wait for Ctrl+C
trap "kill 0" EXIT
wait 