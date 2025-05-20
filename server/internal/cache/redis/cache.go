package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync/atomic"
	"time"

	"github.com/fernandobarroso/profile-service/internal/api/middleware/logger"
	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	// DefaultTTL is the default time-to-live for cached items
	DefaultTTL = 1 * time.Hour
	// ProfileKeyPrefix is the prefix for profile keys in Redis
	ProfileKeyPrefix = "profile:"
	// InvalidationChannelPrefix is the prefix for invalidation channels
	InvalidationChannelPrefix = "invalidation:"
	// OrderKey is the key for the sorted set that tracks cache order
	OrderKey = "profile:order"
	// MaxCacheSize is the maximum number of profiles to cache
	MaxCacheSize = 10
	// CleanupInterval is how often to run cache cleanup
	CleanupInterval = 5 * time.Minute
)

// CacheMetrics tracks cache performance metrics
type CacheMetrics struct {
	Hits      int64
	Misses    int64
	Evictions int64
	Errors    int64
	// New detailed metrics
	GetLatency     int64 // Total latency in nanoseconds for Get operations
	SetLatency     int64 // Total latency in nanoseconds for Set operations
	DeleteLatency  int64 // Total latency in nanoseconds for Delete operations
	OperationCount int64 // Total number of operations
	CacheSize      int64 // Current size of the cache
	LastEviction   int64 // Timestamp of last eviction
	// New detailed metrics
	TotalRequests     int64 // Total number of requests
	FailedRequests    int64 // Number of failed requests
	AverageLatency    int64 // Average latency in nanoseconds
	LastOperation     int64 // Timestamp of last operation
	ConsecutiveMisses int64 // Number of consecutive misses
}

// Cache implements the cache.Cache interface for Redis
type Cache struct {
	client  *redis.Client
	metrics CacheMetrics
	stop    chan struct{}
}

// TODO: Future Performance Improvements
// - Optimize Redis operations to reduce latency
// - Implement connection pooling
// - Add batch operations support
// - Target: <10ms response time for all operations

// TODO: Future Consistency Improvements
// - Implement stricter FIFO eviction
// - Add better error handling
// - Improve cache behavior predictability
// - Target: Consistent response times within 5ms range

// NewClient creates a new Redis client
func NewClient(cfg *config.Config) (*Cache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Cache.Address,
		Password: cfg.Cache.Password,
		DB:       cfg.Cache.DB,
	})

	// Test connection
	if err := client.Ping(context.Background()).Err(); err != nil {
		logger.Log.Error("Failed to connect to Redis", zap.Error(err))
		return nil, err
	}

	cache := &Cache{
		client: client,
	}

	// Start listening for invalidation events
	go cache.subscribeToInvalidation()

	return cache, nil
}

// Get retrieves a profile from cache
func (c *Cache) Get(ctx context.Context, id string) (*models.Profile, error) {
	start := time.Now()
	defer func() {
		latency := time.Since(start).Nanoseconds()
		atomic.AddInt64(&c.metrics.GetLatency, latency)
		atomic.AddInt64(&c.metrics.OperationCount, 1)
		atomic.AddInt64(&c.metrics.TotalRequests, 1)
		atomic.StoreInt64(&c.metrics.LastOperation, time.Now().UnixNano())

		// Update average latency
		currentAvg := atomic.LoadInt64(&c.metrics.AverageLatency)
		newAvg := (currentAvg + latency) / 2
		atomic.StoreInt64(&c.metrics.AverageLatency, newAvg)
	}()

	key := fmt.Sprintf("%s%s", ProfileKeyPrefix, id)
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			log.Printf("Cache miss for profile %s (consecutive misses: %d)", id, atomic.AddInt64(&c.metrics.ConsecutiveMisses, 1))
			atomic.AddInt64(&c.metrics.Misses, 1)
			return nil, nil
		}
		log.Printf("Error retrieving profile %s from cache: %v", id, err)
		atomic.AddInt64(&c.metrics.Errors, 1)
		atomic.AddInt64(&c.metrics.FailedRequests, 1)
		return nil, err
	}

	// Reset consecutive misses on hit
	atomic.StoreInt64(&c.metrics.ConsecutiveMisses, 0)
	log.Printf("Cache hit for profile %s (latency: %v)", id, time.Since(start))
	atomic.AddInt64(&c.metrics.Hits, 1)
	var profile models.Profile
	if err := json.Unmarshal(data, &profile); err != nil {
		log.Printf("Error unmarshaling profile %s: %v", id, err)
		atomic.AddInt64(&c.metrics.Errors, 1)
		atomic.AddInt64(&c.metrics.FailedRequests, 1)
		return nil, err
	}
	profile.GetFrom = "cache"
	return &profile, nil
}

// Set stores a profile in cache with TTL
// TODO: Optimize Redis operations (currently 2-3 operations per set)
// TODO: Add detailed timing metrics
func (c *Cache) Set(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error {
	start := time.Now()
	defer func() {
		latency := time.Since(start).Nanoseconds()
		atomic.AddInt64(&c.metrics.SetLatency, latency)
		atomic.AddInt64(&c.metrics.OperationCount, 1)
	}()

	if ttl == 0 {
		ttl = DefaultTTL
	}

	log.Printf("Setting profile %s in cache with TTL %v", id, ttl)

	// Create a copy of the profile to avoid modifying the original
	cacheProfile := *profile
	cacheProfile.GetFrom = "cache"

	key := fmt.Sprintf("%s%s", ProfileKeyPrefix, id)
	data, err := json.Marshal(cacheProfile)
	if err != nil {
		return err
	}

	// Start a transaction
	tx := c.client.TxPipeline()

	// Add to cache
	tx.Set(ctx, key, data, ttl)

	// Add to order set with current timestamp as score
	tx.ZAdd(ctx, OrderKey, redis.Z{
		Score:  float64(time.Now().UnixNano()),
		Member: id,
	})

	// Check cache size and evict if needed
	tx.ZCard(ctx, OrderKey)
	result, err := tx.Exec(ctx)
	if err != nil {
		return err
	}

	// Get the cardinality from the result
	cardCmd := result[len(result)-1].(*redis.IntCmd)
	count, err := cardCmd.Result()
	if err != nil {
		return err
	}

	// Update cache size metric
	atomic.StoreInt64(&c.metrics.CacheSize, count)

	if count > MaxCacheSize {
		log.Printf("Cache full (%d > %d), evicting oldest entry", count, MaxCacheSize)
		// Update last eviction timestamp
		atomic.StoreInt64(&c.metrics.LastEviction, time.Now().UnixNano())
		// Start a new transaction for eviction
		evictTx := c.client.TxPipeline()

		// Get the oldest entry
		evictTx.ZRange(ctx, OrderKey, 0, 0)
		evictResult, err := evictTx.Exec(ctx)
		if err != nil {
			return err
		}

		// Get the oldest ID from the result
		rangeCmd := evictResult[0].(*redis.StringSliceCmd)
		oldest, err := rangeCmd.Result()
		if err != nil {
			return err
		}

		if len(oldest) > 0 {
			log.Printf("Evicting profile %s from cache", oldest[0])
			// Remove the oldest entry in a new transaction
			removeTx := c.client.TxPipeline()
			oldestKey := fmt.Sprintf("%s%s", ProfileKeyPrefix, oldest[0])
			removeTx.Del(ctx, oldestKey)
			removeTx.ZRem(ctx, OrderKey, oldest[0])
			_, err = removeTx.Exec(ctx)
			if err != nil {
				return err
			}
		}
		atomic.AddInt64(&c.metrics.Evictions, 1)
	}

	return nil
}

// Delete removes a profile from cache
// TODO: Optimize Redis operations (currently 2 operations per delete)
// TODO: Add detailed timing metrics
func (c *Cache) Delete(ctx context.Context, id string) error {
	start := time.Now()
	defer func() {
		latency := time.Since(start).Nanoseconds()
		atomic.AddInt64(&c.metrics.DeleteLatency, latency)
		atomic.AddInt64(&c.metrics.OperationCount, 1)
	}()

	log.Printf("Deleting profile %s from cache", id)
	key := fmt.Sprintf("%s%s", ProfileKeyPrefix, id)
	// Publish invalidation event
	c.publishInvalidation(ctx, id)
	// Remove from order set
	c.client.ZRem(ctx, OrderKey, id)
	return c.client.Del(ctx, key).Err()
}

// Close closes the Redis connection
func (c *Cache) Close() error {
	return c.client.Close()
}

// subscribeToInvalidation listens for cache invalidation events
func (c *Cache) subscribeToInvalidation() {
	ctx := context.Background()
	pubsub := c.client.Subscribe(ctx, fmt.Sprintf("%s*", InvalidationChannelPrefix))
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		// Extract profile ID from channel name
		profileID := msg.Channel[len(InvalidationChannelPrefix):]
		key := fmt.Sprintf("%s%s", ProfileKeyPrefix, profileID)
		c.client.Del(ctx, key)
		c.client.ZRem(ctx, OrderKey, profileID)
	}
}

// publishInvalidation publishes a cache invalidation event
func (c *Cache) publishInvalidation(ctx context.Context, id string) error {
	channel := fmt.Sprintf("%s%s", InvalidationChannelPrefix, id)
	return c.client.Publish(ctx, channel, "invalidate").Err()
}

// GetMetrics returns the current cache metrics
// TODO: Add more detailed metrics
// TODO: Implement proper cache miss counting
// TODO: Add timing metrics
func (c *Cache) GetMetrics() CacheMetrics {
	return CacheMetrics{
		Hits:              atomic.LoadInt64(&c.metrics.Hits),
		Misses:            atomic.LoadInt64(&c.metrics.Misses),
		Evictions:         atomic.LoadInt64(&c.metrics.Evictions),
		Errors:            atomic.LoadInt64(&c.metrics.Errors),
		GetLatency:        atomic.LoadInt64(&c.metrics.GetLatency),
		SetLatency:        atomic.LoadInt64(&c.metrics.SetLatency),
		DeleteLatency:     atomic.LoadInt64(&c.metrics.DeleteLatency),
		OperationCount:    atomic.LoadInt64(&c.metrics.OperationCount),
		CacheSize:         atomic.LoadInt64(&c.metrics.CacheSize),
		LastEviction:      atomic.LoadInt64(&c.metrics.LastEviction),
		TotalRequests:     atomic.LoadInt64(&c.metrics.TotalRequests),
		FailedRequests:    atomic.LoadInt64(&c.metrics.FailedRequests),
		AverageLatency:    atomic.LoadInt64(&c.metrics.AverageLatency),
		LastOperation:     atomic.LoadInt64(&c.metrics.LastOperation),
		ConsecutiveMisses: atomic.LoadInt64(&c.metrics.ConsecutiveMisses),
	}
}

// Warm preloads profiles into the cache
func (c *Cache) Warm(ctx context.Context, profiles []*models.Profile) error {
	log.Printf("Warming cache with %d profiles", len(profiles))

	// Start a transaction for all operations
	tx := c.client.TxPipeline()

	// Add all profiles to cache and order set
	for _, profile := range profiles {
		key := fmt.Sprintf("%s%s", ProfileKeyPrefix, profile.ID)
		data, err := json.Marshal(profile)
		if err != nil {
			return err
		}

		// Add to cache
		tx.Set(ctx, key, data, DefaultTTL)

		// Add to order set
		tx.ZAdd(ctx, OrderKey, redis.Z{
			Score:  float64(time.Now().UnixNano()),
			Member: profile.ID,
		})
	}

	// Execute the transaction
	_, err := tx.Exec(ctx)
	if err != nil {
		return err
	}

	// Check if we need to evict any entries
	tx = c.client.TxPipeline()
	tx.ZCard(ctx, OrderKey)
	result, err := tx.Exec(ctx)
	if err != nil {
		return err
	}

	// Get the cardinality
	cardCmd := result[0].(*redis.IntCmd)
	count, err := cardCmd.Result()
	if err != nil {
		return err
	}

	// If we're over the limit, evict the oldest entries
	if count > MaxCacheSize {
		toEvict := count - MaxCacheSize
		log.Printf("Cache warming: need to evict %d entries", toEvict)

		// Get the oldest entries
		oldest, err := c.client.ZRange(ctx, OrderKey, 0, toEvict-1).Result()
		if err != nil {
			return err
		}

		// Remove them in a transaction
		evictTx := c.client.TxPipeline()
		for _, id := range oldest {
			key := fmt.Sprintf("%s%s", ProfileKeyPrefix, id)
			evictTx.Del(ctx, key)
			evictTx.ZRem(ctx, OrderKey, id)
		}
		_, err = evictTx.Exec(ctx)
		if err != nil {
			return err
		}
	}

	log.Printf("Cache warming completed successfully")
	return nil
}
