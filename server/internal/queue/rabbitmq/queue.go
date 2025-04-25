package rabbitmq

import (
	"context"
	"encoding/json"
	"time"

	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/logger"
	"github.com/fernandobarroso/profile-service/internal/metrics"
	"github.com/fernandobarroso/profile-service/internal/queue"
	"github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// Queue implements the queue.Queue interface using RabbitMQ
type Queue struct {
	conn    *amqp091.Connection
	channel *amqp091.Channel
}

// NewQueue creates a new RabbitMQ queue
func NewQueue(cfg *config.Config) (*Queue, error) {
	conn, err := amqp091.Dial(cfg.Queue.URI)
	if err != nil {
		return nil, err
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	return &Queue{
		conn:    conn,
		channel: channel,
	}, nil
}

// Publish publishes a message to a RabbitMQ queue
func (q *Queue) Publish(ctx context.Context, queueName string, message interface{}) error {
	// Skip publishing if channel is not initialized
	if q == nil || q.channel == nil {
		return nil
	}

	start := time.Now()

	data, err := json.Marshal(message)
	if err != nil {
		logger.Log.Error("Failed to marshal message",
			zap.String("queue", queueName),
			zap.Error(err),
		)
		metrics.QueueOperationsTotal.WithLabelValues("publish", "error").Inc()
		return err
	}

	err = q.channel.PublishWithContext(ctx,
		"",        // exchange
		queueName, // routing key
		false,     // mandatory
		false,     // immediate
		amqp091.Publishing{
			ContentType: "application/json",
			Body:        data,
		},
	)

	if err != nil {
		logger.Log.Error("Failed to publish message",
			zap.String("queue", queueName),
			zap.Error(err),
		)
		metrics.QueueOperationsTotal.WithLabelValues("publish", "error").Inc()
		return err
	}

	metrics.QueueOperationsTotal.WithLabelValues("publish", "success").Inc()
	metrics.QueueOperationDuration.WithLabelValues("publish").Observe(time.Since(start).Seconds())

	return nil
}

// Subscribe subscribes to messages from a RabbitMQ queue
func (q *Queue) Subscribe(ctx context.Context, queueName string, handler func(*queue.Message) error) error {
	// Declare the queue
	_, err := q.channel.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		return err
	}

	msgs, err := q.channel.Consume(
		queueName, // queue
		"",        // consumer
		true,      // auto-ack
		false,     // exclusive
		false,     // no-local
		false,     // no-wait
		nil,       // args
	)
	if err != nil {
		return err
	}

	for {
		select {
		case msg := <-msgs:
			start := time.Now()

			var message queue.Message
			if err := json.Unmarshal(msg.Body, &message); err != nil {
				logger.Log.Error("Failed to unmarshal message",
					zap.String("queue", queueName),
					zap.Error(err),
				)
				metrics.QueueOperationsTotal.WithLabelValues("subscribe", "error").Inc()
				continue
			}

			if err := handler(&message); err != nil {
				logger.Log.Error("Failed to handle message",
					zap.String("queue", queueName),
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

// Close closes the RabbitMQ connection and channel
func (q *Queue) Close() error {
	if err := q.channel.Close(); err != nil {
		return err
	}
	return q.conn.Close()
}
