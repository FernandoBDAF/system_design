# Profile Service Worker

## Overview

The worker component is responsible for processing asynchronous tasks in the profile service system. It connects to RabbitMQ to consume and process messages, handling background operations such as profile updates and delayed tasks.

## Kubernetes Configuration

### Deployment

The worker is deployed as a Kubernetes Deployment with the following specifications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: profile-worker
  namespace: profile-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: profile-worker
  template:
    metadata:
      labels:
        app: profile-worker
    spec:
      containers:
        - name: worker
          image: profile-worker:latest
          imagePullPolicy: Never
          env:
            - name: RABBITMQ_URI
              value: "amqp://user:password@rabbitmq:5672/"
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            exec:
              command:
                - sh
                - -c
                - "ps aux | grep worker"
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - sh
                - -c
                - "ps aux | grep worker"
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Environment Variables

### Required Variables

- `RABBITMQ_URI`: RabbitMQ connection string
- `POD_NAME`: Kubernetes pod name (automatically set)

### Optional Variables

- `LOG_LEVEL`: Logging level (default: info)
- `WORKER_POOL_SIZE`: Number of worker goroutines (default: 5)
- `TASK_TIMEOUT`: Task processing timeout in seconds (default: 300)

## Health Checks

- Liveness probe: Process check
- Readiness probe: Process check
- Initial delay: 30 seconds for liveness, 5 seconds for readiness
- Period: 10 seconds for liveness, 5 seconds for readiness

## Resource Management

- Memory: 256Mi request, 512Mi limit
- CPU: 200m request, 500m limit

## Access Points

- Health Check: http://localhost:30081/health
- Metrics: http://localhost:30081/metrics

## Task Processing

The worker processes the following types of tasks:

1. Profile Updates

   - Asynchronous profile modifications
   - Cache invalidation
   - Index updates

2. Delayed Tasks
   - Scheduled operations
   - Background processing
   - Result aggregation

## Dependencies

- RabbitMQ: Message broker for task queue

## Development

1. Build the image:

   ```bash
   docker build -t profile-worker:latest .
   ```

2. Run locally:
   ```bash
   docker run -p 30081:8080 \
     -e RABBITMQ_URI="amqp://user:password@rabbitmq:5672/" \
     profile-worker:latest
   ```

## Troubleshooting

1. Check logs:

   ```bash
   make logs COMPONENT=worker
   ```

2. Check RabbitMQ queue status:

   ```bash
   curl -u user:password http://localhost:15672/api/queues
   ```

3. Monitor task processing:
   ```bash
   kubectl exec -it <worker-pod> -- sh -c "ps aux | grep worker"
   ```

## Error Handling

- Automatic retry for failed tasks
- Dead letter queue for unrecoverable errors
- Circuit breaker for RabbitMQ connection
- Graceful shutdown handling

## Performance Tuning

- Worker pool size configuration
- Task timeout settings
- Memory and CPU limits
- Connection pool management
