# Kubernetes Configuration for Profile Service

## Overview

This directory contains Kubernetes configurations for deploying the profile service application. The configurations are organized in a layer-based structure for better isolation and management.

## Namespace Management

The application uses multiple namespaces for different layers:

- `client-layer`: Frontend components
- `server-layer`: Backend services and workers
- `data-layer`: Databases and caches
- `observability-layer`: Monitoring and logging tools

## RBAC Configuration

The application implements Role-Based Access Control (RBAC) across multiple files:

### Current RBAC Files

1. **`rbac.yaml`**

   - Purpose: Cross-namespace communication permissions
   - Contains:
     - Server layer access to observability layer
     - Client layer access to server layer
   - Location: `k8s/rbac.yaml`

2. **`service-account.yaml`**

   - Purpose: Cluster-wide metrics and pod reading permissions
   - Contains:
     - `pod-reader` service accounts
     - Cluster roles for metrics access
     - Cluster role bindings
   - Location: `k8s/service-account.yaml`

3. **`metrics-server.yaml`**

   - Purpose: Metrics server specific permissions
   - Contains:
     - Metrics server service account
     - Cluster roles for metrics aggregation
     - Role bindings for API server authentication
   - Location: `k8s/metrics-server.yaml`

4. **`monitoring.yaml`**
   - Purpose: Prometheus service discovery permissions
   - Contains:
     - Service account configurations
     - RBAC settings for metrics collection
   - Location: `k8s/monitoring.yaml`

### Future Consolidation Plans

The current RBAC configuration is spread across multiple files for historical reasons and ease of maintenance. However, there are opportunities for consolidation:

1. **Service Account Consolidation**

   - Current: Service accounts are defined in multiple files
   - Future: Create a single `service-accounts.yaml` file containing all service accounts
   - Benefits: Easier management, reduced duplication

2. **Role Consolidation**

   - Current: Similar roles (e.g., pod reading) are defined in multiple files
   - Future: Consolidate common roles into a single `roles.yaml` file
   - Benefits: Consistent permissions, easier auditing

3. **Binding Consolidation**

   - Current: Role bindings are scattered across files
   - Future: Group bindings by purpose in `role-bindings.yaml`
   - Benefits: Clearer permission relationships

4. **Namespace-Specific RBAC**
   - Current: Some namespace-specific permissions are mixed with cluster-wide ones
   - Future: Create `namespace-rbac.yaml` for namespace-specific permissions
   - Benefits: Better organization, easier namespace management

### Implementation Notes

- The current separation allows for independent updates to different components
- Future consolidation should maintain backward compatibility
- Consider using Kustomize for managing different RBAC configurations
- Document all RBAC changes in the changelog

## Overview & Purpose

This directory contains all Kubernetes configurations for the profile service application, implementing a robust, secure, and observable microservices architecture. The configurations ensure proper resource management, security, and monitoring across all components, organized in a **layer-based namespace structure** for better isolation and management.

---

## Layer-Based Namespace Model (System Visualization)

**Namespaces (Layers):**

- `client-layer`: Frontend components (e.g., client)
- `server-layer`: Application services (e.g., server, worker, rabbitmq)
- `data-layer`: Databases and caches (e.g., postgresql, redis)
- `observability-layer`: Monitoring and metrics (e.g., prometheus, grafana, metrics-server)

Each component is deployed in its relevant namespace, and network policies/RBAC are set up to control cross-layer communication. This model provides:

- Security and resource isolation
- Organizational clarity
- Easier visualization and troubleshooting

**Future Improvements:**

- **Layer Naming Consistency:** The current layer labels (`frontend`, `application`, `persistence`, `monitoring`) will be updated to be more consistent with the namespace names (`client`, `server`, `data`, `observability`). This change will require updates to:
  - Network policies
  - Component deployments
  - Service configurations
  - Documentation references
  - Testing scripts
    This improvement is planned for a future release to avoid adding complexity during the current testing phase.

**Visualization Model:**

- Each namespace is rendered as a horizontal layer in the system diagram.
- Pods are grouped by deployment within each namespace (using labels like `app` and `deployment`).
- Standalone pods (not part of a deployment) are shown as individual circles in their namespace.
- Pod-to-pod connections are visualized as lines, including cross-namespace connections (future improvements may enhance this logic).
- For clarity, the visualization will limit the number of elements in a horizontal line (e.g., 4 per row) to avoid crowding.
- Short names and CPU% metrics are shown for relevant pods.
- Only pods from these four namespaces are visualized; system/default namespaces are excluded.

**Connection Logic:**

- The current implementation uses a simple, static approach for pod-to-pod connections.
- In the future, connection logic may be dynamically generated from service definitions, network policies, or observed traffic.

**Legend/Key:**

- The visualization may include a legend or key in the future to clarify the meaning of shapes, colors, and line styles, as the model evolves.

---

## Documentation Principles

This component follows the project's documentation principles:

1. **Conceptual Clarity**

   - Clear component descriptions
   - Consistent terminology
   - Logical organization
   - Configuration examples
   - Progressive disclosure

2. **Lessons Learned**

   - Operational insights
   - Best practices
   - Common pitfalls
   - Security considerations
   - Performance guidelines

3. **Configuration & Guardrails**

   - Resource limits
   - Security settings
   - Health checks
   - Deployment patterns
   - Monitoring setup

4. **Troubleshooting Tips**

   - Common issues
   - Recovery steps
   - Diagnostic commands
   - Log analysis
   - Performance debugging

5. **Consistency**
   - Uniform formatting
   - Standard terminology
   - Clear structure
   - Regular updates
   - Cross-references

For detailed documentation principles and guidelines, see [Documentation Principles](../docs/principles.md).

## Implementation Methodology

This section outlines a systematic approach to implementing and verifying Kubernetes configurations, which can be applied to similar projects:

### 1. Analysis Phase

- **Component Identification**

  - List all required services and their dependencies
  - Map communication patterns between components
  - Identify resource requirements and constraints
  - Document security requirements
  - **NEW: Image Size Analysis**
    - Review Dockerfile optimization opportunities
    - Plan multi-stage builds
    - Consider base image selection
    - Document build time and size targets

- **Namespace Planning**
  - Group components by function and security requirements
  - Define cross-namespace communication needs
  - Plan resource quotas and limits
  - Document namespace-specific configurations
  - **NEW: Layer Labeling Strategy**
    - Define consistent label schema
    - Plan for observability integration
    - Document label usage patterns
    - Consider future scaling needs

### 2. Configuration Phase

- **Manifest Organization**

  - Separate configurations by component and namespace
  - Use consistent naming conventions
  - Implement proper labels and annotations
  - Document all configuration decisions
  - **NEW: Deployment Script Design**
    - Create ordered deployment process
    - Implement error handling
    - Add validation steps
    - Include rollback procedures

- **Security Implementation**
  - Define RBAC roles and permissions
  - Implement network policies
  - Configure service accounts
  - Set up secrets and config maps
  - **NEW: Cross-Namespace Security**
    - Document communication paths
    - Implement least privilege
    - Validate network policies
    - Test access controls

### 3. Verification Phase

- **Component Verification**

  - Test build processes
  - Verify image sizes and build times
  - Check resource configurations
  - Validate health check settings
  - **NEW: Automated Validation**
    - Create validation scripts
    - Implement health checks
    - Test resource limits
    - Verify security settings

- **Integration Testing**
  - Test cross-namespace communication
  - Verify service discovery
  - Check load balancing
  - Validate failover scenarios
  - **NEW: Layer Dependencies**
    - Document deployment order
    - Test layer isolation
    - Verify cross-layer access
    - Validate monitoring integration

### 4. Deployment Phase

- **Deployment Strategy**

  - Create ordered deployment scripts
  - Implement health checks
  - Set up monitoring
  - Document rollback procedures
  - **NEW: Progressive Deployment**
    - Implement phased rollout
    - Add validation gates
    - Monitor resource usage
    - Track deployment metrics

- **Verification Steps**
  - Check pod status and readiness
  - Verify service endpoints
  - Test application functionality
  - Monitor resource usage
  - **NEW: Layer Health Checks**
    - Verify layer isolation
    - Test cross-layer communication
    - Validate monitoring setup
    - Check security controls

### 5. Monitoring & Maintenance

- **Observability Setup**

  - Configure metrics collection
  - Set up logging
  - Implement alerting
  - Create dashboards
  - **NEW: Layer-Specific Monitoring**
    - Define layer metrics
    - Set up cross-layer alerts
    - Monitor resource usage
    - Track communication patterns

- **Maintenance Procedures**
  - Document update procedures
  - Create backup strategies
  - Plan scaling procedures
  - Document troubleshooting steps
  - **NEW: Layer Maintenance**
    - Document layer-specific procedures
    - Plan for layer updates
    - Test layer isolation
    - Validate backup procedures

### 6. Documentation

- **Technical Documentation**

  - Document architecture decisions
  - Create configuration guides
  - Write troubleshooting guides
  - Maintain change logs
  - **NEW: Layer Documentation**
    - Document layer interactions
    - Create layer-specific guides
    - Maintain layer diagrams
    - Update security documentation

- **Operational Documentation**
  - Create runbooks
  - Document monitoring procedures
  - Write incident response guides
  - Maintain knowledge base
  - **NEW: Layer Operations**
    - Document layer operations
    - Create layer-specific runbooks
    - Update incident procedures
    - Maintain layer metrics

This methodology ensures:

- Systematic approach to implementation
- Clear documentation of decisions
- Proper testing and verification
- Maintainable configurations
- Scalable architecture
- **NEW: Layer-Based Management**
  - Clear layer boundaries
  - Defined layer interactions
  - Documented layer operations
  - Maintained layer security

## Related Documentation

For more detailed information about specific aspects of the Kubernetes configuration, see:

- [API Documentation](../docs/api.md) - API endpoints and service exposure
- [Caching Implementation](../docs/caching.md) - Cache configuration and optimization
- [Monitoring Setup](../docs/monitoring.md) - Monitoring and metrics configuration
- [Testing Procedures](../docs/testing.md) - Testing and validation procedures

## Architecture & Main Flows

### Core Components & Their Roles

1. **Namespace Management**

   - **Purpose:** Logical isolation and access control
   - **Implementation:** Layer-based namespaces
     - `client-layer`: Frontend components
     - `server-layer`: Application services
     - `data-layer`: Data storage
     - `observability-layer`: Monitoring and logging
   - **Configuration:** `namespace.yaml`
   - **Key Benefits:**
     - Resource isolation
     - Access control
     - Organizational clarity
     - Cross-layer communication control

2. **Application Components**

   - **Client Layer**
     - Purpose: Web interface with optimized limits
     - Configuration: `client.yaml`
     - Features: Resource limits, monitoring, WebSocket support
     - Namespace: `client-layer`
   - **Server Layer**
     - Purpose: API service with 5 replicas
     - Configuration: `server.yaml`
     - Features: Health checks, metrics, scaling, WebSocket support
     - Namespace: `server-layer`
   - **Worker Layer**
     - Purpose: Background task processing
     - Configuration: `worker.yaml`
     - Features: Queue integration, scaling
     - Namespace: `server-layer`

3. **Data & Message Services**
   - **PostgreSQL:** Primary database (`postgresql.yaml`, `data-layer`)
   - **Redis:** Caching layer (`redis.yaml`, `data-layer`)
   - **RabbitMQ:** Message broker (`rabbitmq.yaml`, `server-layer`)

### Component Interactions

1. **Service Communication**

   ```
   Client Layer → Server Layer → Data Layer
   ```

2. **Metrics Flow**

   ```
   All Layers → Observability Layer → Prometheus → Grafana
   ```

3. **Data Access**
   ```
   Server Layer → Data Layer (PostgreSQL/Redis)
   ```

## Configuration & Guardrails

### Critical Configuration Requirements

1. **Namespace & RBAC**

   - Components must run in their respective layer namespaces
   - Required service accounts:
     - `pod-reader` for metrics access
     - `default` for basic operations
   - Cross-namespace permissions for:
     - Client to Server communication
     - Server to Data communication
     - All components to Observability

2. **Resource Management**

   - Memory limits: 256Mi/512Mi (request/limit)
   - CPU limits: 200m/500m (request/limit)
   - Health check timeouts: 5s
   - Probe intervals: 10s

3. **Service Configuration**
   - Metrics-server port: 443 (name: `https`)
   - API endpoints:
     - Client: 3000
     - Server: 8080
     - Worker: 8081
   - Database ports:
     - PostgreSQL: 5432
     - Redis: 6379
     - RabbitMQ: 5672/15672

### Guardrails: What Must Not Change

1. **Security Settings**

   - Do not remove service account token mounts
   - Do not weaken RBAC permissions
   - Do not change metrics-server port name from `https`
   - Do not modify network policies without review

2. **Resource Limits**

   - Do not remove resource requests/limits
   - Do not disable health checks
   - Do not increase probe timeouts beyond 5s
   - Do not modify namespace structure without review

3. **Deployment Patterns**
   - Always use `apply-layers.sh` for deployments
   - Always re-apply manifests after changes
   - Always restart pods after configuration updates
   - Follow layer-based deployment order

## Monitoring & Metrics Implementation

### Metrics Server Configuration

1. **Core Components**

   - Deployment: `metrics-server.yaml`
   - APIService: `metrics-server-apiservice.yaml`
   - Service Account: `service-account.yaml`

2. **Required Settings**
   - Port: 443 (name: `https`)
   - RBAC: Cluster-wide permissions
   - Token Mount: `/var/run/secrets/kubernetes.io/serviceaccount/token`

### Prometheus Integration

1. **Configuration**

   - File: `monitoring.yaml`
   - Namespace: `observability-layer`
   - Scrape interval: 15s
   - Targets: All application components across all layers

2. **Metrics Collection**
   - Resource usage per layer
   - Application metrics
   - Custom metrics
   - Alert rules
   - Kubernetes service discovery

## Lessons Learned

### Operational Insights

1. **Metrics & Observability**

   - RBAC is critical for metrics functionality
   - Port naming must be consistent
   - Service account tokens must be properly mounted

2. **Deployment & Configuration**

   - Manifest changes require pod restarts
   - Resource limits prevent OOM issues
   - Health checks catch deployment issues early

3. **Security Best Practices**
   - Use dedicated service accounts
   - Implement least privilege
   - Document all RBAC changes

## Troubleshooting Guide

### Common Issues & Solutions

1. **Metrics Not Loading**

   - Check RBAC configuration
   - Verify metrics-server service
   - Check pod-reader service account
   - Command: `kubectl top pods`

2. **Service Unavailable**

   - Check pod status: `kubectl get pods`
   - View logs: `kubectl logs <pod-name>`
   - Check endpoints: `kubectl get endpoints`
   - Restart if needed: `make restart`
   - **NEW: Verify namespace labels match network policies**
     - Check labels: `kubectl get namespace --show-labels`
     - Ensure `layer: application` for server components
     - Verify `layer: persistence` for data components

3. **Performance Issues**
   - Check resource usage: `kubectl top pods`
   - Verify cache hit rates
   - Check queue lengths
   - Monitor database connections
   - **NEW: Verify cross-namespace communication**
     - Test connectivity between layers
     - Check network policy enforcement
     - Verify service discovery

### Quick Recovery Steps

1. **Basic Checks**

   ```bash
   make status          # Check component status
   make logs            # View component logs
   kubectl top pods     # Check resource usage
   kubectl get namespace --show-labels  # Verify namespace labels
   ```

2. **Common Fixes**
   ```bash
   make restart         # Restart all components
   make clean-all       # Clean and start fresh
   make start          # Rebuild and deploy
   # NEW: Verify namespace labels
   kubectl label namespace server-layer layer=application --overwrite
   kubectl label namespace data-layer layer=persistence --overwrite
   ```

### Deployment Verification

1. **Layer Health Checks**

   ```bash
   # Verify namespace labels
   kubectl get namespace --show-labels

   # Check pod status by layer
   kubectl get pods -n client-layer
   kubectl get pods -n server-layer
   kubectl get pods -n data-layer
   kubectl get pods -n observability-layer

   # Verify cross-layer communication
   kubectl exec -n server-layer <server-pod> -- curl -v postgres.data-layer.svc.cluster.local:5432
   kubectl exec -n server-layer <server-pod> -- curl -v redis.data-layer.svc.cluster.local:6379
   ```

2. **Network Policy Verification**

   ```bash
   # Check network policies
   kubectl get networkpolicies --all-namespaces

   # Verify policy enforcement
   kubectl describe networkpolicy <policy-name> -n <namespace>
   ```

## Development & Usage

### Prerequisites

- Docker
- Kubernetes (Kind)
- kubectl
- make

### Deployment Process

### Initial Setup

1. Make deployment scripts executable:

   ```bash
   chmod +x k8s/*.sh
   ```

2. Create namespaces and network policies:

   ```bash
   kubectl apply -f k8s/namespaces.yaml
   kubectl apply -f k8s/network-policies.yaml
   ```

3. Apply RBAC configuration:

   ```bash
   kubectl apply -f k8s/rbac.yaml
   ```

4. Create required secrets:

   ```bash
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
   ```

5. Create Prometheus config:

   ```bash
   kubectl create configmap prometheus-config \
     --from-file=k8s/prometheus.yml \
     --namespace=observability-layer \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

6. **Deployment Order**

   The `apply-layers.sh` script follows a specific order to ensure proper dependency management:

   ```bash
   # 1. Create namespaces and network policies
   kubectl apply -f namespace.yaml
   kubectl apply -f network-policies.yaml

   # 2. Create required secrets
   kubectl create secret generic postgres-secret --from-literal=password=postgres --namespace=data-layer
   kubectl create secret generic redis-secret --from-literal=password=redis --namespace=data-layer
   kubectl create secret generic grafana-secret --from-literal=password=admin --namespace=observability-layer

   # 3. Create Prometheus config
   kubectl create configmap prometheus-config --from-file=monitoring.yaml --namespace=observability-layer

   # 4. Deploy components in order
   ./k8s/apply-layers.sh
   ```

7. **Verification**

   ```bash
   # Check all pods are running
   kubectl get pods -n client-layer
   kubectl get pods -n server-layer
   kubectl get pods -n data-layer
   kubectl get pods -n observability-layer

   # Check services
   kubectl get svc -n client-layer
   kubectl get svc -n server-layer
   kubectl get svc -n data-layer
   kubectl get svc -n observability-layer
   ```

8. **Access Points**

   ```bash
   # Port forward services for local access
   kubectl port-forward svc/client -n client-layer 3000:3000
   kubectl port-forward svc/server -n server-layer 8080:8080
   kubectl port-forward svc/rabbitmq -n server-layer 5672:5672 15672:15672
   kubectl port-forward svc/postgres -n data-layer 5432:5432
   kubectl port-forward svc/redis -n data-layer 6379:6379
   kubectl port-forward svc/prometheus -n observability-layer 9090:9090
   kubectl port-forward svc/grafana -n observability-layer 3000:3000
   ```

### Common Deployment Issues & Solutions

1. **Dependency Management**

   - **Secret Dependencies**

     - PostgreSQL requires `postgres-secret` in `data-layer`
     - Redis requires `redis-secret` in `data-layer`
     - Grafana requires `grafana-secret` in `observability-layer`
     - Always create secrets before deploying dependent components
     - Use `kubectl get secrets -n <namespace>` to verify

   - **ConfigMap Dependencies**
     - Prometheus requires `prometheus-config` in `observability-layer`
     - Server requires `server-config` in `server-layer`
     - Verify with `kubectl get configmaps -n <namespace>`

2. **Deployment Order**

   The correct deployment sequence is critical:

   ```bash
   # 1. Namespaces and network policies
   kubectl apply -f namespace.yaml
   kubectl apply -f network-policies.yaml

   # 2. Secrets and ConfigMaps
   kubectl create secret generic postgres-secret --from-literal=password=postgres --namespace=data-layer
   kubectl create secret generic redis-secret --from-literal=password=redis --namespace=data-layer
   kubectl create secret generic grafana-secret --from-literal=password=admin --namespace=observability-layer
   kubectl create configmap prometheus-config --from-file=monitoring.yaml --namespace=observability-layer

   # 3. Data Layer (must be first)
   kubectl apply -f postgresql.yaml -n data-layer
   kubectl apply -f redis.yaml -n data-layer

   # 4. Server Layer (depends on data layer)
   kubectl apply -f rabbitmq.yaml -n server-layer
   kubectl apply -f server.yaml -n server-layer
   kubectl apply -f worker.yaml -n server-layer

   # 5. Client Layer (depends on server layer)
   kubectl apply -f client.yaml -n client-layer

   # 6. Observability Layer (can be deployed in parallel)
   kubectl apply -f monitoring.yaml -n observability-layer
   ```

3. **Verification Steps**

   After each layer deployment:

   ```bash
   # Check pod status
   kubectl get pods -n <namespace> -w

   # Check for errors
   kubectl describe pod <pod-name> -n <namespace>

   # Verify secrets and configmaps
   kubectl get secrets,configmaps -n <namespace>

   # Check service endpoints
   kubectl get endpoints -n <namespace>
   ```

### Development Workflow

1. **Local Development**

   ```bash
   make build          # Build all components
   ./k8s/apply-layers.sh  # Deploy the stack
   make test          # Run tests
   ```

2. **Monitoring & Debugging**

   ```bash
   # View logs by layer
   kubectl logs -n client-layer -l app=client
   kubectl logs -n server-layer -l app=server
   kubectl logs -n server-layer -l app=worker
   kubectl logs -n data-layer -l app=postgres
   kubectl logs -n data-layer -l app=redis
   kubectl logs -n server-layer -l app=rabbitmq
   kubectl logs -n observability-layer -l app=prometheus
   kubectl logs -n observability-layer -l app=grafana

   # Check resource usage
   kubectl top pods -n client-layer
   kubectl top pods -n server-layer
   kubectl top pods -n data-layer
   kubectl top pods -n observability-layer
   ```

## Testing Scripts

The following test scripts are provided to ensure proper deployment and configuration:

### 1. Validation Script (`validate-setup.sh`)

- **Purpose:** Validates the initial setup requirements
- **Checks:**
  - Required commands (kubectl, docker)
  - Kubernetes cluster status
  - Namespace existence
  - Required Docker images
  - File permissions
- **Usage:** `make test-validate`

### 2. Deployment Test Script (`test-deployment.sh`)

- **Purpose:** Comprehensive testing of the deployment process
- **Steps:**
  1. Setup validation
  2. Namespace creation testing
  3. Network policy verification
  4. Layer-by-layer component deployment
  5. Cross-layer communication testing
  6. Observability setup verification
  7. Resource allocation checks
  8. Final status verification
- **Usage:** `make test-deployment`

### 3. Deployment Verification Script (`verify-deployment.sh`)

- **Purpose:** Verifies the state of deployed components
- **Checks:**
  - Pod status and readiness
  - Service endpoints
  - Cross-namespace communication
  - Resource usage
  - Monitoring setup
- **Usage:** `make test-verify`

### Test Execution Order

For a complete testing cycle, execute the scripts in this order:

```bash
make test-validate     # Check prerequisites
make test-deployment  # Deploy and test components
make test-verify      # Verify deployment state
```

## Directory Structure

```
k8s/
├── namespace.yaml           # Layer-based namespace definitions
├── network-policies.yaml    # Cross-layer communication rules
├── postgresql.yaml         # PostgreSQL configuration
├── redis.yaml              # Redis configuration
├── rabbitmq.yaml           # RabbitMQ configuration
├── server.yaml             # Server deployment
├── worker.yaml             # Worker deployment
├── client.yaml             # Client deployment
├── monitoring.yaml         # Observability components
├── apply-layers.sh         # Deployment script
└── README.md               # This documentation
```

---

This README follows the project's documentation principles: conceptual clarity, lessons learned, configuration/code guardrails, troubleshooting tips, and consistency. For more details, see the root README.md and component-specific documentation.

## Command Management

The project uses a centralized Makefile for managing all infrastructure operations. This approach provides:

1. **Consistent Interface**

   - Single entry point for all operations
   - Standardized command structure
   - Easy-to-remember commands

2. **Layer-Based Commands**

   - Commands organized by infrastructure layer
   - Consistent naming across layers
   - Easy layer-specific operations

3. **Common Operations**
   - Cluster management
   - Build and deployment
   - Status checking
   - Log viewing
   - Testing
   - Cleanup

### Available Commands

```bash
# Cluster Management
make create-cluster    # Create a new Kind cluster
make delete-cluster   # Delete the Kind cluster

# Build and Deployment
make build           # Build all components
make start          # Start the entire stack
make stop           # Stop the entire stack
make restart        # Restart the entire stack

# Status and Monitoring
make status         # Check status of all components
make status-client  # Check client layer status
make status-server  # Check server layer status
make status-data    # Check data layer status
make status-observability  # Check observability layer status

# Logging
make logs           # View component logs
make logs-layer     # View layer-specific logs
make logs-server    # View server logs
make logs-prometheus # View Prometheus logs
make logs-grafana   # View Grafana logs

# Testing
make test           # Run API tests
make test-deployment # Run comprehensive deployment test
make test-validate  # Validate initial setup
make test-verify    # Verify deployment state
make test-cross-layer # Test cross-layer communication
make test-observability # Test observability setup

# Cleanup
make clean          # Clean up Kubernetes resources
make clean-all      # Clean up all resources
```

### Usage Examples

1. **Starting the Stack**

   ```bash
   make create-cluster  # Create the cluster
   make build          # Build components
   make start          # Deploy the stack
   make port-forward   # Access services locally
   ```

2. **Monitoring and Debugging**

   ```bash
   make status         # Check overall status
   make logs-layer LAYER=server  # View server layer logs
   make get-pod-metrics # Check resource usage
   ```

3. **Testing**

   ```bash
   make test-validate  # Validate setup
   make test-deployment # Test deployment
   make test-verify    # Verify deployment
   ```

4. **Cleanup**
   ```bash
   make stop          # Stop the stack
   make clean         # Clean resources
   make delete-cluster # Remove cluster
   ```

## Shell Scripts

The Kubernetes configuration includes several shell scripts to automate deployment, testing, and validation processes:

### Deployment Scripts

1. **apply-layers.sh**

   - Purpose: Main deployment script for the layer-based architecture
   - Functionality:
     - Applies namespaces and network policies
     - Creates required secrets and configmaps
     - Deploys components layer by layer (data, server, client, observability)
     - Waits for pods to be ready in each layer
   - Usage: `make start` or `./k8s/apply-layers.sh`

2. **test-deployment.sh**

   - Purpose: Comprehensive deployment testing and verification
   - Functionality:
     - Validates initial setup and prerequisites
     - Tests namespace creation and configuration
     - Creates required secrets and configmaps
     - Deploys and verifies each layer
     - Tests cross-layer communication
     - Verifies resource allocation and observability setup
   - Usage: `make test-deployment` or `./k8s/test-deployment.sh`

3. **validate-setup.sh**
   - Purpose: Validates prerequisites and initial setup requirements
   - Functionality:
     - Checks required commands (kubectl, docker, make)
     - Verifies Kubernetes cluster status
     - Checks for existing namespaces
     - Validates Docker images
     - Ensures proper file permissions
   - Usage: `make test-validate` or `./k8s/validate-setup.sh`

### Script Integration with Makefile

The shell scripts are integrated into the Makefile through the following targets:

```makefile
# Main deployment targets
start: create-cluster build
    @chmod +x k8s/apply-layers.sh
    @./k8s/apply-layers.sh

# Testing targets
test-deployment: build
    @chmod +x k8s/test-deployment.sh
    @./k8s/test-deployment.sh

test-validate:
    @chmod +x k8s/validate-setup.sh
    @./k8s/validate-setup.sh
```

### Script Execution Flow

1. **Initial Setup**:

   - Run `make test-validate` to verify prerequisites
   - This ensures all required tools and configurations are in place

2. **Deployment**:

   - Run `make start` to deploy the entire stack
   - This uses `apply-layers.sh` to deploy components in the correct order

3. **Testing**:
   - Run `make test-deployment` for comprehensive testing
   - This verifies the deployment, cross-layer communication, and resource allocation

### Best Practices

1. **Execution Order**:

   - Always run `test-validate` before deployment
   - Use `test-deployment` after deployment to verify the setup
   - Run `start` for normal deployment operations

2. **Error Handling**:

   - All scripts use `set -e` to exit on any error
   - Color-coded output for better visibility
   - Detailed error messages for troubleshooting

3. **Resource Management**:

   - Scripts include timeouts for pod readiness checks
   - Resource usage verification is included in testing
   - Proper cleanup of temporary resources (e.g., port forwarding)

4. **Security**:
   - Secrets are created with proper namespaces
   - Network policies are verified during testing
   - Service accounts are validated before deployment
