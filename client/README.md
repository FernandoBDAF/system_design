# Profile Service Client

## Overview & Current Status

### Purpose

The Profile Service Client is a web-based dashboard for real-time monitoring and management of the Profile Service, providing a user-friendly interface for system visualization, metrics monitoring, and traffic control.

### Current Status 🟡

- **Service Status**: Operational with some permission limitations
- **Data Flow**: Real-time metrics and pod information streaming with fallback mechanisms
- **UI Access**: Dashboard functional with all core features
- **RBAC**: Service account permissions configured for cross-namespace access, with limited StatefulSet access
  - StatefulSet access is namespace-specific
  - Fallback mechanisms handle limited permissions gracefully
  - No impact on core visualization functionality

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
  - Error status for CrashLoopBackOff and CreateContainerConfigError
  - CPU usage as percentage of pod's resource limit

- Pod Grouping and Load Balancer Rules

  - **Load Balancer Visualization Rules**:

    1. Deployments with Services (SHOW load balancer):
       - Multiple replicas that need traffic distribution
       - Has a non-headless Service for load balancing
       - Example: API servers, web applications
    2. StatefulSets (DO NOT show load balancer):
       - Each pod has unique identity and storage
       - Uses headless Service for direct pod addressing
       - Example: Databases (postgres, rabbitmq)
    3. Single Pod with Service (DO NOT show load balancer):
       - No replicas to balance between
       - Direct pod access is sufficient
       - Example: Monitoring tools (grafana, prometheus)
    4. Background Workers (DO NOT show load balancer):
       - No incoming traffic to balance
       - Internal cluster communication only
       - Example: Message processors, batch jobs

  - **Service Type Considerations**:

    - LoadBalancer/NodePort: External traffic distribution
    - ClusterIP: Internal traffic distribution
    - Headless: Direct pod addressing (StatefulSets)

  - **Implementation Details**:
    - Check pod ownership (Deployment/StatefulSet/ReplicaSet)
    - Verify associated Service existence and type
    - Consider replica count for load balancing need
    - Respect StatefulSet's direct addressing pattern

- Layer-based organization

  - Four distinct layers: client, server, data, observability
  - Visual separation and clear labeling
  - Proper namespace mapping

- Pod-to-pod connections

  - Connections array describes logical or observed relationships
  - Not directly retrieved from Kubernetes API
  - Can be statically defined or dynamically generated
  - Extensible for future enhancements

- Status indicators and tooltips
  - Hover tooltips with detailed pod information
  - Color-coded status indicators:
    - Green: Running
    - Orange: Warning (waiting/not-ready)
    - Red: Error (CrashLoopBackOff/CreateContainerConfigError)
  - CPU percentage display for active pods
  - Memory usage information when available

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

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Health Checks

```yaml
livenessProbe:
  initialDelaySeconds: 60
  periodSeconds: 15
  timeoutSeconds: 5
readinessProbe:
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
```

## Development

### Prerequisites

- Node.js 18+
- Docker 24+
- Kubernetes (Kind) 0.20+
- kubectl 1.28+
- make 4.0+

**Dependency Versions**:

- Next.js: 15.x
- TypeScript: 5.x
- Tailwind CSS: 4.x
- D3.js: 7.x
- Kubernetes Client: 0.18.x

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

   - Verify service account permissions:
     ```bash
     kubectl auth can-i list pods --as=system:serviceaccount:client-layer:client-layer
     kubectl auth can-i get pods/metrics --as=system:serviceaccount:client-layer:client-layer
     ```
   - Check metrics-server status:
     ```bash
     kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods
     kubectl get apiservice v1beta1.metrics.k8s.io
     ```
   - Validate network policies:
     ```bash
     kubectl get networkpolicies --all-namespaces
     kubectl describe networkpolicy -n client-layer
     ```
   - Check service account token:
     ```bash
     kubectl describe sa client-layer -n client-layer
     ```

2. **Visualization Issues**

   - Clear browser cache and refresh
   - Check browser console for errors
   - Verify WebSocket connection
   - Review pod labels and grouping:
     ```bash
     # Check pod labels
     kubectl get pods -A --show-labels
     # Check deployment ownership
     kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.ownerReferences[*].kind}{"\n"}{end}'
     # Check service selectors
     kubectl get svc -A -o=custom-columns='NAME:.metadata.name,SELECTOR:.spec.selector'
     ```
   - Verify pod status accuracy:
     ```bash
     # Check actual pod status
     kubectl get pods -A -o wide
     # Check container status details
     kubectl describe pod <pod-name> -n <namespace>
     ```

3. **Performance Problems**
   - Monitor resource usage:
     ```bash
     kubectl top pods -A
     kubectl top nodes
     ```
   - Check network latency:
     ```bash
     kubectl exec -n client-layer deploy/client -- curl -w "\nTotal: %{time_total}s\n" kubernetes.default.svc
     ```
   - Review metrics server performance:
     ```bash
     kubectl logs -n kube-system -l k8s-app=metrics-server
     ```

### Quick Fixes

```bash
# Restart Client Pod
kubectl rollout restart deployment client -n client-layer

# Check Logs
kubectl logs -n client-layer -l app=client

# Verify Connectivity
kubectl exec -n client-layer deploy/client -- curl kubernetes.default.svc

# Check Metrics Server
kubectl -n kube-system logs -l k8s-app=metrics-server

# Verify RBAC
kubectl auth can-i --list --as=system:serviceaccount:client-layer:client-layer
```

### Error Messages and Reasons

When mock data is shown, the following reasons may be displayed:

1. "Running outside cluster" - Application is running in development mode
2. "Service account credentials error" - Issues with reading service account token
3. "Metrics server not available" - Metrics API is not accessible
4. "Insufficient permissions to list pods" - RBAC permissions are not properly configured
5. "Failed to connect to metrics server" - Network or configuration issues with metrics-server
6. "Limited StatefulSet access" - Service account has limited access to StatefulSet resources

For each error:

1. Check the specific error message in the yellow warning banner
2. Follow the corresponding troubleshooting steps above
3. Review logs using `kubectl logs` for more details
4. Verify configuration using `kubectl describe` on relevant resources
5. For StatefulSet access issues, verify namespace-specific permissions:
   ```bash
   kubectl auth can-i list statefulsets --as=system:serviceaccount:client-layer:client-layer -n client-layer
   kubectl auth can-i list statefulsets --as=system:serviceaccount:client-layer:client-layer -n server-layer
   kubectl auth can-i list statefulsets --as=system:serviceaccount:client-layer:client-layer -n data-layer
   kubectl auth can-i list statefulsets --as=system:serviceaccount:client-layer:client-layer -n observability-layer
   ```

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
