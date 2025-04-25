package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fernandobarroso/profile-worker/internal/models"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Worker represents a worker that processes tasks from RabbitMQ
type Worker struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   amqp.Queue
	store   TaskStore
}

// TaskStore represents the interface for storing tasks
type TaskStore interface {
	GetTask(ctx context.Context, id string) (*models.Task, error)
	SaveTask(ctx context.Context, task *models.Task) error
}

// MemoryTaskStore implements TaskStore using in-memory storage
type MemoryTaskStore struct {
	tasks map[string]*models.Task
	mu    sync.RWMutex
}

// NewMemoryTaskStore creates a new memory task store
func NewMemoryTaskStore() *MemoryTaskStore {
	return &MemoryTaskStore{
		tasks: make(map[string]*models.Task),
	}
}

func (s *MemoryTaskStore) GetTask(ctx context.Context, id string) (*models.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, exists := s.tasks[id]
	if !exists {
		return nil, fmt.Errorf("task not found")
	}
	return task, nil
}

func (s *MemoryTaskStore) SaveTask(ctx context.Context, task *models.Task) error {
	if task == nil {
		return fmt.Errorf("cannot save nil task")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks[task.ID] = task
	return nil
}

// NewWorker creates a new worker instance
func NewWorker() *Worker {
	// Connect to RabbitMQ
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}

	// Declare the queue
	q, err := ch.QueueDeclare(
		"tasks", // queue name
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	return &Worker{
		conn:    conn,
		channel: ch,
		queue:   q,
		store:   NewMemoryTaskStore(),
	}
}

// Start begins processing tasks from the queue
func (w *Worker) Start(ctx context.Context) {
	msgs, err := w.channel.Consume(
		w.queue.Name, // queue
		"",           // consumer
		true,         // auto-ack
		false,        // exclusive
		false,        // no-local
		false,        // no-wait
		nil,          // args
	)
	if err != nil {
		log.Printf("Failed to register a consumer: %v", err)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-msgs:
			go w.processTask(ctx, msg)
		}
	}
}

func (w *Worker) processTask(ctx context.Context, msg amqp.Delivery) {
	var task models.Task
	if err := json.Unmarshal(msg.Body, &task); err != nil {
		log.Printf("Error decoding task: %v", err)
		return
	}

	// Update task status
	task.Status = "processing"
	if err := w.store.SaveTask(ctx, &task); err != nil {
		log.Printf("Error saving task: %v", err)
		return
	}

	// Simulate task processing
	time.Sleep(1 * time.Second)

	// Update task status to completed
	task.Status = "completed"
	task.CompletedAt = time.Now()
	if err := w.store.SaveTask(ctx, &task); err != nil {
		log.Printf("Error saving task: %v", err)
		return
	}
}

// Close closes the RabbitMQ connection
func (w *Worker) Close() {
	if w.channel != nil {
		w.channel.Close()
	}
	if w.conn != nil {
		w.conn.Close()
	}
}
