# Profile Service Server

## Overview & Purpose

A scalable profile management service built with Go, implementing a robust microservices architecture with caching, message queuing, and monitoring capabilities. The service provides a RESTful API for profile management and integrates with various infrastructure components.

## Documentation Principles

This component follows the project's documentation principles:

1. **Conceptual Clarity**

   - Clear component descriptions
   - Consistent terminology
   - Logical organization
   - Code examples
   - Progressive disclosure

2. **Lessons Learned**

   - Operational insights
   - Best practices
   - Common pitfalls
   - Performance considerations
   - Security guidelines

3. **Configuration & Guardrails**

   - Environment variables
   - Resource limits
   - Security settings
   - Performance tuning
   - Deployment patterns

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

For detailed documentation principles and guidelines, see [Documentation Principles](../../docs/principles.md).

## Related Documentation

For more detailed information about specific aspects of the server, see:

- [API Documentation](../../docs/api.md) - Comprehensive API endpoints and usage
- [Caching Implementation](../../docs/caching.md) - Detailed cache architecture and behavior
- [Monitoring Setup](../../docs/monitoring.md) - Monitoring configuration and metrics
- [Testing Procedures](../../docs/testing.md) - Testing commands and procedures

## Architecture & Main Flows

### Core Components

1. **API Layer** (`internal/api`)

   - HTTP request handling
   - Response formatting
   - Business logic
   - Middleware

2. **Repository Layer** (`internal/repository`)

   - PostgreSQL interactions
   - Query optimization
   - Connection management
   - Replication support

3. **Cache Layer** (`internal/cache`)

   - Redis implementation
   - Cache invalidation
   - Performance optimization
   - Fallback mechanisms

4. **Queue Layer** (`internal/queue`)
   - RabbitMQ integration
   - Async processing
   - Message routing
   - Retry logic

### Data Flows

1. **Profile Management**

   ```
   Client → API Layer → Cache Layer → Repository Layer → PostgreSQL
   ```

2. **Async Processing**

   ```
   Client → API Layer → Queue Layer → Worker → Repository Layer
   ```

3. **Caching Strategy**
   ```
   Request → Cache Check → Cache Hit/Miss → Database → Cache Update
   ```

## Configuration & Guardrails

### Required Environment Variables

- `SERVER_PORT`: Server port (default: 8080)
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: PostgreSQL username (default: postgres)
- `DB_PASSWORD`: PostgreSQL password (required)
- `DB_NAME`: PostgreSQL database (default: profiles)
- `REDIS_ADDRESS`: Redis server (default: localhost:6379)
- `REDIS_PASSWORD`: Redis password (required)
- `REDIS_DB`: Redis database (default: 0)
- `QUEUE_URI`: RabbitMQ URI (default: amqp://guest:guest@localhost:5672/)

### Resource Limits & Health Checks

- Memory: 256Mi request, 512Mi limit
- CPU: 200m request, 500m limit
- Liveness probe: 30s initial delay, 10s period
- Readiness probe: 5s initial delay, 5s period

### Guardrails: What Must Not Change

1. **Security Settings**

   - Do not disable authentication
   - Do not weaken RBAC permissions
   - Do not expose sensitive endpoints

2. **Resource Management**

   - Do not remove resource limits
   - Do not disable health checks
   - Do not increase probe timeouts beyond 5s

3. **Development Practices**
   - Always use structured logging
   - Always implement error handling
   - Always test fallback mechanisms

## Features

### 1. Profile Management

- CRUD operations
- Image upload support
- Validation and sanitization
- Rate limiting
- Error handling

### 2. Caching System

- Redis primary cache
- In-memory fallback
- Automatic invalidation
- Performance monitoring
- Metrics collection

### 3. Async Processing

- Delayed task support
- Message queuing
- Retry mechanisms
- Error handling
- Status tracking

## Lessons Learned

### Operational Insights

1. **Caching Strategy**

   - Redis is critical for performance
   - Fallback mechanisms are essential
   - Cache invalidation must be reliable
   - Metrics help identify issues

2. **Database Management**

   - Connection pooling is vital
   - Query optimization matters
   - Replication improves reliability
   - Monitoring is crucial

3. **Error Handling**
   - Always implement fallbacks
   - Log errors with context
   - Monitor error rates
   - Test error scenarios

## Troubleshooting Guide

### Common Issues & Solutions

1. **Database Issues**

   - Check connection status
   - Verify credentials
   - Monitor query performance
   - Command: `make logs-postgres`

2. **Cache Problems**

   - Check Redis connection
   - Verify cache operations
   - Monitor hit rates
   - Command: `make logs-redis`

3. **Queue Issues**
   - Check RabbitMQ status
   - Verify message flow
   - Monitor queue lengths
   - Command: `make logs-rabbitmq`

### Quick Recovery Steps

1. **Basic Checks**

   ```bash
   make status          # Check component status
   make logs            # View component logs
   kubectl top pods     # Check resource usage
   ```

2. **Common Fixes**
   ```bash
   make restart         # Restart the server
   make clean-all       # Clean and start fresh
   make start          # Rebuild and deploy
   ```

## Development & Usage

### Prerequisites

- Go 1.21+
- Docker
- Kubernetes (Kind)
- kubectl
- make

### Development Environment

#### Local Testing Setup (TODO)

A docker-compose configuration is needed for local development and testing. This will help:

1. Test service dependencies in isolation
2. Verify connection handling and retry logic
3. Debug startup sequence issues
4. Validate configuration parameters

Required components for docker-compose:

- PostgreSQL container
- Redis container
- RabbitMQ container
- Server container with hot-reload

#### Known Issues

1. **Dependency Initialization**:

   - Current implementation fails fast on connection errors
   - Need to implement proper retry logic
   - Should add graceful fallbacks for non-critical services

2. **Connection Management**:

   - Add proper timeouts for all service connections
   - Implement circuit breakers for resilience
   - Add connection pooling configurations

3. **Startup Sequence**:
   - Review initialization order of services
   - Add proper logging for startup steps
   - Implement readiness checks before accepting traffic

#### Next Steps

1. Create docker-compose.yml with all required services
2. Implement connection retry logic in main.go
3. Add proper error handling for non-critical services
4. Improve logging during startup sequence
5. Add integration tests for service dependencies

### Development Workflow

1. **Local Development**

   ```bash
   go mod download     # Install dependencies
   go run cmd/main.go  # Start server
   ```

2. **Docker Deployment**

   ```bash
   docker build -t server .
   docker run -p 8080:8080 --env-file .env server
   ```

3. **Kubernetes Deployment**
   ```bash
   make cluster-create  # Create Kind cluster
   make deploy-all     # Deploy services
   make status        # Verify deployment
   ```

### Access Points

- API: http://localhost:8080
- Metrics: http://localhost:8080/metrics
- Health: http://localhost:8080/health

## Directory Structure

```
server/
├── cmd/              # Main application entry
├── internal/         # Internal packages
│   ├── api/         # API handlers
│   ├── cache/       # Caching implementation
│   ├── repository/  # Database layer
│   ├── queue/       # Message queue
│   └── models/      # Data models
├── Dockerfile       # Container configuration
└── go.mod          # Dependencies
```

---

This README follows the project's documentation principles: conceptual clarity, lessons learned, configuration/code guardrails, troubleshooting tips, and consistency. For more details, see the root README.md and component-specific documentation.
