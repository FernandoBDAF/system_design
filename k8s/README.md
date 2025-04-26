# Kubernetes Configuration

This directory contains all Kubernetes configurations for the profile service application.

## Directory Structure

- `simple/` - Simplified and streamlined Kubernetes configurations

  - `namespace.yaml` - Namespace configuration
  - `service-account.yaml` - Service account and RBAC configuration
  - `mongodb.yaml` - MongoDB deployment and service
  - `redis.yaml` - Redis deployment and service
  - `rabbitmq.yaml` - RabbitMQ statefulset and service
  - `server.yaml` - Profile service deployment and service
  - `worker.yaml` - Worker deployment
  - `client.yaml` - Client deployment and service with optimized resource limits:
    - Memory: 512Mi limit, 256Mi request
    - CPU: 500m limit, 200m request
    - Liveness probe: 60s initial delay, 15s period, 5s timeout
    - Readiness probe: 30s initial delay, 10s period, 5s timeout
  - `kind-config.yaml` - Kind cluster configuration with port mappings
  - `kustomization.yaml` - Kustomize configuration for managing all resources
  - `metrics-server.yaml` - Core metrics-server deployment and RBAC configuration
  - `metrics-server-apiservice.yaml` - APIService registration for metrics API

- `old-code-just-for-reference/` - Previous implementation for reference
  - Contains valuable insights and configurations from previous iterations
  - Useful for understanding the evolution of the system
  - Not actively used in current deployments

## Security and Access Control

The client component requires access to Kubernetes API for pod monitoring. This is configured through:

1. Service Account:

   - Name: `pod-reader`
   - Mounts Kubernetes API access tokens
   - Used by the client pod

2. RBAC Configuration:
   - Role: `pod-reader`
   - Permissions: get, list, watch pods
   - Bound to the service account

## Port Mappings

The Kind cluster is configured with the following port mappings:

- Client UI: 3000
- Server API: 30080
- Worker API: 30081
- MongoDB: 27017
- Redis: 6379
- RabbitMQ AMQP: 5672
- RabbitMQ Management UI: 15672

## Simplified Architecture

The current implementation focuses on a streamlined architecture with:

1. Core Services:

   - MongoDB for persistent data storage
   - Redis for caching
   - RabbitMQ for message queuing

2. Application Components:

   - Server pod with APIs and endpoints
   - Worker pod for message processing
   - Client pod for frontend and monitoring with optimized resource limits

3. Key Features:
   - Direct service-to-service communication
   - Proper health checks and resource limits
   - Persistent storage where needed
   - Environment variables for configuration
   - Service discovery through Kubernetes DNS
   - RBAC for secure API access
   - Prometheus metrics for monitoring
   - Structured logging with Zap

## Deployment

Use the Makefile in the root directory to manage deployments:

```bash
# Start everything
make start

# Stop everything
make stop

# Restart everything
make restart

# Check status
make status

# View logs
make logs COMPONENT=<component-name>

# Run tests
make test

# Clean up
make clean-all
```

## Development Workflow

1. All new changes should be made in the `simple/` directory
2. Reference the `old-code-just-for-reference/` directory for insights
3. Use kustomize for managing deployments
4. Test changes locally before committing

## Access Points

After deployment, services are accessible at:

- Client UI: http://localhost:3000
- Server API: http://localhost:30080
- Worker API: http://localhost:30081
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379
- RabbitMQ: amqp://localhost:5672
- RabbitMQ UI: http://localhost:15672

## Monitoring and Metrics

The cluster includes metrics-server for real-time resource monitoring capabilities:

### Metrics Server Configuration

Located in `simple/` directory:

- `metrics-server.yaml` - Core metrics-server deployment and RBAC configuration
- `metrics-server-apiservice.yaml` - APIService registration for metrics API

Key components:

1. Metrics Server Deployment:

   - Image: k8s.gcr.io/metrics-server/metrics-server:v0.7.0
   - Insecure TLS for development (--kubelet-insecure-tls)
   - Service account with necessary RBAC permissions
   - Exposed on port 4443 internally

2. API Registration:
   - APIService: v1beta1.metrics.k8s.io
   - Enables metrics API endpoints
   - Allows resource metrics collection

### Available Metrics Commands

Monitor cluster resources in real-time:

```bash
# View node resource usage
kubectl top nodes

# View pod resource usage
kubectl top pods [-n namespace]

# View specific pod metrics
kubectl top pod [pod-name] [-n namespace]
```

These commands provide real-time data about:

- CPU usage (cores and percentage)
- Memory usage (bytes and percentage)
- Per-node and per-pod resource utilization

### Resource Monitoring Integration

The metrics-server enables:

- Horizontal Pod Autoscaling (HPA)
- Resource quota monitoring
- Real-time resource utilization tracking
- Performance optimization insights

## Future Improvements

1. Consider using an Ingress controller for external access
2. Implement proper TLS termination
3. Add network policies for better security
4. Consider using a service mesh for better observability
5. Implement proper secrets management
