package mongodb

import (
	"context"
	"time"

	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/logger"
	"github.com/fernandobarroso/profile-service/internal/metrics"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/fernandobarroso/profile-service/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"go.uber.org/zap"
)

// Repository implements the repository.Store interface for MongoDB
type Repository struct {
	primaryClient       *mongo.Client
	secondaryClient     *mongo.Client
	primaryCollection   *mongo.Collection
	secondaryCollection *mongo.Collection
}

// NewRepository creates a new MongoDB repository
func NewRepository(cfg *config.Config) (repository.Store, error) {
	// Primary connection
	primaryClient, err := mongo.Connect(context.Background(), options.Client().
		ApplyURI(cfg.Database.URI).
		SetReadPreference(readpref.Primary()))
	if err != nil {
		return nil, err
	}

	// Secondary connection
	secondaryClient, err := mongo.Connect(context.Background(), options.Client().
		ApplyURI(cfg.Database.URI).
		SetReadPreference(readpref.Secondary()))
	if err != nil {
		primaryClient.Disconnect(context.Background())
		return nil, err
	}

	primaryCollection := primaryClient.Database(cfg.Database.Database).Collection("profiles")
	secondaryCollection := secondaryClient.Database(cfg.Database.Database).Collection("profiles")

	return &Repository{
		primaryClient:       primaryClient,
		secondaryClient:     secondaryClient,
		primaryCollection:   primaryCollection,
		secondaryCollection: secondaryCollection,
	}, nil
}

func (r *Repository) Close(ctx context.Context) error {
	if err := r.primaryClient.Disconnect(ctx); err != nil {
		logger.Log.Error("Failed to disconnect primary client", zap.Error(err))
	}

	if err := r.secondaryClient.Disconnect(ctx); err != nil {
		logger.Log.Error("Failed to disconnect secondary client", zap.Error(err))
	}

	return nil
}

func (r *Repository) Create(ctx context.Context, profile *models.Profile) error {
	start := time.Now()

	_, err := r.primaryCollection.InsertOne(ctx, profile)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("create", "error").Inc()
		logger.Log.Error("Failed to create profile",
			zap.Error(err),
		)
		return err
	}

	metrics.DbOperationsTotal.WithLabelValues("create", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("create").Observe(time.Since(start).Seconds())
	return nil
}

func (r *Repository) Get(ctx context.Context, id string) (*models.Profile, error) {
	start := time.Now()

	var profile models.Profile
	err := r.secondaryCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&profile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			metrics.DbOperationsTotal.WithLabelValues("get", "not_found").Inc()
			return nil, nil
		}
		metrics.DbOperationsTotal.WithLabelValues("get", "error").Inc()
		logger.Log.Error("Failed to get profile",
			zap.Error(err),
		)
		return nil, err
	}

	metrics.DbOperationsTotal.WithLabelValues("get", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("get").Observe(time.Since(start).Seconds())
	return &profile, nil
}

func (r *Repository) Update(ctx context.Context, id string, profile *models.Profile) error {
	start := time.Now()

	profile.UpdatedAt = time.Now()
	_, err := r.primaryCollection.ReplaceOne(ctx, bson.M{"_id": id}, profile)
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("update", "error").Inc()
		logger.Log.Error("Failed to update profile",
			zap.Error(err),
		)
		return err
	}

	metrics.DbOperationsTotal.WithLabelValues("update", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("update").Observe(time.Since(start).Seconds())
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	start := time.Now()

	_, err := r.primaryCollection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("delete", "error").Inc()
		logger.Log.Error("Failed to delete profile",
			zap.Error(err),
		)
		return err
	}

	metrics.DbOperationsTotal.WithLabelValues("delete", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("delete").Observe(time.Since(start).Seconds())
	return nil
}

func (r *Repository) List(ctx context.Context) ([]*models.Profile, error) {
	start := time.Now()
	cursor, err := r.secondaryCollection.Find(ctx, bson.M{})
	if err != nil {
		metrics.DbOperationsTotal.WithLabelValues("list", "error").Inc()
		logger.Log.Error("Failed to list profiles",
			zap.Error(err),
		)
		return nil, err
	}
	defer cursor.Close(ctx)

	var profiles []*models.Profile
	if err = cursor.All(ctx, &profiles); err != nil {
		metrics.DbOperationsTotal.WithLabelValues("list", "error").Inc()
		logger.Log.Error("Failed to decode profiles",
			zap.Error(err),
		)
		return nil, err
	}

	metrics.DbOperationsTotal.WithLabelValues("list", "success").Inc()
	metrics.DbOperationDuration.WithLabelValues("list").Observe(time.Since(start).Seconds())
	return profiles, nil
}
