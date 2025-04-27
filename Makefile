.PHONY: all build deploy undeploy clean help start stop restart status logs test clean-all port-forward create-cluster delete-profile get-profiles test-cache logs-server clean-db test-create-profiles test-update test-monitoring scale-server-down scale-server-up get-pod-metrics test-metrics-api logs-prometheus logs-grafana inspect-cluster

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
	@echo "  make logs          - View logs for a component (e.g., make logs COMPONENT=server NAMESPACE=server-layer)"
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
	@echo "  make get-pod-metrics - Get metrics for all pods in the namespace"
	@echo "  make test-metrics-api - Test metrics API endpoints"
	@echo "  make logs-prometheus - Show Prometheus logs"
	@echo "  make logs-grafana   - Show Grafana logs"
	@echo "  make test-deployment - Run comprehensive deployment test (creates namespaces, deploys components, tests communication)"
	@echo "  make test-validate  - Validate initial setup requirements"
	@echo "  make test-verify    - Verify deployment state"
	@echo "  make inspect-cluster - Inspect pods, deployments, and metrics in all main namespaces (runs scripts/inspect-cluster.sh)"
	@echo ""
	@echo "Layer-specific commands:"
	@echo "  make status-client  - Check status of client layer"
	@echo "  make status-server  - Check status of server layer"
	@echo "  make status-data    - Check status of data layer"
	@echo "  make status-observability - Check status of observability layer"
	@echo "  make logs-layer     - View logs for a specific layer (e.g., make logs-layer LAYER=server)"
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
	@kubectl delete -f k8s/namespaces.yaml --ignore-not-found=true
	@kubectl delete -f k8s/network-policies.yaml --ignore-not-found=true
	@kubectl delete -f k8s/postgresql.yaml --ignore-not-found=true
	@kubectl delete -f k8s/redis.yaml --ignore-not-found=true
	@kubectl delete -f k8s/rabbitmq.yaml --ignore-not-found=true
	@kubectl delete -f k8s/server.yaml --ignore-not-found=true
	@kubectl delete -f k8s/worker.yaml --ignore-not-found=true
	@kubectl delete -f k8s/client.yaml --ignore-not-found=true
	@kubectl delete -f k8s/monitoring.yaml --ignore-not-found=true
	@echo "Kubernetes resources cleaned up."

clean-all: clean
	@echo "Cleaning up Docker resources..."
	@docker rmi server:latest client:latest worker:latest || true
	@docker system prune -f
	@echo "Cleaning up Kind cluster..."
	@kind delete cluster --name profile-service || true
	@echo "All resources cleaned up!"

# Build targets
build:
	@echo "Building Docker images..."
	@docker build -t server:latest -f server/Dockerfile server/
	@docker build -t client:latest -f client/Dockerfile client/
	@docker build -t worker:latest -f worker/Dockerfile worker/
	@echo "Loading images into Kind cluster..."
	@kind load docker-image server:latest --name profile-service
	@kind load docker-image client:latest --name profile-service
	@kind load docker-image worker:latest --name profile-service

# Deployment targets
start: create-cluster build
	@echo "Starting the application..."
	@chmod +x k8s/apply-layers.sh
	@./k8s/apply-layers.sh
	@echo "Application started successfully!"

stop:
	@echo "Stopping the entire stack..."
	@kubectl delete -f k8s/namespaces.yaml --ignore-not-found=true
	@kubectl delete -f k8s/network-policies.yaml --ignore-not-found=true
	@kubectl delete -f k8s/postgresql.yaml --ignore-not-found=true
	@kubectl delete -f k8s/redis.yaml --ignore-not-found=true
	@kubectl delete -f k8s/rabbitmq.yaml --ignore-not-found=true
	@kubectl delete -f k8s/server.yaml --ignore-not-found=true
	@kubectl delete -f k8s/worker.yaml --ignore-not-found=true
	@kubectl delete -f k8s/client.yaml --ignore-not-found=true
	@kubectl delete -f k8s/monitoring.yaml --ignore-not-found=true

restart: stop start

# Status and logging targets
status:
	@echo "Checking status of all components..."
	@echo "\nClient Layer:"
	@kubectl get pods,svc -n client-layer
	@echo "\nServer Layer:"
	@kubectl get pods,svc -n server-layer
	@echo "\nData Layer:"
	@kubectl get pods,svc -n data-layer
	@echo "\nObservability Layer:"
	@kubectl get pods,svc -n observability-layer
	@echo "\nAccess points (after running 'make port-forward'):"
	@echo "  Client UI:     http://localhost:3000"
	@echo "  Server API:    http://localhost:8080"
	@echo "  PostgreSQL:    postgres://localhost:5432"
	@echo "  Redis:         redis://localhost:6379"
	@echo "  RabbitMQ:      amqp://localhost:5672"
	@echo "  RabbitMQ UI:   http://localhost:15672"
	@echo "  Prometheus:    http://localhost:9090"
	@echo "  Grafana:       http://localhost:3000"

# Layer-specific status commands
status-client:
	@echo "Client Layer Status:"
	@kubectl get pods,svc -n client-layer

status-server:
	@echo "Server Layer Status:"
	@kubectl get pods,svc -n server-layer

status-data:
	@echo "Data Layer Status:"
	@kubectl get pods,svc -n data-layer

status-observability:
	@echo "Observability Layer Status:"
	@kubectl get pods,svc -n observability-layer

logs:
ifndef COMPONENT
	@echo "Please specify a component: make logs COMPONENT=<component-name> NAMESPACE=<namespace>"
	@exit 1
endif
ifndef NAMESPACE
	@echo "Please specify a namespace: make logs COMPONENT=<component-name> NAMESPACE=<namespace>"
	@exit 1
endif
	@kubectl logs -f -l app=$(COMPONENT) -n $(NAMESPACE)

logs-layer:
ifndef LAYER
	@echo "Please specify a layer: make logs-layer LAYER=<layer-name>"
	@exit 1
endif
	@kubectl logs -f -n $(LAYER)-layer --all-containers=true

logs-server:
	@echo "Showing server logs..."
	@kubectl logs -f -l app=server -n server-layer

# Test targets
test:
	@echo "Running API tests..."
	@chmod +x ./test_server.sh
	@./test_server.sh

# New testing targets
test-deployment: build
	@echo "Running comprehensive deployment test..."
	@echo "Loading images into Kind cluster..."
	@kind load docker-image server:latest --name profile-service
	@kind load docker-image client:latest --name profile-service
	@kind load docker-image worker:latest --name profile-service
	@chmod +x k8s/test-deployment.sh
	@./k8s/test-deployment.sh

test-validate:
	@echo "Running setup validation..."
	@chmod +x k8s/validate-setup.sh
	@./k8s/validate-setup.sh

test-verify:
	@echo "Running deployment verification..."
	@chmod +x k8s/verify-deployment.sh
	@./k8s/verify-deployment.sh

test-cross-layer:
	@echo "Testing cross-layer communication..."
	@echo "Testing client to server communication..."
	@kubectl exec -n client-layer $(shell kubectl get pod -n client-layer -l app=client -o jsonpath='{.items[0].metadata.name}') -- curl -s http://server.server-layer:8080/health
	@echo "Testing server to data communication..."
	@kubectl exec -n server-layer $(shell kubectl get pod -n server-layer -l app=server -o jsonpath='{.items[0].metadata.name}') -- curl -s http://postgres.data-layer:5432

test-observability:
	@echo "Testing observability setup..."
	@echo "Prometheus targets:"
	@kubectl port-forward -n observability-layer svc/prometheus 9090:9090 &
	@sleep 5
	@curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].labels'
	@kill %1

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
	@kubectl port-forward svc/client -n client-layer 3000:3000 &
	@kubectl port-forward svc/server -n server-layer 8080:8080 &
	@kubectl port-forward svc/rabbitmq -n server-layer 5672:5672 15672:15672 &
	@kubectl port-forward svc/postgres -n data-layer 5432:5432 &
	@kubectl port-forward svc/redis -n data-layer 6379:6379 &
	@kubectl port-forward svc/prometheus -n observability-layer 9090:9090 &
	@kubectl port-forward svc/grafana -n observability-layer 3000:3000 &

test-cache:
	@echo "Running cache tests..."
	@chmod +x test_server_cache.sh
	@./test_server_cache.sh

clean-db:
	@echo "Cleaning profiles table..."
	@kubectl exec -n data-layer -it $(shell kubectl get pod -n data-layer -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U profile -d profile_service -c "TRUNCATE TABLE profiles CASCADE;"

test-create-profiles:
	@echo "Creating test profiles..."
	@chmod +x test_server_create-profiles.sh
	@./test_server_create-profiles.sh

test-update:
	@echo "Running update tests..."
	@chmod +x test_server_update.sh
	@./test_server_update.sh

test-monitoring:
	@echo "Running monitoring and metrics tests..."
	@chmod +x test_monitoring.sh
	@./test_monitoring.sh

scale-server-down:
	kubectl scale deployment/server --replicas=2 -n server-layer

scale-server-up:
	kubectl scale deployment/server --replicas=5 -n server-layer

# Get pod metrics
get-pod-metrics:
	@echo "Getting pod metrics..."
	@echo "\nNode Metrics:"
	@kubectl top nodes
	@echo "\nClient Layer Metrics:"
	@kubectl top pods -n client-layer
	@echo "\nServer Layer Metrics:"
	@kubectl top pods -n server-layer
	@echo "\nData Layer Metrics:"
	@kubectl top pods -n data-layer
	@echo "\nObservability Layer Metrics:"
	@kubectl top pods -n observability-layer

# Test metrics API
test-metrics-api:
	@echo "Testing metrics API endpoints..."
	@chmod +x test_metrics_api.sh
	@./test_metrics_api.sh

# Logging targets
logs-prometheus:
	@echo "Showing Prometheus logs..."
	@kubectl logs -f -l app=prometheus -n observability-layer

logs-grafana:
	@echo "Showing Grafana logs..."
	@kubectl logs -f -l app=grafana -n observability-layer 

inspect-cluster:
	@echo "Inspecting cluster state (pods, deployments, metrics) in all main namespaces..."
	bash client/scripts/inspect-cluster.sh 