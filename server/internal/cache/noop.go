package cache

import (
	"context"
	"time"

	"github.com/fernandobarroso/profile-service/internal/models"
)

// NoopCache implements the Cache interface with no-op operations
type NoopCache struct{}

// NewNoopCache creates a new NoopCache instance
func NewNoopCache() *NoopCache {
	return &NoopCache{}
}

// Get always returns nil, nil
func (c *NoopCache) Get(ctx context.Context, id string) (*models.Profile, error) {
	return nil, nil
}

// Set always returns nil
func (c *NoopCache) Set(ctx context.Context, id string, profile *models.Profile, ttl time.Duration) error {
	return nil
}

// Delete always returns nil
func (c *NoopCache) Delete(ctx context.Context, id string) error {
	return nil
}
