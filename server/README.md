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
- [Cache Implementation Details](#cache-implementation-details)

## Features

- **Core Features**

  - RESTful API for profile management (CRUD operations)
  - Image upload and CDN integration
  - Health checks and metrics endpoints
  - Graceful shutdown support
  - Asynchronous task processing
  - Caching layer for performance optimization

- **Infrastructure**

  - PostgreSQL for data persistence with replication
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
[Redis Cache] <-> [Profile Service] <-> [PostgreSQL]
                                           |
                                           v
                                       [Monitoring]
```

### Components

1. **API Layer** (`internal/api`)

   - `handler/` - HTTP request handling and response formatting
   - `router/` - API routing configuration
   - `service/` - Business logic implementation
   - `middleware/` - Request/response middleware

2. **Repository Layer** (`internal/repository`)

   - Data persistence operations
   - PostgreSQL interactions
   - Query optimization
   - Connection management
   - Primary/Secondary replication support

3. **Cache Layer** (`internal/cache`)

   - Redis implementation
   - Cache invalidation
   - Performance optimization
   - Data consistency
   - TTL management

4. **Queue Layer** (`internal/queue`)

   - RabbitMQ integration
   - Asynchronous processing
   - Message routing
   - Error handling
   - Retry mechanisms

5. **Core Components** (`internal/`)
   - `models/` - Data structures and types
   - `utils/` - Utility functions
   - `config/` - Configuration management

## Infrastructure

### Kubernetes Components

1. **Profile Service** (`k8s/simple/server.yaml`)

   - Deployment with 3 replicas
   - Resource limits and requests
   - Liveness and readiness probes
   - Environment configuration
   - Service exposure

2. **PostgreSQL** (`k8s/simple/postgres.yaml`)

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
[RabbitMQ] <-> [Profile Service] <-> [Redis] <-> [PostgreSQL]
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
| `DB_HOST`        | PostgreSQL host         | localhost                          |
| `DB_PORT`        | PostgreSQL port         | 5432                               |
| `DB_USER`        | PostgreSQL username     | postgres                           |
| `DB_PASSWORD`    | PostgreSQL password     | -                                  |
| `DB_NAME`        | PostgreSQL database     | profiles                           |
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

   - PostgreSQL
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

- PostgreSQL replication
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
   - Verify PostgreSQL: `make logs-postgres`

3. **Complete Reset**
   ```bash
   make delete-all
   make deploy-all
   make build-image
   make wait-pods
   ```

### Logging and Debugging

- Service logs: `make logs-profile`
- Database logs: `make logs-postgres`
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

## Cache Implementation Details

### Cache Architecture

The system implements a pluggable caching layer with a primary Redis implementation and an in-memory fallback:

1. **Primary Cache: Redis** (`internal/cache/redis/cache.go`)

   - Default and preferred caching solution
   - Uses Redis pod for distributed caching
   - Provides persistence and shared cache across service instances
   - Features:
     - Atomic operations
     - TTL-based eviction
     - Performance monitoring
     - Error handling

2. **Fallback Cache: Memory** (`internal/cache/cache.go`)

   - Used only when Redis is unavailable
   - Automatically activated on Redis connection failure
   - Local to each service instance
   - Features:
     - Maximum size: 10 profiles
     - FIFO eviction policy
     - Thread-safe operations
     - No persistence between restarts

3. **Testing Cache: Noop** (`internal/cache/noop.go`)
   - Testing implementation
   - No-op operations
   - Useful for testing without cache effects

The system automatically handles the transition between Redis and in-memory caching:

```go
// Initialize Redis client
var cacheImpl cache.Cache
redisClient, err := redis.NewClient(cfg)
if err != nil {
    log.Printf("WARN: Failed to initialize Redis client: %v", err)
    log.Printf("WARN: Using in-memory cache implementation")
    cacheImpl = cache.NewMemoryCache()  // Fallback to in-memory
} else {
    cacheImpl = redisClient  // Use Redis
}
```

This design ensures:

- High performance with Redis as the primary cache
- Resilience through automatic fallback to in-memory cache
- No service interruption during Redis outages
- Limited cache capacity during fallback (10 profiles)

### Cache Operations

1. **Read Operations**

   ```go
   // Cache-first read strategy
   profile, err := cache.Get(ctx, id)
   if err == nil && profile != nil {
       return &ProfileResponse{
           Profile: profile,
           Source:  "cache",
       }, nil
   }
   ```

2. **Write Operations**

   ```go
   // Write-through caching
   if err := cache.Set(ctx, id, profile, 24*time.Hour); err != nil {
       logger.Log.Error("Failed to cache profile",
           zap.String("id", id),
           zap.Error(err),
       )
   }
   ```

3. **Cache Invalidation**
   ```go
   // Automatic invalidation on updates/deletes
   if err := cache.Delete(ctx, id); err != nil {
       logger.Log.Error("Failed to delete from cache",
           zap.String("id", id),
           zap.Error(err),
       )
   }
   ```

### Performance Characteristics

1. **Response Times**

   - Cache hits: 7-18ms (average: ~12ms)
   - Database hits: 8-20ms (average: ~15ms)
   - Performance improvement: ~1.5-2x faster for cache hits

2. **Cache Behavior**
   - Default TTL: 24 hours
   - Maximum size: 10 profiles (Memory Cache)
   - FIFO eviction when full
   - Atomic operations for consistency
   - Source tracking in responses

### Monitoring and Metrics

1. **Prometheus Metrics**

   - `cache_hits_total`: Total cache hits
   - `cache_misses_total`: Total cache misses
   - `cache_evictions_total`: Total cache evictions
   - `cache_errors_total`: Total cache errors
   - `cache_size`: Current cache size
   - `cache_operation_latency_seconds`: Operation latency
   - `cache_hit_ratio`: Cache hit ratio

2. **Alerting Conditions**
   - High error rate (>10%)
   - High latency (>20ms)
   - High miss rate (>50%)
   - Consecutive misses (>10)
   - Cache size exceeding maximum

### Implementation Notes

1. **Error Handling**

   - Graceful fallback to database on cache failures
   - Automatic switch to in-memory cache if Redis fails
   - Detailed error logging
   - Metrics tracking for error rates

2. **Cache Consistency**

   - Write-through caching
   - Automatic invalidation on updates
   - Source tracking in responses
   - Atomic operations for consistency

3. **Monitoring Integration**
   - Prometheus metrics exposure
   - Grafana dashboard support
   - Detailed logging
   - Performance tracking

### Areas for Improvement

1. **Metrics Accuracy**

   - Implement proper cache miss counting
   - Add detailed timing metrics
   - Track eviction patterns
   - Monitor cache size over time

2. **Monitoring and Alerting**
   - Add detailed cache operation logs
   - Track cache efficiency metrics
   - Monitor memory usage
   - Alert on performance degradation

### Future Implementations

1. **Performance Optimizations**

   - Reduce Redis operation count
   - Optimize JSON encoding/decoding
   - Improve connection pooling
   - Implement batch operations
   - Target response time: <10ms for all operations

2. **Cache Consistency**
   - Improve FIFO implementation
   - Better eviction logging
   - More predictable cache behavior
   - Enhanced error handling
   - Target: Consistent response times within 5ms range

### Current Implementation Status

1. **Cache Implementation**

   - Redis is functioning as the primary cache
   - In-memory fallback is working correctly
   - Basic cache operations (Get/Set/Delete) are operational
   - Cache metrics are being tracked and exposed

2. **Known Issues**

   - Cache eviction is not strictly enforcing the 10-profile limit
   - LRU (Least Recently Used) eviction policy needs improvement
   - Cache size monitoring could be more accurate
   - Periodic cleanup mechanism needs optimization

3. **Next Steps**

   - Implement stricter cache size enforcement
   - Improve eviction policy reliability
   - Enhance cache size monitoring
   - Optimize cleanup mechanism
   - Add more detailed cache operation logging

4. **Current Performance**
   - Cache hits: ~7-18ms response time
   - Database hits: ~8-20ms response time
   - Hit rate: ~94% in test scenarios
   - Cache operations are working as expected for basic use cases

## License

MIT
