# Rate Limiter Service

A distributed rate limiting service that sits between a load balancer and backend servers, designed to handle high-throughput HTTP traffic while maintaining low latency and high availability.

## Documentation

This project includes comprehensive documentation for different aspects of the service:

- [README.md](README.md) - Project overview and technical details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide for infrastructure teams
- [OPERATIONS.md](OPERATIONS.md) - Operational procedures and maintenance guide

## Features

- **Accurate Rate Limiting**: Precisely limit excessive requests based on IP address
- **Low Latency**: Minimal impact on HTTP response time
- **Memory Efficiency**: Optimized memory usage through Redis
- **Distributed Architecture**: Shared rate limiting across multiple instances
- **Clear Exception Handling**: Standard HTTP 429 responses with informative headers
- **High Fault Tolerance**: Graceful degradation without affecting the entire system
- **Health Monitoring**: Comprehensive health checks and status reporting
- **Graceful Shutdown**: Clean termination with proper resource cleanup
- **Comprehensive Logging**: Detailed logging of Redis operations and rate limiting events
- **Concurrency Safety**: Race condition prevention through Redis transactions
- **Kubernetes Ready**: Production-grade deployment configurations
- **High Availability**: Pod disruption budgets and network policies
- **Security**: RBAC and network isolation

## Architecture

### High-Level Design

- Acts as a reverse proxy between load balancer and backend servers
- Uses Redis for distributed request counting with atomic operations
- Implements sliding window counter algorithm with optimistic locking
- Provides standard HTTP rate limiting headers
- Handles concurrent requests safely through Redis transactions
- Detailed logging for monitoring and debugging
- Health check endpoint for service monitoring
- Kubernetes-native deployment with high availability

### Components

1. **Main Service**

   - HTTP server handling incoming requests
   - Request forwarding to backend servers
   - Rate limit enforcement
   - Standard response headers
   - Health check endpoint
   - Comprehensive logging
   - Graceful shutdown with proper cleanup
   - Kubernetes deployment with auto-scaling

2. **Rate Limiter**

   - Function-based middleware implementation
   - IP-based request identification
   - Redis-backed counter storage with atomic operations
   - Configurable limits and time windows
   - Optimistic locking for concurrent request handling
   - Automatic retry mechanism for failed transactions
   - Detailed logging of rate limiting events

3. **Redis Integration**
   - Distributed request counting with atomic operations
   - High-performance storage with transaction support
   - Automatic key expiration
   - Connection pooling and health monitoring
   - Optimistic locking implementation
   - Detailed logging of Redis operations and connection status
   - Kubernetes deployment with persistence

## Implementation Details

### Rate Limiting Algorithm

The service implements a sliding window counter algorithm with the following characteristics:

- **Atomic Operations**: Uses Redis transactions (WATCH/MULTI/EXEC) to ensure counter accuracy
- **Optimistic Locking**: Implements retry mechanism for concurrent updates
- **Automatic Expiration**: Keys are automatically expired after the time window
- **Race Condition Prevention**: Handles concurrent requests safely through Redis transactions
- **Detailed Logging**: Comprehensive logging of all rate limiting operations

### Redis Operations

The Redis client implements the following atomic operations:

1. **Counter Increment**:

   - Uses Redis transactions to ensure atomicity
   - Implements optimistic locking with retries
   - Combines counter increment and expiration in a single transaction
   - Logs all operations and connection status

2. **Error Handling**:
   - Graceful handling of Redis failures
   - Automatic retry mechanism for failed transactions
   - Fallback behavior when Redis is unavailable
   - Detailed logging of all errors and recovery attempts

### Health Check Endpoint

The service provides a `/health` endpoint that returns the following information:

```json
{
  "status": "ok|degraded",
  "redis": "ok|error",
  "timestamp": "ISO8601 timestamp"
}
```

- **Status**: Overall service status
  - `ok`: Service is fully operational
  - `degraded`: Service is running but with reduced functionality
- **Redis**: Redis connection status
  - `ok`: Redis is connected and operational
  - `error`: Redis is unavailable or experiencing issues

The health check endpoint maintains a 200 OK status code even when Redis is down to indicate that the service itself is running.

### Graceful Shutdown

The service implements graceful shutdown with the following characteristics:

- **Signal Handling**: Responds to SIGINT and SIGTERM signals
- **Timeout Configuration**:
  - Read timeout: 10 seconds
  - Write timeout: 10 seconds
  - Idle timeout: 120 seconds
  - Shutdown timeout: 30 seconds
- **Resource Cleanup**:
  - Proper closure of HTTP server
  - Cleanup of Redis connections
  - Handling of in-flight requests
- **Fallback Mechanism**:
  - Graceful shutdown attempt with timeout
  - Fallback to forced shutdown if needed
  - Comprehensive logging of shutdown process

### Logging

The service implements comprehensive logging throughout:

1. **Redis Operations**:

   - Connection attempts and status
   - Transaction operations and retries
   - Counter increments and retrievals
   - Error conditions and recovery attempts

2. **Rate Limiting Events**:

   - Request processing
   - Counter updates
   - Rate limit violations
   - Window resets

3. **Health Status**:
   - Service status changes
   - Redis connection state
   - Component availability

## Deployment

The service is deployed as a Kubernetes application with the following components:

- Rate Limiter Service (2+ replicas)
- Redis (1 replica)
- ConfigMap for configuration
- Horizontal Pod Autoscaler
- Network Policies
- Pod Disruption Budget
- Service Account with RBAC

### Documentation

For detailed information about deploying and operating the service, refer to:

1. **Deployment Guide** ([DEPLOYMENT.md](DEPLOYMENT.md))

   - Prerequisites and system requirements
   - Step-by-step deployment instructions
   - Configuration details
   - Monitoring setup
   - Backup procedures
   - Troubleshooting guide

2. **Operations Guide** ([OPERATIONS.md](OPERATIONS.md))
   - Day-to-day operations
   - Maintenance procedures
   - Scaling operations
   - Monitoring and alerting
   - Backup and recovery
   - Troubleshooting procedures

### Kubernetes Manifests

The service includes the following Kubernetes manifests in the `k8s/` directory:

- `configmap.yaml`: Configuration settings
- `redis.yaml`: Redis deployment and service
- `rate-limiter.yaml`: Rate limiter deployment and service
- `hpa.yaml`: Auto-scaling configuration
- `network-policy.yaml`: Network security policies
- `pdb.yaml`: Pod disruption budget
- `service-account.yaml`: RBAC configuration

## Testing

The service includes a comprehensive test suite with the following test cases:

1. **Basic Rate Limiting**

   - Tests the core rate limiting functionality
   - Verifies request allowance and rate limiting
   - Checks response headers

2. **Concurrent Requests**

   - Tests rate limiting for multiple IPs
   - Verifies independent rate limiting per IP
   - Checks concurrent request handling

3. **Window Reset**

   - Tests rate limit window expiration
   - Verifies reset functionality
   - Checks request allowance after reset

4. **Redis Error Handling**

   - Tests behavior during Redis downtime
   - Verifies graceful degradation
   - Checks recovery after Redis restart

5. **Header Validation**
   - Tests rate limit headers
   - Verifies header presence and correctness
   - Checks header values during rate limiting

To run the tests:

```bash
cd tests
./test_basic.sh      # Basic rate limiting
./test_concurrent.sh # Concurrent requests
./test_window_reset.sh # Window reset
./test_redis_error.sh # Redis error handling
./test_headers.sh    # Header validation
```

## Usage Scenarios

1. **Monitoring and Alerting**

   - Real-time service health monitoring
   - Automated alerts for critical issues
   - Performance trend analysis
   - Capacity planning and scaling decisions

2. **Debugging and Optimization**

   - Request flow visualization
   - Performance bottleneck identification
   - Distributed issue debugging
   - System optimization opportunities

3. **Development and Operations**
   - Local development debugging
   - Production issue investigation
   - Performance testing and optimization
   - System behavior analysis

## Future Improvements

### Monitoring and Observability

1. **Prometheus Metrics Integration**

   - Request rates and patterns
   - Redis operation latencies
   - Error rates and types
   - System resource usage
   - Health check status changes
   - Integration with Grafana for visualization
   - Alerting for critical metrics

2. **Distributed Tracing (OpenTelemetry)**
   - End-to-end request tracing
   - Redis operation tracking
   - Performance bottleneck identification
   - Integration with Jaeger/Zipkin
   - Correlation with metrics
   - Debugging distributed issues

### Deployment and Operations

1. **CI/CD Pipeline**

   - Automated build and test process
   - Security scanning and vulnerability checks
   - Automated deployment to multiple environments
   - Integration with version control
   - Deployment verification and rollback procedures
   - Release management and versioning

2. **Environment Configuration**

   - Multi-environment setup (dev, staging, prod)
   - Environment-specific configurations
   - Secrets management
   - Feature flags and toggles
   - Configuration validation
   - Environment promotion procedures

3. **Security and Network Policies**
   - Network segmentation and isolation
   - Pod-to-pod communication rules
   - Ingress and egress traffic control
   - Service mesh integration
   - TLS and certificate management
   - Security context configurations

## Future Enhancements

### Performance Optimization

1. **Benchmarking Suite**

   - Comprehensive performance test suite
   - Latency measurements under different loads
   - Throughput capabilities documentation
   - Resource utilization patterns
   - Comparison with other rate limiting solutions
   - Performance optimization guides

2. **Advanced Rate Limiting Features**
   - Token bucket algorithm implementation
   - Dynamic rate limiting based on system load
   - Custom rate limiting rules
   - Rate limiting by user/tenant
   - Burst handling improvements
   - Adaptive rate limiting

### Integration and Migration

1. **Integration Examples**

   - NGINX integration guide
   - HAProxy configuration examples
   - API Gateway integration (Kong, Traefik)
   - Service mesh integration (Istio, Linkerd)
   - Cloud provider specific configurations
   - Custom integration patterns

2. **Migration Guide**
   - Migration from other rate limiting solutions
   - Step-by-step migration procedures
   - Configuration conversion tools
   - Data migration strategies
   - Validation procedures
   - Rollback procedures

### Developer Experience

1. **Development Tools**

   - Local development environment improvements
   - Debugging tools and utilities
   - Performance profiling tools
   - Testing framework enhancements
   - Development documentation
   - Example applications

2. **API Enhancements**
   - REST API documentation
   - Client libraries for different languages
   - API versioning strategy
   - API testing tools
   - API monitoring tools
   - API security enhancements

### Operational Improvements

1. **Monitoring and Alerting**

   - Enhanced metrics collection
   - Custom dashboard templates
   - Advanced alerting rules
   - Anomaly detection
   - Capacity planning tools
   - Performance trend analysis

2. **Automation**
   - Automated backup procedures
   - Automated recovery procedures
   - Automated scaling rules
   - Automated testing procedures
   - Automated deployment procedures
   - Automated monitoring setup

### Security Enhancements

1. **Advanced Security Features**

   - JWT integration
   - OAuth2 support
   - API key management
   - Rate limiting by API key
   - IP whitelisting/blacklisting
   - DDoS protection features

2. **Compliance**
   - Audit logging improvements
   - Compliance documentation
   - Security certifications
   - Privacy features
   - Data retention policies
   - Access control enhancements

These enhancements are planned for future releases and will be prioritized based on community feedback and requirements.

## Project Structure

```
rate-limiter/
├── .env                    # Environment variables
├── docker-compose.yml      # Local development infrastructure
├── go.mod                  # Go module file
├── main.go                 # Main service implementation
├── README.md               # Project documentation
├── DEPLOYMENT.md           # Deployment guide
├── OPERATIONS.md           # Operational documentation
├── k8s/                    # Kubernetes manifests
│   ├── configmap.yaml      # Configuration settings
│   ├── redis.yaml          # Redis deployment
│   ├── rate-limiter.yaml   # Rate limiter deployment
│   ├── hpa.yaml            # Auto-scaling configuration
│   ├── network-policy.yaml # Network security policies
│   ├── pdb.yaml            # Pod disruption budget
│   └── service-account.yaml # RBAC configuration
├── config/
│   └── config.go           # Configuration management
├── handler/
│   ├── proxy.go            # Request handling and forwarding
│   └── health.go           # Health check implementation
├── middleware/
│   └── ratelimit.go        # Rate limiter implementation
├── redis/
│   └── client.go           # Redis client wrapper with atomic operations
└── tests/                  # Test scripts
    ├── test_basic.sh       # Basic rate limiting tests
    ├── test_concurrent.sh  # Concurrent request tests
    ├── test_window_reset.sh # Window reset tests
    ├── test_redis_error.sh # Redis error handling tests
    ├── test_headers.sh     # Header validation tests
    └── common.sh           # Common test utilities
```

## Request Flow

```
Client -> Load Balancer -> Rate Limiter Service
    -> If allowed: Forward to Backend Server
    -> If rate limited: Return 429 with headers
```

## Performance Considerations

- Atomic operations ensure accurate counting under high concurrency
- Optimistic locking minimizes contention
- Automatic retry mechanism handles transient failures
- Redis connection pooling for efficient resource usage
- Minimal overhead in request processing

## Configuration

Environment variables:

- `RATE_LIMIT_REQUESTS`: Number of requests allowed per time window
- `RATE_LIMIT_WINDOW_MINUTES`: Time window duration in minutes
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password (if required)
- `BACKEND_SERVER_URL`: URL of the actual server to forward requests to
- `SERVICE_PORT`: Port for the rate limiter service

## Response Headers

Standard HTTP rate limiting headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets
- `Retry-After`: Time in seconds until the rate limit resets

## Error Handling

- HTTP 429 (Too Many Requests) for rate-limited requests
- Standard error message format
- Retry-After header for client guidance
- Graceful degradation when Redis is unavailable
- Comprehensive logging of all errors and recovery attempts

## Local Development

The project includes a Docker Compose setup for local development:

- Redis container for rate limiting
- Rate limiter service container
- Example backend server container
- Network configuration
- Volume mapping for development
