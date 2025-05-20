package postgresql

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/fernandobarroso/profile-service/internal/api/middleware/logger"
	"github.com/fernandobarroso/profile-service/internal/api/middleware/metrics"
	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/fernandobarroso/profile-service/internal/repository"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

// Repository implements the repository.Store interface for PostgreSQL
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new PostgreSQL repository
func NewRepository(cfg *config.Config) (repository.Store, error) {
	db, err := sql.Open("postgres", cfg.Database.URI)
	if err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		logger.Log.Error("Failed to connect to PostgreSQL", zap.Error(err))
		return nil, err
	}

	// Initialize database schema
	if err := initSchema(db); err != nil {
		logger.Log.Error("Failed to initialize database schema", zap.Error(err))
		return nil, err
	}

	return &Repository{db: db}, nil
}

// initSchema creates the necessary database tables
func initSchema(db *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS profiles (
			id VARCHAR(36) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			bio TEXT,
			image_urls JSONB,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL
		)
	`

	_, err := db.Exec(query)
	return err
}

// Close closes the database connection
func (r *Repository) Close(ctx context.Context) error {
	return r.db.Close()
}

// Create creates a new profile
func (r *Repository) Create(ctx context.Context, profile *models.Profile) error {
	query := `
		INSERT INTO profiles (id, name, email, bio, image_urls, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
	`

	// Convert ImageURLs to JSON
	imageURLsJSON, err := json.Marshal(profile.ImageURLs)
	if err != nil {
		return err
	}

	_, err = r.db.ExecContext(ctx, query,
		profile.ID,
		profile.Name,
		profile.Email,
		profile.Bio,
		imageURLsJSON,
		profile.CreatedAt,
		profile.UpdatedAt,
	)

	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("create", "error").Inc()
		logger.Log.Error("Failed to create profile",
			zap.Error(err),
		)
		return err
	}

	metrics.DbOperationsTotal.WithLabelValues("create", "success").Inc()
	return nil
}

// Get retrieves a profile by ID
func (r *Repository) Get(ctx context.Context, id string) (*models.Profile, error) {
	query := `
		SELECT id, name, email, bio, image_urls, created_at, updated_at
		FROM profiles
		WHERE id = $1
	`

	var imageURLsJSON []byte
	profile := &models.Profile{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&profile.ID,
		&profile.Name,
		&profile.Email,
		&profile.Bio,
		&imageURLsJSON,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repository.ErrNotFound
		}
		metrics.DbOperationsTotal.WithLabelValues("get", "error").Inc()
		logger.Log.Error("Failed to get profile",
			zap.Error(err),
		)
		return nil, err
	}

	// Convert JSON back to []string
	if err := json.Unmarshal(imageURLsJSON, &profile.ImageURLs); err != nil {
		return nil, err
	}

	metrics.DbOperationsTotal.WithLabelValues("get", "success").Inc()
	return profile, nil
}

// Update updates a profile
func (r *Repository) Update(ctx context.Context, id string, profile *models.Profile) error {
	start := time.Now()

	// First get the current profile
	currentProfile, err := r.Get(ctx, id)
	if err != nil {
		return err
	}

	// Merge updates with current profile
	if profile.Name != "" {
		currentProfile.Name = profile.Name
	}
	if profile.Email != "" {
		currentProfile.Email = profile.Email
	}
	if profile.Bio != "" {
		currentProfile.Bio = profile.Bio
	}
	if profile.ImageURLs != nil {
		currentProfile.ImageURLs = profile.ImageURLs
	}

	query := `
		UPDATE profiles
		SET name = $1, email = $2, bio = $3, image_urls = $4::jsonb, updated_at = $5
		WHERE id = $6
	`

	// Convert ImageURLs to JSON
	imageURLsJSON, err := json.Marshal(currentProfile.ImageURLs)
	if err != nil {
		return err
	}

	result, err := r.db.ExecContext(ctx, query,
		currentProfile.Name,
		currentProfile.Email,
		currentProfile.Bio,
		imageURLsJSON,
		time.Now(),
		id,
	)

	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("update", "error").Inc()
		logger.Log.Error("Failed to update profile",
			zap.Error(err),
		)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return repository.ErrNotFound
	}

	// Update the input profile with the merged data
	*profile = *currentProfile

	metrics.DbOperationsTotal.WithLabelValues("update", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("update").Observe(time.Since(start).Seconds())
	return nil
}

// Delete deletes a profile
func (r *Repository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM profiles WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("delete", "error").Inc()
		logger.Log.Error("Failed to delete profile",
			zap.Error(err),
		)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return repository.ErrNotFound
	}

	metrics.DbOperationsTotal.WithLabelValues("delete", "success").Inc()
	return nil
}

// List retrieves all profiles
func (r *Repository) List(ctx context.Context) ([]*models.Profile, error) {
	query := `
		SELECT id, name, email, bio, image_urls, created_at, updated_at
		FROM profiles
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("list", "error").Inc()
		logger.Log.Error("Failed to list profiles",
			zap.Error(err),
		)
		return nil, err
	}
	defer rows.Close()

	var profiles []*models.Profile
	for rows.Next() {
		var imageURLsJSON []byte
		profile := &models.Profile{}
		err := rows.Scan(
			&profile.ID,
			&profile.Name,
			&profile.Email,
			&profile.Bio,
			&imageURLsJSON,
			&profile.CreatedAt,
			&profile.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Convert JSON back to []string
		if err := json.Unmarshal(imageURLsJSON, &profile.ImageURLs); err != nil {
			return nil, err
		}

		profiles = append(profiles, profile)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	metrics.DbOperationsTotal.WithLabelValues("list", "success").Inc()
	return profiles, nil
}
