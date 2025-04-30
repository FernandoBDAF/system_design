package redis

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	client *redis.Client
}

// NewClient creates a new Redis client
func NewClient(host string, port string, password string) (*Client, error) {
	addr := fmt.Sprintf("%s:%s", host, port)
	log.Printf("Connecting to Redis at %s", addr)

	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("ERROR: Failed to connect to Redis: %v", err)
		return nil, fmt.Errorf("failed to connect to Redis: %v", err)
	}

	log.Printf("Successfully connected to Redis at %s", addr)
	return &Client{client: client}, nil
}

// Close closes the Redis connection
func (c *Client) Close() error {
	log.Printf("Closing Redis connection")
	return c.client.Close()
}

// Ping checks if Redis is available
func (c *Client) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// IncrementCounter implements the sliding window counter algorithm with atomic operations
func (c *Client) IncrementCounter(ctx context.Context, key string, windowMinutes int) (int64, error) {
	log.Printf("Incrementing counter for key %s (window: %d minutes)", key, windowMinutes)

	// Check Redis connection status
	if err := c.client.Ping(ctx).Err(); err != nil {
		log.Printf("WARNING: Redis connection error during IncrementCounter: %v", err)
		return 0, fmt.Errorf("redis connection error: %v", err)
	}

	// Use Redis transaction to ensure atomicity
	txf := func(tx *redis.Tx) error {
		// Get the current count
		count, err := tx.Get(ctx, key).Int64()
		if err != nil && err != redis.Nil {
			log.Printf("ERROR: Failed to get counter value: %v", err)
			return err
		}

		// Increment the counter
		count++

		// Set the new count and expiration in a single transaction
		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, key, count, time.Duration(windowMinutes)*time.Minute)
			return nil
		})
		if err != nil {
			log.Printf("ERROR: Failed to execute transaction: %v", err)
		}
		return err
	}

	// Retry if the key has been modified
	for i := 0; i < 3; i++ {
		err := c.client.Watch(ctx, txf, key)
		if err == nil {
			// Success
			count, err := c.client.Get(ctx, key).Int64()
			if err != nil {
				log.Printf("ERROR: Failed to get final count: %v", err)
				return 0, fmt.Errorf("failed to get final count: %v", err)
			}
			log.Printf("Counter for key %s: %d", key, count)
			return count, nil
		}
		if err == redis.TxFailedErr {
			// Optimistic lock lost. Retry.
			log.Printf("WARNING: Transaction failed, retrying (attempt %d/3)", i+1)
			continue
		}
		// Return any other error
		log.Printf("ERROR: Redis operation failed: %v", err)
		return 0, err
	}

	log.Printf("ERROR: Increment failed after 3 attempts")
	return 0, fmt.Errorf("increment failed after 3 attempts")
}

// GetCounter returns the current count for a key
func (c *Client) GetCounter(ctx context.Context, key string, windowMinutes int) (int64, error) {
	log.Printf("Getting counter for key %s (window: %d minutes)", key, windowMinutes)

	// Check Redis connection status
	if err := c.client.Ping(ctx).Err(); err != nil {
		log.Printf("WARNING: Redis connection error during GetCounter: %v", err)
		return 0, fmt.Errorf("redis connection error: %v", err)
	}

	count, err := c.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		log.Printf("Counter for key %s does not exist", key)
		return 0, nil
	}
	if err != nil {
		log.Printf("ERROR: Failed to get counter: %v", err)
		return 0, fmt.Errorf("failed to get counter: %v", err)
	}

	log.Printf("Counter for key %s: %d", key, count)
	return count, nil
}
