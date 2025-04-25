package mongodb

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/fernandobarroso/profile-service/internal/models"
)

// Store implements the repository.Store interface for MongoDB
type Store struct {
	collection *mongo.Collection
}

// NewStore creates a new MongoDB store
func NewStore(client *mongo.Client, dbName, collectionName string) *Store {
	return &Store{
		collection: client.Database(dbName).Collection(collectionName),
	}
}

// Create stores a new profile
func (s *Store) Create(ctx context.Context, profile *models.Profile) error {
	_, err := s.collection.InsertOne(ctx, profile)
	return err
}

// Get retrieves a profile by ID
func (s *Store) Get(ctx context.Context, id string) (*models.Profile, error) {
	var profile models.Profile
	err := s.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&profile)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &profile, nil
}

// Update updates an existing profile
func (s *Store) Update(ctx context.Context, id string, profile *models.Profile) error {
	profile.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(ctx, bson.M{"_id": id}, profile)
	return err
}

// Delete removes a profile by ID
func (s *Store) Delete(ctx context.Context, id string) error {
	_, err := s.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// List returns all profiles
func (s *Store) List(ctx context.Context) ([]*models.Profile, error) {
	cursor, err := s.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var profiles []*models.Profile
	if err := cursor.All(ctx, &profiles); err != nil {
		return nil, err
	}
	return profiles, nil
}
