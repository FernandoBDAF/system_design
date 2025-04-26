# Profile Service System Design

## Overview

This project implements a profile service system with a microservices architecture, using Kubernetes for orchestration and various components for different functionalities.

## Architecture Components

### Core Services

1. **PostgreSQL**: Primary database for profile data storage

   - Persistent storage for data durability
   - Single replica for development environment
   - Exposed on port 5432

2. **Redis**: Caching layer

   - Ephemeral storage for performance optimization
   - Single replica for development
   - Exposed on port 6379

3. **RabbitMQ**: Message broker for asynchronous processing
   - Persistent storage for message durability
   - Single replica for development
   - Exposed on ports 5672 (AMQP) and 15672 (Management UI)

### Application Components

1. **Profile Service (Server)**

   - REST API for profile management
   - Connects to PostgreSQL, Redis, and RabbitMQ
   - Exposed on port 30080
   - Health checks and metrics endpoints

2. **Profile Worker**

   - Processes asynchronous tasks
   - Connects to RabbitMQ
   - Exposed on port 30081
   - Resource limits for stability

3. **Profile Client**
   - Web interface for profile management
   - Connects to the server API
   - Exposed on port 3000
   - Next.js application

## Development Environment Setup

### Prerequisites

- Docker
- Kubernetes (Kind)
- kubectl
- make

### Execution Order

1. **Cluster Setup**

   ```bash
   make start
   ```

   This command:

   - Creates a Kind cluster with port mappings
   - Builds all components
   - Creates the namespace
   - Deploys all services
   - Waits for each component to be ready

2. **Component Initialization Order**

   - PostgreSQL starts first (database layer)
   - Redis starts second (caching layer)
   - RabbitMQ starts third (message broker)
   - Server starts fourth (API layer)
   - Worker starts fifth (background processing)
   - Client starts last (frontend)

3. **Health Checks**
   - Each component has readiness and liveness probes
   - Components wait for dependencies to be ready
   - Timeout of 300s for each component

### Make Commands

- `make build`: Build all components
- `make start`: Start the entire stack
- `make stop`: Stop the entire stack
- `make restart`: Restart the entire stack
- `make status`: Check component status
- `make logs`: View component logs (e.g., `make logs COMPONENT=server`)
- `make test`: Run API tests
- `make port-forward`: Set up port forwarding for all services
- `make clean`: Clean Kubernetes resources
- `make clean-all`: Clean all resources (Kubernetes, Docker, and cluster)

Note: All cluster management operations are centralized in the Makefile to ensure consistent and reproducible deployments.

## Access Points

- Client UI: http://localhost:3000
- Server API: http://localhost:30080
- Worker API: http://localhost:30081
- PostgreSQL: postgresql://localhost:5432
- Redis: redis://localhost:6379
- RabbitMQ: amqp://localhost:5672
- RabbitMQ UI: http://localhost:15672

## Directory Structure

```
k8s/
├── simple/           # Current Kubernetes configurations
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── rabbitmq.yaml
│   ├── server.yaml
│   ├── worker.yaml
│   ├── client.yaml
│   ├── kind-config.yaml
│   └── kustomization.yaml
└── old-code-just-for-reference/  # Previous implementations

server/
├── internal/
│   ├── api/          # API-related code
│   │   ├── handler/  # HTTP handlers
│   │   ├── router/   # Routing configuration
│   │   ├── service/  # Business logic
│   │   └── middleware/ # Request/response middleware
│   ├── repository/   # Data persistence
│   ├── models/       # Data structures
│   ├── queue/        # Message queue
│   ├── cache/        # Caching
│   ├── utils/        # Utilities
│   └── config/       # Configuration
├── cmd/              # Application entry points
├── Dockerfile        # Container configuration
├── go.mod            # Go dependencies
├── go.sum            # Go dependencies checksum
└── README.md         # Server documentation
```

## Testing

The system includes various test endpoints:

- Profile creation
- Profile retrieval
- Delayed task processing
- Health checks
- Metrics collection

## Monitoring

- Prometheus metrics
- Health check endpoints
- Resource usage monitoring
- Log aggregation

## Troubleshooting

1. Check component status:

   ```bash
   make status
   ```

2. View component logs:

   ```bash
   make logs COMPONENT=<component-name>
   ```

3. Restart components:

   ```bash
   make restart
   ```

4. Clean and start fresh:
   ```bash
   make clean-all
   make start
   ```

## Caching Implementation

### Cache Architecture

The system implements a two-level caching strategy:

1. **Redis Cache Layer**

   - FIFO (First-In-First-Out) eviction policy
   - Maximum cache size: 10 profiles
   - Default TTL: 24 hours for new entries, 1 hour for updates
   - Atomic operations for cache updates
   - Cache invalidation on profile updates

2. **Cache Behavior**
   - Profiles are cached on first read
   - Cache hits provide ~2x performance improvement
   - Cache is automatically invalidated on profile updates
   - Oldest entries are evicted when cache is full
   - Supports atomic operations for consistency

### Cache Performance

- Cache hits: ~7-18ms response time
- Database hits: ~8-20ms response time
- Cache operations:
  - Get: Single Redis operation (~7-12ms)
  - Set: Two Redis operations + eviction check (~13-18ms)
  - Update: Cache invalidation + Set (~14-20ms)
  - Delete: Cache removal + invalidation (~8-15ms)

### Monitoring and Metrics

- Cache hits and misses tracking
- Eviction monitoring
- Response time tracking
- Source tracking (cache vs database)
- Performance metrics via Prometheus

### Areas for Improvement

1. **Metrics Accuracy**

   - Cache miss counting needs improvement
   - Better correlation between metrics and actual behavior
   - More detailed performance tracking

2. **Cache Consistency**

   - Stricter FIFO implementation
   - Better eviction pattern tracking
   - More predictable cache behavior

3. **Performance Optimization**
   - Reduce cache operation overhead
   - Optimize Redis transactions
   - Better connection pooling
