# Profile Service System Design

## Overview & Purpose

This project implements a profile service system using a microservices architecture, orchestrated by Kubernetes. The system provides robust, scalable, and observable services for profile management, background processing, and real-time monitoring, with a focus on operational reliability and developer productivity.

### Key Features

- Real-time profile management and monitoring
- Asynchronous task processing
- Caching for performance optimization
- Comprehensive metrics and observability
- Secure, scalable architecture
- Layer-based system visualization

## Documentation Principles

This project follows a set of documentation principles to ensure clarity, consistency, and maintainability:

1. **Conceptual Clarity**

   - Clear, concise explanations
   - Consistent terminology
   - Logical organization
   - Visual aids when helpful
   - Progressive disclosure of complexity

2. **Lessons Learned**

   - Document operational insights
   - Share best practices
   - Highlight common pitfalls
   - Include real-world examples
   - Update based on experience

3. **Configuration & Guardrails**

   - Explicit requirements
   - Clear boundaries
   - Actionable guidelines
   - Security considerations
   - Performance implications

4. **Troubleshooting Tips**

   - Common issues and solutions
   - Quick recovery steps
   - Diagnostic commands
   - Error patterns
   - Prevention strategies

5. **Consistency**
   - Uniform formatting
   - Standard terminology
   - Consistent structure
   - Regular updates
   - Cross-referencing

For detailed documentation principles and guidelines, see [Documentation Principles](docs/principles.md).

## Related Documentation

For more detailed information about specific aspects of the system, see:

- [API Documentation](docs/api.md) - Comprehensive API endpoints and usage
- [Caching Implementation](docs/caching.md) - Detailed cache architecture and behavior
- [Monitoring Setup](docs/monitoring.md) - Monitoring configuration and metrics
- [Testing Procedures](docs/testing.md) - Testing commands and procedures

## Layer-Based Architecture

### Namespace Structure

The system is organized into logical layers using Kubernetes namespaces:

1. **Client Layer** (`client-layer`)

   - Next.js dashboard
   - User interface components
   - Client-side services

2. **Server Layer** (`server-layer`)

   - API services
   - Background workers
   - Message queues
   - Business logic components

3. **Data Layer** (`data-layer`)

   - PostgreSQL database
   - Redis cache
   - Data persistence services

4. **Observability Layer** (`observability-layer`)
   - Prometheus metrics
   - Grafana dashboards
   - Logging services
   - Monitoring components

### Cross-Namespace Communication

1. **Service Discovery**

   - Use fully qualified domain names
   - Example: `server.server-layer.svc.cluster.local`
   - Configured in service definitions

2. **Network Policies**

   - Layer-specific access control
   - Explicit communication rules
   - Security boundaries

3. **RBAC Configuration**
   - Cross-namespace permissions
   - Service account management
   - Access control policies

### Visualization Approach

1. **Layer Organization**

   - Horizontal layers for each namespace
   - Clear visual separation
   - Consistent positioning

2. **Component Grouping**

   - Services grouped by function
   - Clear hierarchy
   - Logical connections

3. **Connection Visualization**
   - Cross-layer connections
   - Type-specific styling
   - Real-time updates

## Architecture & Main Flows

### Core Components & Their Roles

1. **Client Layer**

   - **Next.js Dashboard**
     - Real-time monitoring interface
     - System visualization
     - User interaction
   - **Client Services**
     - API integration
     - WebSocket connections
     - State management

2. **Server Layer**

   - **API Services**
     - REST endpoints
     - WebSocket support
     - Business logic
   - **Background Workers**
     - Task processing
     - Queue management
     - Error handling
   - **Message Queues**
     - Message routing
     - Queue persistence
     - Delivery guarantees

3. **Data Layer**

   - **PostgreSQL**
     - Primary data storage
     - Transaction management
     - Data consistency
   - **Redis**
     - Caching layer
     - Session management
     - Performance optimization

4. **Observability Layer**
   - **Prometheus**
     - Metrics collection
     - Alert management
     - Time-series data
   - **Grafana**
     - Dashboard visualization
     - Metric analysis
     - Alert visualization
   - **Logging Services**
     - Log aggregation
     - Log analysis
     - Audit trails

### Component Interactions & Data Flow

1. **Client-Server Flow**

   ```
   Client Layer → Server Layer → [Cache Check] → Data Layer
   ```

2. **Background Processing Flow**

   ```
   Server Layer → Message Queue → Worker → Data Layer
   ```

3. **Monitoring Flow**
   ```
   All Layers → Observability Layer → Visualization
   ```

### Design Rationale & Key Decisions

1. **Architecture Choices**

   - Microservices for independent scaling
   - Kubernetes for orchestration and reliability
   - Message queues for async processing
   - Caching for performance optimization

2. **Security Implementation**

   - RBAC for access control
   - Service accounts for pod identity
   - Namespace isolation
   - Resource limits for stability

3. **Observability Strategy**
   - Prometheus for metrics
   - Grafana for visualization
   - Structured logging
   - Health checks and probes

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

3. **Development Practices**
   - Document all configuration changes
   - Use version control for manifests
   - Test changes in development first

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

3. **Performance Issues**
   - Check resource usage: `kubectl top pods`
   - Verify cache hit rates
   - Check queue lengths
   - Monitor database connections

### Quick Recovery Steps

1. **Basic Checks**

   ```bash
   make status          # Check component status
   make logs            # View component logs
   kubectl top pods     # Check resource usage
   ```

2. **Common Fixes**
   ```bash
   make restart         # Restart all components
   make clean-all       # Clean and start fresh
   make start          # Rebuild and deploy
   ```

## Development & Usage

### Prerequisites

- Docker
- Kubernetes (Kind)
- kubectl
- make

### Development Workflow

1. **Local Development**

   ```bash
   make build          # Build all components
   make start          # Start the stack
   make test          # Run tests
   ```

2. **Deployment Process**

   ```bash
   make clean-all     # Clean existing resources
   make start         # Deploy everything
   make status        # Verify deployment
   ```

3. **Monitoring & Debugging**
   ```bash
   make logs          # View logs
   make port-forward  # Access services
   ```

### Access Points

- Client UI: http://localhost:3000
- Server API: http://localhost:8080
- Worker API: http://localhost:8081
- PostgreSQL: postgresql://localhost:5432
- Redis: redis://localhost:6379
- RabbitMQ: amqp://localhost:5672
- RabbitMQ UI: http://localhost:15672
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

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
└── README.md               # Kubernetes documentation

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

## Caching Implementation

### Cache Architecture & Behavior

1. **Redis Configuration**

   - FIFO eviction policy
   - Maximum size: 10 profiles
   - TTL: 24h (new), 1h (updates)
   - Atomic operations
   - Automatic invalidation

2. **Performance Characteristics**

   - Cache hits: ~7-18ms
   - Database hits: ~8-20ms
   - Operations:
     - Get: ~7-12ms
     - Set: ~13-18ms
     - Update: ~14-20ms
     - Delete: ~8-15ms

3. **Monitoring & Metrics**
   - Cache hit/miss tracking
   - Eviction monitoring
   - Response time tracking
   - Source tracking
   - Prometheus integration

### Areas for Improvement

1. **Metrics & Monitoring**

   - Improve cache miss counting
   - Better correlation with actual behavior
   - Enhanced performance tracking

2. **Cache Consistency**

   - Stricter FIFO implementation
   - Better eviction pattern tracking
   - More predictable behavior

3. **Performance Optimization**
   - Reduce operation overhead
   - Optimize Redis transactions
   - Improve connection pooling

---

This README follows the project's documentation principles: conceptual clarity, lessons learned, configuration/code guardrails, troubleshooting tips, and consistency. For more details, see component-specific READMEs and the `k8s/README.md` for Kubernetes configuration best practices.
