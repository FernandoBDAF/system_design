.PHONY: all build deploy undeploy clean help start stop restart status logs test clean-all port-forward create-cluster delete-profile get-profiles test-cache logs-server clean-db test-create-profiles test-update test-monitoring scale-server-down scale-server-up

# Default target
all: help

# Help target
help:
	@echo "Available commands:"
	@echo "  make create-cluster - Create a new Kind cluster"
	@echo "  make build         - Build server and worker components"
	@echo "  make start         - Start the entire stack"
	@echo "  make stop          - Stop the entire stack"
	@echo "  make restart       - Restart the entire stack"
	@echo "  make status        - Check status of all components"
	@echo "  make logs          - View logs for a component (e.g., make logs COMPONENT=server)"
	@echo "  make test          - Run API tests"
	@echo "  make clean         - Clean up Kubernetes resources"
	@echo "  make clean-all     - Clean up all resources (Kubernetes, Docker, and cluster)"
	@echo "  make port-forward  - Start port forwarding for all services"
	@echo "  make delete-profile - Delete a profile by ID"
	@echo "  make get-profiles  - Get all profiles"
	@echo "  make test-cache    - Run cache tests"
	@echo "  make test-update   - Run update tests"
	@echo "  make logs-server   - Show server logs in real-time"
	@echo "  make clean-db      - Clean all profiles from the database"
	@echo "  make test-create-profiles - Create test profiles"
	@echo "  make test-monitoring - Run monitoring and metrics tests"
	@echo "  make scale-server-down - Scale down the server deployment"
	@echo "  make scale-server-up - Scale up the server deployment"
	@echo ""
	@echo "Note: All cluster management operations are centralized in this Makefile"

# Cluster management
create-cluster:
	@echo "Checking if Kind cluster exists..."
	@if ! kind get clusters | grep -q "^profile-service$$"; then \
		echo "Creating Kind cluster..."; \
		kind create cluster --name profile-service; \
		echo "Kind cluster created successfully!"; \
	else \
		echo "Kind cluster 'profile-service' already exists."; \
	fi

delete-cluster:
	@echo "Deleting Kind cluster..."
	@kind delete cluster --name profile-service || true
	@echo "Kind cluster deleted successfully!"

# Cleanup targets
clean:
	@echo "Cleaning up Kubernetes resources..."
	@kubectl delete -k k8s/simple/ --ignore-not-found=true
	@kubectl delete namespace profile-service --ignore-not-found=true
	@echo "Kubernetes resources cleaned up."

clean-all: clean
	@echo "Cleaning up Docker resources..."
	@docker rmi profile-server:latest profile-client:latest || true
	@docker system prune -f
	@echo "Cleaning up Kind cluster..."
	@kind delete cluster --name profile-service || true
	@echo "All resources cleaned up!"

# Build targets
build:
	@echo "Building Docker images..."
	@docker build -t profile-service:latest -f server/Dockerfile server/
	@docker build -t profile-client:latest -f client/Dockerfile client/
	@docker build -t profile-worker:latest -f worker/Dockerfile worker/
	@echo "Loading images into Kind cluster..."
	@kind load docker-image profile-service:latest --name profile-service
	@kind load docker-image profile-client:latest --name profile-service
	@kind load docker-image profile-worker:latest --name profile-service
# Deployment targets
start: create-cluster build
	@echo "Starting the application..."
	@kubectl create namespace profile-service || true
	@kubectl apply -k k8s/simple/
	@echo "Waiting for services to be ready..."
	@kubectl wait --for=condition=ready pod -l app=postgres -n profile-service --timeout=300s
	@kubectl wait --for=condition=ready pod -l app=profile-server -n profile-service --timeout=300s
	@kubectl wait --for=condition=ready pod -l app=profile-client -n profile-service --timeout=300s
	@kubectl wait --for=condition=ready pod -l app=profile-worker -n profile-service --timeout=300s

stop:
	@echo "Stopping the entire stack..."
	@kubectl delete -k k8s/simple/ --ignore-not-found=true

restart: stop start

# Status and logging targets
status:
	@echo "Checking status of all components..."
	@echo "\nPods:"
	@kubectl get pods -n profile-service
	@echo "\nServices:"
	@kubectl get services -n profile-service
	@echo "\nAccess points (after running 'make port-forward'):"
	@echo "  Client UI:     http://localhost:3000"
	@echo "  Server API:    http://localhost:8080"
	@echo "  PostgreSQL:    postgres://profile:profile123@localhost:5432/profile_service"
	@echo "  Redis:         redis://localhost:6379"
	@echo "  RabbitMQ:      amqp://localhost:5672"
	@echo "  RabbitMQ UI:   http://localhost:15672"

logs:
ifndef COMPONENT
	@echo "Please specify a component: make logs COMPONENT=<component-name>"
	@exit 1
endif
	@kubectl logs -f -l app=$(COMPONENT) -n profile-service

logs-server: ## Show server logs in real-time
	@echo "Showing server logs..."
	@kubectl logs -f -l app=profile-server -n profile-service

# Test targets
test:
	@echo "Running API tests..."
	@chmod +x ./test_server.sh
	@./test_server.sh

# Delete profile by ID
delete-profile:
ifndef ID
	@echo "Please specify a profile ID: make delete-profile ID=<profile-id>"
	@exit 1
endif
	@echo "Deleting profile with ID: $(ID)"
	@curl -X DELETE http://localhost:8080/api/v1/profiles/$(ID) \
		-w "\nStatus: %{http_code}\n"

# Get all profiles
get-profiles:
	@echo "Retrieving all profiles..."
	@curl -s http://localhost:8080/api/v1/profiles | jq .

# Port forwarding target
port-forward:
	@echo "Starting port forwarding for all services..."
	@./port-forward.sh

test-cache: ## Run cache tests
	@echo "Running cache tests..."
	@chmod +x test_server_cache.sh
	@./test_server_cache.sh

clean-db: ## Clean all profiles from the database
	@echo "Cleaning profiles table..."
	@kubectl exec -n profile-service -it $(shell kubectl get pod -n profile-service -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U profile -d profile_service -c "TRUNCATE TABLE profiles CASCADE;"

test-create-profiles: ## Create test profiles
	@echo "Creating test profiles..."
	@chmod +x test_server_create-profiles.sh
	@./test_server_create-profiles.sh

test-update: ## Run update tests
	@echo "Running update tests..."
	@chmod +x test_server_update.sh
	@./test_server_update.sh

test-monitoring: ## Run monitoring and metrics tests
	@echo "Running monitoring and metrics tests..."
	@chmod +x test_monitoring.sh
	@./test_monitoring.sh

scale-server-down:
	kubectl scale deployment/profile-server --replicas=2 -n profile-service

scale-server-up:
	kubectl scale deployment/profile-server --replicas=5 -n profile-service 