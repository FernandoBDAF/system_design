# Rate Limiter Service - Deployment Guide

## Prerequisites

- Kubernetes cluster (version 1.20 or higher)
- Redis 7.0 or higher
- Go 1.20 or higher for development
- Helm 3.0 or higher (optional)

## System Requirements

### Kubernetes Cluster

- Minimum 3 nodes
- 4 CPU cores per node
- 8GB RAM per node
- 50GB storage per node

### Redis Requirements

- Version: 7.0 or higher
- Memory: 2GB minimum
- Storage: 10GB minimum
- Persistence: Enabled
- Replication: Enabled (recommended)

## Deployment Steps

1. **Prepare Environment**

   ```bash
   # Create namespace
   kubectl create namespace rate-limiter

   # Create secrets (if needed)
   kubectl create secret generic redis-secrets \
     --namespace rate-limiter \
     --from-literal=redis-password=your-password
   ```

2. **Deploy Components**

   ```bash
   # Apply all manifests
   kubectl apply -f k8s/ -n rate-limiter
   ```

3. **Verify Deployment**

   ```bash
   # Check pods
   kubectl get pods -n rate-limiter

   # Check services
   kubectl get services -n rate-limiter

   # Check HPA
   kubectl get hpa -n rate-limiter
   ```

## Configuration

### Environment Variables

All configuration is managed through the ConfigMap. Key variables:

- `RATE_LIMIT_REQUESTS`: Default 100
- `RATE_LIMIT_WINDOW_MINUTES`: Default 1
- `REDIS_HOST`: Default redis
- `REDIS_PORT`: Default 6379
- `SERVICE_PORT`: Default 8080
- `LOG_LEVEL`: Default info

### Resource Limits

#### Rate Limiter

- CPU: 100m-500m
- Memory: 128Mi-256Mi
- Replicas: 2-10

#### Redis

- CPU: 100m-500m
- Memory: 256Mi-512Mi
- Replicas: 1 (minimum)

## Monitoring

### Metrics to Monitor

- Request rate per second
- Redis operation latency
- Error rates
- CPU and memory usage
- Pod count

### Alert Thresholds

- CPU usage > 80% for 5 minutes
- Memory usage > 85% for 5 minutes
- Error rate > 1% for 5 minutes
- Redis latency > 100ms for 5 minutes

## Backup and Recovery

### Redis Backup

- Daily full backup
- Hourly incremental backup
- Retention: 7 days

### Recovery Procedures

1. Restore Redis from backup
2. Scale rate limiter to 1 replica
3. Verify service health
4. Scale back to normal

## Scaling

### Horizontal Pod Autoscaler

- Minimum replicas: 2
- Maximum replicas: 10
- CPU target: 70%

### Manual Scaling

```bash
# Scale rate limiter
kubectl scale deployment rate-limiter --replicas=3 -n rate-limiter

# Scale Redis (if needed)
kubectl scale statefulset redis --replicas=2 -n rate-limiter
```

## Network Policies

### Required Ports

- Rate Limiter: 8080 (HTTP)
- Redis: 6379 (Redis)

### Network Access

- Rate Limiter: Ingress from load balancer
- Redis: Cluster internal only

## Security

### RBAC Requirements

- Service account for rate limiter
- Service account for Redis
- Network policies for pod communication

### Secrets Management

- Redis password
- Service tokens
- API keys

## Maintenance

### Updates

1. Update ConfigMap
2. Rolling update of rate limiter
3. Verify health checks
4. Monitor metrics

### Downtime Procedures

1. Scale down rate limiter
2. Backup Redis
3. Perform maintenance
4. Restore service

## Troubleshooting

### Common Issues

1. Redis connection failures
2. High latency
3. Rate limiter pod crashes
4. Resource exhaustion

### Diagnostic Commands

```bash
# Check logs
kubectl logs -l app=rate-limiter -n rate-limiter

# Check events
kubectl get events --sort-by='.lastTimestamp' -n rate-limiter

# Check resource usage
kubectl top pods -n rate-limiter
```

## Support

### Contact Information

- Infrastructure Team: infra@company.com
- On-call Rotation: #oncall-rate-limiter

### Escalation Procedures

1. Alert on-call engineer
2. Escalate to team lead if unresolved in 30 minutes
3. Escalate to manager if unresolved in 1 hour
