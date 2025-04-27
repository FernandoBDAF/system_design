# Caching Implementation

## Overview

The Profile Service implements a robust caching layer with Redis as the primary cache and an in-memory fallback mechanism. This document details the cache architecture, behavior, and implementation specifics.

## Cache Architecture

### Primary Cache: Redis

#### Configuration

```yaml
redis:
  address: localhost:6379
  password: required
  db: 0
  ttl: 24h
  max_size: 10
```

#### Features

- Atomic operations
- TTL-based eviction
- Performance monitoring
- Error handling
- Connection pooling

### Fallback Cache: Memory

#### Configuration

```go
type MemoryCache struct {
    maxSize int
    ttl     time.Duration
    store   map[string]cacheEntry
    mu      sync.RWMutex
}
```

#### Features

- Thread-safe operations
- FIFO eviction policy
- Maximum size: 10 profiles
- No persistence
- Automatic activation

## Cache Operations

### Read Operations

```go
// Cache-first read strategy
profile, err := cache.Get(ctx, id)
if err == nil && profile != nil {
    return &ProfileResponse{
        Profile: profile,
        Source:  "cache",
    }, nil
}
```

### Write Operations

```go
// Write-through caching
if err := cache.Set(ctx, id, profile, 24*time.Hour); err != nil {
    logger.Log.Error("Failed to cache profile",
        zap.String("id", id),
        zap.Error(err),
    )
}
```

### Cache Invalidation

```go
// Automatic invalidation
if err := cache.Delete(ctx, id); err != nil {
    logger.Log.Error("Failed to delete from cache",
        zap.String("id", id),
        zap.Error(err),
    )
}
```

## Performance Characteristics

### Response Times

- Cache hits: 7-18ms (average: ~12ms)
- Database hits: 8-20ms (average: ~15ms)
- Performance improvement: ~1.5-2x faster for cache hits

### Cache Behavior

- Default TTL: 24 hours
- Maximum size: 10 profiles (Memory Cache)
- FIFO eviction when full
- Atomic operations for consistency
- Source tracking in responses

## Monitoring & Metrics

### Prometheus Metrics

- `cache_hits_total`: Total cache hits
- `cache_misses_total`: Total cache misses
- `cache_evictions_total`: Total cache evictions
- `cache_errors_total`: Total cache errors
- `cache_size`: Current cache size
- `cache_operation_latency_seconds`: Operation latency
- `cache_hit_ratio`: Cache hit ratio

### Alerting Conditions

- High error rate (>10%)
- High latency (>20ms)
- High miss rate (>50%)
- Consecutive misses (>10)
- Cache size exceeding maximum

## Implementation Notes

### Error Handling

- Graceful fallback to database
- Automatic switch to in-memory cache
- Detailed error logging
- Metrics tracking

### Cache Consistency

- Write-through caching
- Automatic invalidation
- Source tracking
- Atomic operations

### Monitoring Integration

- Prometheus metrics
- Grafana dashboards
- Detailed logging
- Performance tracking

## Areas for Improvement

### Metrics Accuracy

- Implement proper cache miss counting
- Add detailed timing metrics
- Track eviction patterns
- Monitor cache size over time

### Cache Consistency

- Improve FIFO implementation
- Better eviction logging
- More predictable behavior
- Enhanced error handling

### Performance Optimization

- Reduce Redis operation count
- Optimize JSON encoding/decoding
- Improve connection pooling
- Implement batch operations

## Current Implementation Status

### Functionality

- Redis is functioning as primary cache
- In-memory fallback is working
- Basic operations are operational
- Metrics are being tracked

### Known Issues

- Cache eviction not strictly enforcing limit
- LRU policy needs improvement
- Cache size monitoring could be more accurate
- Cleanup mechanism needs optimization

### Next Steps

- Implement stricter size enforcement
- Improve eviction policy
- Enhance size monitoring
- Optimize cleanup mechanism
- Add detailed operation logging

## Testing

### Unit Tests

```bash
go test ./internal/cache/...
```

### Integration Tests

```bash
make test-cache
```

### Performance Tests

```bash
make test-cache-performance
```

## Configuration

### Environment Variables

- `REDIS_ADDRESS`: Redis server address
- `REDIS_PASSWORD`: Redis password
- `REDIS_DB`: Redis database number
- `CACHE_TTL`: Cache entry TTL
- `CACHE_MAX_SIZE`: Maximum cache size

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
