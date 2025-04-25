# Kubernetes Configuration

This directory contains all Kubernetes configurations for the profile service application.

## Directory Structure

- `simple/` - Simplified and streamlined Kubernetes configurations

  - `namespace.yaml` - Namespace configuration
  - `mongodb.yaml` - MongoDB deployment and service
  - `redis.yaml` - Redis deployment and service
  - `rabbitmq.yaml` - RabbitMQ statefulset and service
  - `server.yaml` - Profile service deployment and service
  - `worker.yaml` - Worker deployment
  - `client.yaml` - Client deployment and service
  - `kind-config.yaml` - Kind cluster configuration with port mappings
  - `kustomization.yaml` - Kustomize configuration for managing all resources

- `old-code-just-for-reference/` - Previous implementation for reference
  - Contains valuable insights and configurations from previous iterations
  - Useful for understanding the evolution of the system
  - Not actively used in current deployments

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
   - Client pod for frontend

3. Key Features:
   - Direct service-to-service communication
   - Proper health checks and resource limits
   - Persistent storage where needed
   - Environment variables for configuration
   - Service discovery through Kubernetes DNS
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
