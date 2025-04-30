# Rate Limiter Service - Operational Documentation

## Deployment Overview

The rate limiter service is deployed as a Kubernetes application with the following components:

- Rate Limiter Service (2+ replicas)
- Redis (1 replica)
- ConfigMap for configuration
- Horizontal Pod Autoscaler

## Deployment Files

The service is deployed using the following Kubernetes manifests:

- `k8s/configmap.yaml`: Configuration settings
- `k8s/redis.yaml`: Redis deployment and service
- `k8s/rate-limiter.yaml`: Rate limiter deployment and service
- `k8s/hpa.yaml`: Auto-scaling configuration

## Deployment Procedures

### Initial Deployment

1. Build the rate limiter image:

   ```bash
   docker build -t rate-limiter:latest .
   ```

2. Apply Kubernetes manifests:

   ```bash
   kubectl apply -f k8s/
   ```

3. Verify deployment:
   ```bash
   kubectl get pods
   kubectl get services
   ```

### Scaling Operations

#### Manual Scaling

Scale the rate limiter deployment:

```bash
kubectl scale deployment rate-limiter --replicas=3
```

#### Auto-scaling

The service uses Horizontal Pod Autoscaler (HPA) with the following settings:

- Minimum replicas: 2
- Maximum replicas: 10
- CPU target: 70%

View HPA status:

```bash
kubectl get hpa rate-limiter
```

### Monitoring

#### Health Checks

The service provides a `/health` endpoint that returns:

```json
{
  "status": "ok|degraded",
  "redis": "ok|error",
  "timestamp": "ISO8601 timestamp"
}
```

Check service health:

```bash
kubectl port-forward svc/rate-limiter 8080:8080
curl http://localhost:8080/health
```

#### Pod Status

Check pod status:

```bash
kubectl get pods -l app=rate-limiter
kubectl describe pod <pod-name>
```

#### Logs

View service logs:

```bash
kubectl logs -l app=rate-limiter
```

View Redis logs:

```bash
kubectl logs -l app=redis
```

### Backup and Recovery

#### Redis Data

Current setup uses `emptyDir` volume. For production, consider:

1. Using persistent volumes
2. Implementing Redis backup procedures
3. Setting up Redis replication

#### Service Recovery

1. Check deployment status:

   ```bash
   kubectl get deployment rate-limiter
   ```

2. If needed, restart deployment:

   ```bash
   kubectl rollout restart deployment rate-limiter
   ```

3. Check rollout status:
   ```bash
   kubectl rollout status deployment rate-limiter
   ```

### Troubleshooting

#### Common Issues

1. **Rate Limiter Not Starting**

   - Check ConfigMap values
   - Verify Redis connectivity
   - Check resource limits

2. **Redis Connection Issues**

   - Verify Redis service is running
   - Check network policies
   - Verify Redis logs

3. **High CPU Usage**
   - Check HPA status
   - Review resource limits
   - Monitor request patterns

#### Diagnostic Commands

1. Check events:

   ```bash
   kubectl get events --sort-by='.lastTimestamp'
   ```

2. Check service endpoints:

   ```bash
   kubectl get endpoints rate-limiter
   ```

3. Check network connectivity:
   ```bash
   kubectl exec -it <rate-limiter-pod> -- curl http://redis:6379
   ```

## Resource Management

### Resource Limits

#### Rate Limiter

- CPU: 100m-500m
- Memory: 128Mi-256Mi

#### Redis

- CPU: 100m-500m
- Memory: 256Mi-512Mi

### Monitoring Resources

Check resource usage:

```bash
kubectl top pods -l app=rate-limiter
kubectl top pods -l app=redis
```

## Security Considerations

1. **Network Access**

   - Rate limiter service is ClusterIP by default
   - Redis is accessible only within the cluster
   - Consider network policies for production

2. **Resource Isolation**

   - Each component has resource limits
   - Separate namespaces recommended for production

3. **Configuration**
   - Sensitive data should use Secrets instead of ConfigMap
   - Consider using a secrets management solution

## Future Improvements

1. **Monitoring**

   - Implement Prometheus metrics
   - Set up Grafana dashboards
   - Configure alerts

2. **Backup**

   - Implement Redis backup procedures
   - Set up automated backup schedules
   - Create recovery procedures

3. **Security**

   - Implement network policies
   - Add TLS termination
   - Set up RBAC

4. **High Availability**
   - Implement Redis replication
   - Set up Redis sentinel
   - Configure pod disruption budgets
