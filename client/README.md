# Profile Service Client

## Overview & Current Status

### Purpose

The Profile Service Client is a web-based dashboard for real-time monitoring and management of the Profile Service, providing a user-friendly interface for system visualization, metrics monitoring, and traffic control.

### Current Status 🟢

- **Service Status**: Healthy and deployed in `client-layer` namespace
- **Data Flow**: Real-time metrics and pod information successfully streaming
- **UI Access**: Dashboard fully functional with all core features
- **RBAC**: Service account permissions properly configured for cross-namespace access

### Recent Achievements ✅

- Successfully implemented layer-based visualization with proper pod grouping
- Integrated with Kubernetes metrics-server for real-time resource usage
- Implemented proper RBAC for cross-namespace access
- Added fallback mechanisms and error handling
- Verified pod and deployment information access

## System Architecture

### Layer-Based Model

Our system uses a four-layer namespace model for clear organization and isolation:

- `client-layer`: Frontend components (e.g., dashboard client)
- `server-layer`: Application services (e.g., API servers, workers)
- `data-layer`: Databases and caches (e.g., PostgreSQL, Redis)
- `observability-layer`: Monitoring tools (e.g., Prometheus, Grafana)

### Core Components

1. **Frontend Layer**

   - Next.js 15 App Router for routing and SSR
   - TypeScript for type safety
   - Tailwind CSS v4 for styling
   - D3.js for system visualization

2. **Backend Integration**

   - Next.js API Routes
   - Kubernetes client integration
   - Metrics collection and enrichment
   - Real-time updates via WebSocket

3. **Kubernetes Integration**
   - Service account token management
   - RBAC for metrics access
   - Cross-namespace communication
   - Health check implementation

## Features

### 1. System Visualization

- Real-time pod status and metrics display
  - Accurate pod status based on container state
  - Warning status for waiting/not-ready containers
  - Error status for CrashLoopBackOff
  - CPU usage as percentage of pod's resource limit
- Deployment and StatefulSet grouping
  - Load balancer visualization for deployments
  - Proper grouping based on deployment ownership
  - Clear distinction between deployment and standalone pods
- Layer-based organization
  - Four distinct layers: client, server, data, observability
  - Visual separation and clear labeling
  - Proper namespace mapping
- Pod-to-pod connections
- Status indicators and tooltips

### 2. Traffic Control

- Request rate adjustment (RPS)
- Request type selection
- Payload size configuration
- Error rate injection
- Preset testing scenarios

### 3. Metrics Dashboard

- CPU and memory usage tracking
- Request latency monitoring
- Error rate visualization
- Pod status tracking
- Real-time updates

## Configuration

### Environment Variables

\`\`\`bash

# Required Configuration

NEXT_PUBLIC_API_URL=http://profile-service:8080 # Profile service API URL
NAMESPACE=profile-service # Default namespace
KUBERNETES_SERVICE_HOST # K8s API server host
KUBERNETES_SERVICE_PORT=443 # K8s API server port

# Optional Settings

RETRY_INTERVAL=5000 # Retry interval (ms)
MAX_RETRY_ATTEMPTS=3 # Maximum retry attempts
\`\`\`

### Resource Limits

\`\`\`yaml
resources:
requests:
memory: "256Mi"
cpu: "200m"
limits:
memory: "512Mi"
cpu: "500m"
\`\`\`

### Health Checks

\`\`\`yaml
livenessProbe:
initialDelaySeconds: 60
periodSeconds: 15
timeoutSeconds: 5
readinessProbe:
initialDelaySeconds: 30
periodSeconds: 10
timeoutSeconds: 5
\`\`\`

## Development

### Prerequisites

- Node.js 18+
- Docker
- Kubernetes (Kind)
- kubectl
- make

### Quick Start

\`\`\`bash

# Local Development

npm install # Install dependencies
npm run dev # Start development server

# Production Build

npm run build # Build for production
npm start # Start production server

# Kubernetes Deployment

make build # Build Docker image
make start # Deploy to cluster
make status # Verify deployment
\`\`\`

### Access Points

- Development: http://localhost:3000
- Production: Via LoadBalancer
- Metrics: http://localhost:9090
- Grafana: http://localhost:3001

## Troubleshooting

### Common Issues

1. **Mock Data Showing Instead of Real Data**

   - Verify service account permissions
   - Check metrics-server status
   - Validate network policies

   ```bash
   kubectl auth can-i list pods --as=system:serviceaccount:client-layer:client-layer
   kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods
   ```

2. **Visualization Issues**

   - Clear browser cache
   - Check browser console for errors
   - Verify WebSocket connection
   - Review pod labels and grouping
   - Verify pod status accuracy:
     ```bash
     # Check actual pod status
     kubectl get pods -A -o wide
     # Check container status details
     kubectl describe pod <pod-name> -n <namespace>
     ```
   - Verify deployment ownership:
     ```bash
     # Check pod ownership
     kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.ownerReferences[*].kind}{"\n"}{end}'
     ```

3. **Performance Problems**
   - Monitor resource usage
   - Check network latency
   - Verify cache effectiveness
   - Review connection pooling

### Quick Fixes

\`\`\`bash

# Restart Client Pod

kubectl rollout restart deployment client -n client-layer

# Check Logs

kubectl logs -n client-layer -l app=client

# Verify Connectivity

kubectl exec -n client-layer deploy/client -- curl kubernetes.default.svc
\`\`\`

## Future Roadmap

### Phase 1: Metrics & Performance 📊

- [ ] Add memory usage visualization
- [ ] Implement historical metrics tracking
- [ ] Add detailed pod tooltips
- [ ] Optimize real-time updates

### Phase 2: User Experience 🎨

- [ ] Add pod filtering and search
- [ ] Implement zoom and pan controls
- [ ] Improve connection visualization
- [ ] Add custom view layouts

### Phase 3: Advanced Features 🚀

- [ ] Custom metrics support
- [ ] Alert configuration
- [ ] Dashboard customization
- [ ] Advanced traffic patterns

## Contributing

### Development Guidelines

1. Use TypeScript for all new code
2. Follow existing code style
3. Add tests for new features
4. Update documentation
5. Test fallback mechanisms

### Code Structure

\`\`\`
client/
├── src/
│ ├── app/ # Next.js App Router
│ ├── components/ # React components
│ ├── hooks/ # Custom hooks
│ ├── lib/ # Utilities
│ └── types/ # TypeScript types
├── public/ # Static assets
└── Dockerfile # Container config
\`\`\`

## Security Guidelines

### Must Not Change

1. **Security Settings**

   - Service account token mounts
   - RBAC permission levels
   - API exposure rules

2. **Resource Management**

   - Container resource limits
   - Health check configurations
   - Probe timeout values

3. **Development Practices**
   - TypeScript usage
   - Pre-commit linting
   - Error handling patterns

---

For more detailed information, see:

- [API Documentation](../docs/api.md)
- [Monitoring Setup](../docs/monitoring.md)
- [Testing Procedures](../docs/testing.md)
