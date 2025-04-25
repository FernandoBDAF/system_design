package queue

import (
	"context"
	"encoding/json"
	"time"
)

// Message represents a queue message
type Message struct {
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
}

// Queue defines the interface for queue operations
type Queue interface {
	// Publish publishes a message to a queue
	Publish(ctx context.Context, channel string, message interface{}) error
	// Subscribe subscribes to messages from a queue
	Subscribe(ctx context.Context, channel string, handler func(*Message) error) error
	// Close closes the queue connection
	Close() error
}
