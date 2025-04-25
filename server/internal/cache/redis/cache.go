package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/redis/go-redis/v9"
)

// Cache implements the cache.Cache interface for Redis
type Cache struct {
	client *redis.Client
}

// NewClient creates a new Redis client
func NewClient(cfg *config.Config) (*Cache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Cache.Address,
		Password: cfg.Cache.Password,
		DB:       cfg.Cache.DB,
	})

	// Test connection
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return &Cache{
		client: client,
	}, nil
}

// Get retrieves a profile from cache
func (c *Cache) Get(ctx context.Context, id string) (*models.Profile, error) {
	data, err := c.client.Get(ctx, id).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}

	var profile models.Profile
	if err := json.Unmarshal(data, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}

// Set stores a profile in cache with TTL
func (c *Cache) Set(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error {
	data, err := json.Marshal(profile)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, id, data, ttl).Err()
}

// Delete removes a profile from cache
func (c *Cache) Delete(ctx context.Context, id string) error {
	return c.client.Del(ctx, id).Err()
}

// Close closes the Redis connection
func (c *Cache) Close() error {
	return c.client.Close()
}
