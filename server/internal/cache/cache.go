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
	order    []string // Maintain order for FIFO
	maxSize  int
}

// NewMemoryCache creates a new MemoryCache instance
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		profiles: make(map[string]*models.Profile),
		order:    make([]string, 0),
		maxSize:  10,
	}
}

// Get retrieves a profile from the cache
func (c *MemoryCache) Get(ctx context.Context, id string) (*models.Profile, error) {
	profile, exists := c.profiles[id]
	if !exists {
		return nil, nil
	}
	return profile, nil
}

// Set stores a profile in the cache
func (c *MemoryCache) Set(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error {
	// If profile already exists, update it
	if _, exists := c.profiles[id]; exists {
		c.profiles[id] = profile
		return nil
	}

	// If cache is full, remove the oldest entry
	if len(c.order) >= c.maxSize {
		oldestID := c.order[0]
		delete(c.profiles, oldestID)
		c.order = c.order[1:]
	}

	// Add new profile
	c.profiles[id] = profile
	c.order = append(c.order, id)
	return nil
}

// Delete removes a profile from cache
func (c *MemoryCache) Delete(ctx context.Context, id string) error {
	delete(c.profiles, id)
	// Remove from order slice
	for i, profileID := range c.order {
		if profileID == id {
			c.order = append(c.order[:i], c.order[i+1:]...)
			break
		}
	}
	return nil
}
