# Profile Service

A scalable profile management service built with Go, demonstrating various system design principles and best practices for building production-ready web services.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Infrastructure](#infrastructure)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Development](#development)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

## Features

- **Core Features**

  - RESTful API for profile management (CRUD operations)
  - Image upload and CDN integration
  - Health checks and metrics endpoints
  - Graceful shutdown support
  - Asynchronous task processing
  - Caching layer for performance optimization

- **Infrastructure**

  - MongoDB for data persistence with replication
  - Redis for caching frequently accessed data
  - RabbitMQ for message queueing
  - Nginx load balancer for traffic distribution
  - Kubernetes for container orchestration
  - Prometheus and Grafana for monitoring

- **Observability**

  - Prometheus metrics integration
  - Structured logging with Zap
  - Grafana dashboards
  - Health monitoring
  - Distributed tracing support

- **Scalability**
  - Horizontal scaling support
  - Stateless architecture
  - Database replication
  - Load balancing
  - Auto-scaling capabilities

## Architecture

The service follows a layered architecture with clear separation of concerns:

```
[Client] -> [Nginx Load Balancer] -> [Profile Service Instances]
                                           |
                                           v
[Redis Cache] <-> [Profile Service] <-> [MongoDB Replica Set]
                                           |
                                           v
                                       [Monitoring]
```

### Components

1. **Handler Layer** (`internal/handler`)

   - HTTP request handling
   - Response formatting
   - Input validation
   - Error handling
   - Middleware for logging and metrics

2. **Service Layer** (`internal/service`)

   - Business logic
   - Component coordination
   - Transaction management
   - Cache integration
   - Queue integration

3. **Repository Layer** (`internal/repository`)

   - Data persistence operations
   - Database interactions
   - Query optimization
   - Connection management
   - Primary/Secondary replication support

4. **Cache Layer** (`internal/cache`)

   - Redis implementation
   - Cache invalidation
   - Performance optimization
   - Data consistency
   - TTL management

5. **Queue Layer** (`internal/queue`)
   - RabbitMQ integration
   - Asynchronous processing
   - Message routing
   - Error handling
   - Retry mechanisms

## Infrastructure

### Kubernetes Components

1. **Profile Service** (`k8s/simple/server.yaml`)

   - Deployment with 3 replicas
   - Resource limits and requests
   - Liveness and readiness probes
   - Environment configuration
   - Service exposure

2. **MongoDB** (`k8s/simple/mongodb.yaml`)

   - StatefulSet for data persistence
   - Primary/Secondary replication
   - Persistent volume claims
   - Service for internal access

3. **Redis** (`k8s/simple/redis.yaml`)

   - Deployment for caching
   - Persistent volume for data
   - Service for internal access
   - Resource limits

4. **RabbitMQ** (`k8s/simple/rabbitmq.yaml`)

   - StatefulSet for message queue
   - Persistent volume for messages
   - Service for internal access
   - Resource limits

5. **Client** (`k8s/simple/client.yaml`)
   - Deployment for web interface
   - Service for external access
   - Resource limits

### Network Architecture

```
[External Traffic] -> [Ingress] -> [Client Service] -> [Profile Service]
                                                      |
                                                      v
[RabbitMQ] <-> [Profile Service] <-> [Redis] <-> [MongoDB]
```

## API Endpoints

### Profile Management

- `POST /api/v1/profiles` - Create a new profile
- `GET /api/v1/profiles` - List all profiles
- `GET /api/v1/profiles/:id` - Get a specific profile
- `PUT /api/v1/profiles/:id` - Update a profile
- `DELETE /api/v1/profiles/:id` - Delete a profile
- `POST /api/v1/profiles/:id/images` - Upload profile image

### Task Management

- `POST /api/v1/tasks/delayed` - Submit a delayed task
- `GET /api/v1/tasks/:id` - Get task status

### System Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics endpoint

## Configuration

### Environment Variables

| Variable         | Description             | Default                            |
| ---------------- | ----------------------- | ---------------------------------- |
| `SERVER_PORT`    | Server port             | 8080                               |
| `DB_URI`         | MongoDB connection URI  | mongodb://localhost:27017          |
| `DB_NAME`        | MongoDB database name   | profiles                           |
| `MONGO_USERNAME` | MongoDB username        | -                                  |
| `MONGO_PASSWORD` | MongoDB password        | -                                  |
| `REDIS_ADDRESS`  | Redis server address    | localhost:6379                     |
| `REDIS_PASSWORD` | Redis password          | -                                  |
| `REDIS_DB`       | Redis database number   | 0                                  |
| `QUEUE_URI`      | RabbitMQ connection URI | amqp://guest:guest@localhost:5672/ |

### Kubernetes Configuration

1. **Resource Limits**

   ```yaml
   resources:
     requests:
       memory: "256Mi"
       cpu: "200m"
     limits:
       memory: "512Mi"
       cpu: "500m"
   ```

2. **Health Checks**
   ```yaml
   livenessProbe:
     httpGet:
       path: /health
       port: 8080
     initialDelaySeconds: 30
     periodSeconds: 10
   readinessProbe:
     httpGet:
       path: /health
       port: 8080
     initialDelaySeconds: 5
     periodSeconds: 5
   ```

## Deployment

### Prerequisites

- Go 1.21 or later
- Docker
- Kubernetes (Kind)
- kubectl
- make
- jq

### Local Development

1. Install dependencies:

   ```bash
   go mod download
   ```

2. Set up required services:

   - MongoDB
   - Redis
   - RabbitMQ

3. Run the service:
   ```bash
   go run cmd/main.go
   ```

### Docker Deployment

1. Build the image:

   ```bash
   docker build -t profile-service .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 --env-file .env profile-service
   ```

### Kubernetes Deployment

1. Create Kind cluster:

   ```bash
   make cluster-create
   ```

2. Deploy services:

   ```bash
   make deploy-all
   ```

3. Check status:

   ```bash
   make status
   ```

4. View logs:
   ```bash
   make logs-profile
   ```

## Monitoring

### Metrics

- Request latency
- Error rates
- Database performance
- Cache hit rates
- System resource usage
- Queue message rates

### Logging

- Structured logging with Zap
- Request/response logging
- Error tracking
- Performance metrics
- Distributed tracing

### Health Checks

- Service health
- Database connectivity
- Cache availability
- Queue status
- Resource utilization

## Scaling

### Horizontal Scaling

- Multiple service instances
- Load balanced traffic
- Stateless design
- Session management
- Auto-scaling based on metrics

### Database Scaling

- MongoDB replica set
- Read/write separation
- Automatic failover
- Data consistency
- Sharding support

### Caching Strategy

- Redis implementation
- Cache invalidation
- Performance optimization
- Data consistency
- TTL management

## Troubleshooting

### Common Issues

1. **Pods Not Starting**

   - Check cluster status: `kind get clusters`
   - Verify image loading: `kubectl get nodes -o wide`
   - Check pod status: `make status`

2. **API Request Failures**

   - Verify port forwarding: `make port-forward`
   - Check service logs: `make logs-profile`
   - Verify MongoDB: `make logs-mongodb`

3. **Complete Reset**
   ```bash
   make delete-all
   make deploy-all
   make build-image
   make wait-pods
   ```

### Logging and Debugging

- Service logs: `make logs-profile`
- Database logs: `make logs-mongodb`
- Cache logs: `make logs-redis`
- Queue logs: `make logs-rabbitmq`

## Development

### Workflow

1. Make code changes
2. Build and load image:

   ```bash
   make build-image
   ```

3. Restart service:

   ```bash
   make restart-profile
   ```

4. Run tests:
   ```bash
   make test-api
   ```

### Testing

- Unit tests: `go test ./...`
- API tests: `make test-api`
- Integration tests: `make test-integration`
- Load tests: `make test-load`

## License

MIT
