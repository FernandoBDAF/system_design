#!/bin/bash

# Function to start port forwarding in background
start_port_forward() {
  local service=$1
  local port=$2
  local target_port=$3
  echo "Forwarding $service on port $port..."
  kubectl port-forward -n profile-service svc/$service $port:$target_port &
  sleep 2  # Give time for the port forward to start
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

# Start port forwarding for each service
if check_port 3000; then
  start_port_forward profile-client 3000 3000
fi

if check_port 8080; then
  start_port_forward profile-server 8080 8080
fi

if check_port 5432; then
  start_port_forward postgres 5432 5432
fi

if check_port 6379; then
  start_port_forward redis 6379 6379
fi

if check_port 5672; then
  start_port_forward rabbitmq 5672 5672
fi

if check_port 15672; then
  start_port_forward rabbitmq 15672 15672
fi

echo "Port forwarding started. Press Ctrl+C to stop all forwards."
echo "Access points:"
echo "  Client UI:     http://localhost:3000"
echo "  Server API:    http://localhost:8080"
echo "  PostgreSQL:    postgres://profile:profile123@localhost:5432/profile_service"
echo "  Redis:         redis://localhost:6379"
echo "  RabbitMQ:      amqp://localhost:5672"
echo "  RabbitMQ UI:   http://localhost:15672"

# Wait for Ctrl+C
trap "kill 0" EXIT
wait 