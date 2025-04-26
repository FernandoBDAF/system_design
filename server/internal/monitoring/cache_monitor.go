package monitoring

import (
	"context"
	"log"
	"time"

	"github.com/fernandobarroso/profile-service/internal/cache/redis"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// CacheMonitor handles monitoring and alerting for the cache
type CacheMonitor struct {
	cache *redis.Cache

	// Prometheus metrics
	cacheHits           prometheus.Counter
	cacheMisses         prometheus.Counter
	cacheEvictions      prometheus.Counter
	cacheErrors         prometheus.Counter
	cacheSize           prometheus.Gauge
	cacheLatency        prometheus.Histogram
	cacheOperationCount prometheus.Counter
	cacheHitRatio       prometheus.Gauge
}

// NewCacheMonitor creates a new CacheMonitor instance
func NewCacheMonitor(cache *redis.Cache) *CacheMonitor {
	return &CacheMonitor{
		cache: cache,
		cacheHits: promauto.NewCounter(prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		}),
		cacheMisses: promauto.NewCounter(prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		}),
		cacheEvictions: promauto.NewCounter(prometheus.CounterOpts{
			Name: "cache_evictions_total",
			Help: "Total number of cache evictions",
		}),
		cacheErrors: promauto.NewCounter(prometheus.CounterOpts{
			Name: "cache_errors_total",
			Help: "Total number of cache errors",
		}),
		cacheSize: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "cache_size",
			Help: "Current size of the cache",
		}),
		cacheLatency: promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "cache_operation_latency_seconds",
			Help:    "Cache operation latency in seconds",
			Buckets: prometheus.ExponentialBuckets(0.001, 2, 10),
		}),
		cacheOperationCount: promauto.NewCounter(prometheus.CounterOpts{
			Name: "cache_operations_total",
			Help: "Total number of cache operations",
		}),
		cacheHitRatio: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "cache_hit_ratio",
			Help: "Cache hit ratio (hits / total requests)",
		}),
	}
}

// StartMonitoring begins monitoring the cache
func (m *CacheMonitor) StartMonitoring(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.updateMetrics()
			m.checkAlerts()
		}
	}
}

// updateMetrics updates all Prometheus metrics
func (m *CacheMonitor) updateMetrics() {
	metrics := m.cache.GetMetrics()

	// Update counters
	m.cacheHits.Add(float64(metrics.Hits))
	m.cacheMisses.Add(float64(metrics.Misses))
	m.cacheEvictions.Add(float64(metrics.Evictions))
	m.cacheErrors.Add(float64(metrics.Errors))
	m.cacheOperationCount.Add(float64(metrics.OperationCount))

	// Update gauges
	m.cacheSize.Set(float64(metrics.CacheSize))

	// Calculate and set hit ratio
	if metrics.TotalRequests > 0 {
		hitRatio := float64(metrics.Hits) / float64(metrics.TotalRequests)
		m.cacheHitRatio.Set(hitRatio)
	}

	// Record latency
	if metrics.OperationCount > 0 {
		avgLatency := float64(metrics.AverageLatency) / float64(time.Second)
		m.cacheLatency.Observe(avgLatency)
	}
}

// checkAlerts checks for conditions that should trigger alerts
func (m *CacheMonitor) checkAlerts() {
	metrics := m.cache.GetMetrics()

	// Check for high error rate
	if metrics.TotalRequests > 0 {
		errorRate := float64(metrics.Errors) / float64(metrics.TotalRequests)
		if errorRate > 0.1 { // 10% error rate threshold
			log.Printf("ALERT: High cache error rate: %.2f%%", errorRate*100)
		}
	}

	// Check for high latency
	if metrics.AverageLatency > 20*int64(time.Millisecond) {
		log.Printf("ALERT: High cache latency: %v", time.Duration(metrics.AverageLatency))
	}

	// Check for high miss rate
	if metrics.TotalRequests > 0 {
		missRate := float64(metrics.Misses) / float64(metrics.TotalRequests)
		if missRate > 0.5 { // 50% miss rate threshold
			log.Printf("ALERT: High cache miss rate: %.2f%%", missRate*100)
		}
	}

	// Check for consecutive misses
	if metrics.ConsecutiveMisses > 10 {
		log.Printf("ALERT: High number of consecutive cache misses: %d", metrics.ConsecutiveMisses)
	}

	// Check for cache size
	if metrics.CacheSize > int64(redis.MaxCacheSize) {
		log.Printf("ALERT: Cache size exceeded maximum: %d > %d", metrics.CacheSize, redis.MaxCacheSize)
	}
}

// GetMetrics returns current monitoring metrics
func (m *CacheMonitor) GetMetrics() map[string]float64 {
	metrics := m.cache.GetMetrics()
	return map[string]float64{
		"hits":               float64(metrics.Hits),
		"misses":             float64(metrics.Misses),
		"evictions":          float64(metrics.Evictions),
		"errors":             float64(metrics.Errors),
		"size":               float64(metrics.CacheSize),
		"latency":            float64(metrics.AverageLatency) / float64(time.Second),
		"operations":         float64(metrics.OperationCount),
		"hit_ratio":          float64(metrics.Hits) / float64(metrics.TotalRequests),
		"error_rate":         float64(metrics.Errors) / float64(metrics.TotalRequests),
		"miss_rate":          float64(metrics.Misses) / float64(metrics.TotalRequests),
		"consecutive_misses": float64(metrics.ConsecutiveMisses),
	}
}
