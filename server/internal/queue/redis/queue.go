package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/fernandobarroso/profile-service/internal/api/middleware/logger"
	"github.com/fernandobarroso/profile-service/internal/api/middleware/metrics"
	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/queue"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// IMPORTANT: This implementation uses Redis Pub/Sub for message queuing.
// In a production environment, it's recommended to use a dedicated Redis instance
// for queue operations, separate from the one used for caching.
// This separation helps to:
// 1. Prevent Pub/Sub operations from affecting cache performance
// 2. Allow independent scaling of cache and queue Redis instances
// 3. Isolate failures between cache and queue systems
// TODO: Create a separate Redis deployment for queue operations

// Queue implements the queue.Queue interface using Redis
type Queue struct {
	client *redis.Client
}

// NewQueue creates a new Redis queue
func NewQueue(cfg *config.Config) *Queue {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Cache.Address,
		Password: cfg.Cache.Password,
		DB:       cfg.Cache.DB,
	})

	return &Queue{
		client: client,
	}
}

// Publish publishes a message to a Redis channel
func (q *Queue) Publish(ctx context.Context, channel string, message interface{}) error {
	start := time.Now()

	data, err := json.Marshal(message)
	if err != nil {
		logger.Log.Error("Failed to marshal message",
			zap.String("channel", channel),
			zap.Error(err),
		)
		metrics.QueueOperationsTotal.WithLabelValues("publish", "error").Inc()
		return err
	}

	err = q.client.Publish(ctx, channel, data).Err()
	if err != nil {
		logger.Log.Error("Failed to publish message",
			zap.String("channel", channel),
			zap.Error(err),
		)
		metrics.QueueOperationsTotal.WithLabelValues("publish", "error").Inc()
		return err
	}

	metrics.QueueOperationsTotal.WithLabelValues("publish", "success").Inc()
	metrics.QueueOperationDuration.WithLabelValues("publish").Observe(time.Since(start).Seconds())

	return nil
}

// Subscribe subscribes to messages from a Redis channel
func (q *Queue) Subscribe(ctx context.Context, channel string, handler func(*queue.Message) error) error {
	pubsub := q.client.Subscribe(ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case msg := <-ch:
			start := time.Now()

			var message queue.Message
			if err := json.Unmarshal([]byte(msg.Payload), &message); err != nil {
				logger.Log.Error("Failed to unmarshal message",
					zap.String("channel", channel),
					zap.Error(err),
				)
				metrics.QueueOperationsTotal.WithLabelValues("subscribe", "error").Inc()
				continue
			}

			if err := handler(&message); err != nil {
				logger.Log.Error("Failed to handle message",
					zap.String("channel", channel),
					zap.Error(err),
				)
				metrics.QueueOperationsTotal.WithLabelValues("subscribe", "error").Inc()
				continue
			}

			metrics.QueueOperationsTotal.WithLabelValues("subscribe", "success").Inc()
			metrics.QueueOperationDuration.WithLabelValues("subscribe").Observe(time.Since(start).Seconds())

		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// Close closes the Redis connection
func (q *Queue) Close() error {
	return q.client.Close()
}
