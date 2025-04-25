package repository

import (
	"context"
	"errors"

	"github.com/fernandobarroso/profile-service/internal/models"
)

// Store defines the interface for profile storage operations
type Store interface {
	// Create stores a new profile
	Create(ctx context.Context, profile *models.Profile) error

	// Get retrieves a profile by ID
	Get(ctx context.Context, id string) (*models.Profile, error)

	// Update updates an existing profile
	Update(ctx context.Context, id string, profile *models.Profile) error

	// Delete removes a profile by ID
	Delete(ctx context.Context, id string) error

	// List returns all profiles
	List(ctx context.Context) ([]*models.Profile, error)

	// Close closes any resources used by the store
	Close(ctx context.Context) error
}

// ErrNotFound is returned when a profile is not found
var ErrNotFound = errors.New("profile not found")
