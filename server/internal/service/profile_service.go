package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/fernandobarroso/profile-service/internal/cache"
	"github.com/fernandobarroso/profile-service/internal/logger"
	"github.com/fernandobarroso/profile-service/internal/metrics"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/fernandobarroso/profile-service/internal/queue"
	"github.com/fernandobarroso/profile-service/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ProfileService handles business logic for profile operations
type ProfileService struct {
	repository repository.Store
	cache      cache.Cache
	queue      queue.Queue
}

// NewProfileService creates a new profile service
func NewProfileService(repository repository.Store, cache cache.Cache, queue queue.Queue) *ProfileService {
	return &ProfileService{
		repository: repository,
		cache:      cache,
		queue:      queue,
	}
}

// Create creates a new profile
func (s *ProfileService) Create(ctx context.Context, profile *models.Profile) error {
	start := time.Now()
	profile.ID = uuid.New().String()
	profile.CreatedAt = time.Now()
	profile.UpdatedAt = time.Now()

	if err := s.repository.Create(ctx, profile); err != nil {
		metrics.DbOperationsTotal.WithLabelValues("create", "error").Inc()
		logger.Log.Error("Failed to create profile",
			zap.Error(err),
		)
		return err
	}

	// Cache the profile
	// if err := s.cache.Set(ctx, profile.ID, profile, 24*time.Hour); err != nil {
	// 	logger.Log.Error("Failed to cache profile",
	// 		zap.String("id", profile.ID),
	// 		zap.Error(err),
	// 	)
	// }

	// Publish event
	if err := s.publishEvent(ctx, "profile_created", profile); err != nil {
		logger.Log.Error("Failed to publish event",
			zap.Error(err),
		)
	}

	metrics.DbOperationsTotal.WithLabelValues("create", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("create").Observe(time.Since(start).Seconds())
	return nil
}

// Get retrieves a profile by ID
func (s *ProfileService) Get(ctx context.Context, id string) (*models.Profile, error) {
	start := time.Now()

	// Try to get from cache first
	// profile, err := s.cache.Get(ctx, id)
	// if err == nil && profile != nil {
	// 	metrics.CacheHits.Inc()
	// 	return profile, nil
	// }

	// If not in cache, get from repository
	profile, err := s.repository.Get(ctx, id)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("get", "error").Inc()
		logger.Log.Error("Failed to get profile",
			zap.String("id", id),
			zap.Error(err),
		)
		return nil, err
	}

	if profile == nil {
		metrics.DbOperationsTotal.WithLabelValues("get", "not_found").Inc()
		return nil, nil
	}

	// Cache the profile
	// if err := s.cache.Set(ctx, id, profile, 24*time.Hour); err != nil {
	// 	logger.Log.Error("Failed to cache profile",
	// 		zap.String("id", id),
	// 		zap.Error(err),
	// 	)
	// }

	metrics.DbOperationsTotal.WithLabelValues("get", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("get").Observe(time.Since(start).Seconds())
	return profile, nil
}

// Update updates an existing profile
func (s *ProfileService) Update(ctx context.Context, id string, profile *models.Profile) error {
	start := time.Now()

	if err := s.repository.Update(ctx, id, profile); err != nil {
		logger.Log.Error("Failed to update profile",
			zap.String("id", id),
			zap.Error(err),
		)
		metrics.DbOperationsTotal.WithLabelValues("update", "error").Inc()
		return err
	}

	// Update cache
	if err := s.cache.Set(ctx, id, profile, 24*time.Hour); err != nil {
		logger.Log.Error("Failed to cache profile",
			zap.String("id", id),
			zap.Error(err),
		)
	}

	// Publish event
	if err := s.publishEvent(ctx, "profile_updated", profile); err != nil {
		logger.Log.Error("Failed to publish event",
			zap.Error(err),
		)
	}

	metrics.DbOperationsTotal.WithLabelValues("update", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("update").Observe(time.Since(start).Seconds())
	return nil
}

// Delete removes a profile
func (s *ProfileService) Delete(ctx context.Context, id string) error {
	start := time.Now()

	if err := s.repository.Delete(ctx, id); err != nil {
		logger.Log.Error("Failed to delete profile",
			zap.String("id", id),
			zap.Error(err),
		)
		metrics.DbOperationsTotal.WithLabelValues("delete", "error").Inc()
		return err
	}

	// Delete from cache
	if err := s.cache.Delete(ctx, id); err != nil {
		logger.Log.Error("Failed to delete cache",
			zap.String("id", id),
			zap.Error(err),
		)
	}

	// Publish event
	if err := s.publishEvent(ctx, "profile_deleted", id); err != nil {
		logger.Log.Error("Failed to publish event",
			zap.Error(err),
		)
	}

	metrics.DbOperationsTotal.WithLabelValues("delete", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("delete").Observe(time.Since(start).Seconds())
	return nil
}

// List retrieves all profiles
func (s *ProfileService) List(ctx context.Context) ([]*models.Profile, error) {
	start := time.Now()

	profiles, err := s.repository.List(ctx)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("list", "error").Inc()
		logger.Log.Error("Failed to list profiles",
			zap.Error(err),
		)
		return nil, err
	}

	metrics.DbOperationsTotal.WithLabelValues("list", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("list").Observe(time.Since(start).Seconds())
	return profiles, nil
}

// ProcessDelayedTask processes a delayed task
func (s *ProfileService) ProcessDelayedTask(ctx context.Context, task *models.DelayedTask) error {
	// Skip if queue is not configured
	if s.queue == nil {
		return nil
	}

	taskData, err := json.Marshal(task)
	if err != nil {
		return err
	}

	return s.queue.Publish(ctx, "delayed_tasks", &queue.Message{
		Data:      taskData,
		Timestamp: time.Now(),
	})
}

// publishEvent publishes an event to the queue
func (s *ProfileService) publishEvent(ctx context.Context, eventType string, data interface{}) error {
	// Skip publishing if queue is not configured
	if s.queue == nil {
		return nil
	}

	event := &models.Event{
		ID:        uuid.New().String(),
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return s.queue.Publish(ctx, "events", &queue.Message{
		Data:      eventData,
		Timestamp: time.Now(),
	})
}
