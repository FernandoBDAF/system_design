# Profile Service System Design

## Overview

This project implements a profile service system with a microservices architecture, using Kubernetes for orchestration and various components for different functionalities.

## Architecture Components

### Core Services

1. **MongoDB**: Primary database for profile data storage

   - Persistent storage for data durability
   - Single replica for development environment
   - Exposed on port 27017

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
   - Connects to MongoDB, Redis, and RabbitMQ
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

   - MongoDB starts first (database layer)
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
- `make clean`: Clean Kubernetes resources
- `make clean-all`: Clean all resources (Kubernetes, Docker, and cluster)

Note: All cluster management operations are centralized in the Makefile to ensure consistent and reproducible deployments.

## Access Points

- Client UI: http://localhost:3000
- Server API: http://localhost:30080
- Worker API: http://localhost:30081
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379
- RabbitMQ: amqp://localhost:5672
- RabbitMQ UI: http://localhost:15672

## Directory Structure

```
k8s/
├── simple/           # Current Kubernetes configurations
│   ├── namespace.yaml
│   ├── mongodb.yaml
│   ├── redis.yaml
│   ├── rabbitmq.yaml
│   ├── server.yaml
│   ├── worker.yaml
│   ├── client.yaml
│   ├── kind-config.yaml
│   └── kustomization.yaml
└── old-code-just-for-reference/  # Previous implementations
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
