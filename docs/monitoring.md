# Monitoring Implementation

## Overview

The Profile Service implements a comprehensive monitoring system using Prometheus for metrics collection, Grafana for visualization, and structured logging for operational insights. This document details the monitoring architecture, configuration, and usage.

## Metrics Implementation

### Prometheus Configuration

#### Metrics Server

```yaml
apiVersion: v1
kind: Service
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  ports:
    - name: https
      port: 443
      protocol: TCP
      targetPort: https
```

#### Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: profile-service
```

### Core Metrics

#### Application Metrics

- Request latency
- Error rates
- Cache hit rates
- Queue lengths
- Resource usage

#### System Metrics

- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Pod status

### Custom Metrics

#### Profile Service

```go
// Example metric definition
var (
    requestLatency = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "profile_request_latency_seconds",
            Help:    "Request latency in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"endpoint", "method"},
    )
)
```

#### Cache Metrics

```go
var (
    cacheHits = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "cache_hits_total",
            Help: "Total cache hits",
        },
        []string{"cache_type"},
    )
)
```

## Logging Implementation

### Structured Logging

#### Configuration

```go
logger := zap.NewProduction()
defer logger.Sync()
```

#### Usage

```go
logger.Info("Processing request",
    zap.String("method", r.Method),
    zap.String("path", r.URL.Path),
    zap.Int("status", status),
)
```

### Log Levels

- DEBUG: Detailed debugging information
- INFO: General operational information
- WARN: Warning conditions
- ERROR: Error conditions
- FATAL: Critical conditions

## Alerting

### Alert Rules

```yaml
groups:
  - name: profile-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
```

### Notification Channels

- Email
- Slack
- PagerDuty
- Webhook

## Grafana Dashboards

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Profile Service Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Key Dashboards

1. **System Overview**

   - Resource usage
   - Pod status
   - Network traffic

2. **Application Metrics**

   - Request rates
   - Error rates
   - Cache performance

3. **Business Metrics**
   - User activity
   - Profile operations
   - Task processing

## Health Checks

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### Common Issues

1. **Metrics Not Showing**

   - Check Prometheus configuration
   - Verify service discovery
   - Check RBAC permissions

2. **High Latency**

   - Check resource usage
   - Verify cache performance
   - Monitor queue lengths

3. **Error Rates**
   - Check application logs
   - Verify dependencies
   - Monitor system resources

### Diagnostic Commands

```bash
# Check Prometheus status
kubectl get pods -n monitoring

# View metrics
curl localhost:9090/metrics

# Check logs
kubectl logs -f deployment/profile-server
```

## Configuration

### Environment Variables

- `PROMETHEUS_URL`: Prometheus server URL
- `GRAFANA_URL`: Grafana server URL
- `LOG_LEVEL`: Logging level
- `METRICS_PORT`: Metrics port

### Kubernetes Configuration

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Best Practices

### Metrics Collection

- Use appropriate metric types
- Label metrics consistently
- Set reasonable scrape intervals
- Monitor cardinality

### Logging

- Use structured logging
- Include relevant context
- Set appropriate log levels
- Rotate logs regularly

### Alerting

- Set meaningful thresholds
- Use appropriate severity levels
- Include actionable information
- Test alerting regularly
