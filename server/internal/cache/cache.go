package cache

import (
	"context"
	"time"

	"github.com/fernandobarroso/profile-service/internal/models"
)

// Cache defines the interface for caching operations
type Cache interface {
	// Get retrieves a profile from cache
	Get(ctx context.Context, id string) (*models.Profile, error)

	// Set stores a profile in cache with TTL
	Set(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error

	// Delete removes a profile from cache
	Delete(ctx context.Context, id string) error
}

// MemoryCache implements the Cache interface using in-memory storage
type MemoryCache struct {
	profiles map[string]*models.Profile
}

// NewMemoryCache creates a new MemoryCache instance
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		profiles: make(map[string]*models.Profile),
	}
}

// GetProfile retrieves a profile from the cache
func (c *MemoryCache) GetProfile(ctx context.Context, id string) (*models.Profile, error) {
	profile, exists := c.profiles[id]
	if !exists {
		return nil, nil
	}
	return profile, nil
}

// SetProfile stores a profile in the cache
func (c *MemoryCache) SetProfile(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error {
	c.profiles[id] = profile
	return nil
}

// Delete removes a profile from the cache
func (c *MemoryCache) Delete(ctx context.Context, id string) error {
	delete(c.profiles, id)
	return nil
}
