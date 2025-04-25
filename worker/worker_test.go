package main

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/fernandobarroso/profile-worker/internal/models"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/stretchr/testify/assert"
)

func TestWorker(t *testing.T) {
	// Initialize test worker
	worker := NewWorker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start worker in a goroutine
	go worker.Start(ctx)

	// Connect to RabbitMQ
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	assert.NoError(t, err)
	defer conn.Close()

	ch, err := conn.Channel()
	assert.NoError(t, err)
	defer ch.Close()

	// Declare test queue
	q, err := ch.QueueDeclare(
		"tasks", // Use the same queue name as the worker
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
	)
	assert.NoError(t, err)

	// Publish test task
	task := models.Task{
		ID:        "test-task-1",
		Type:      "test",
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	body, err := json.Marshal(task)
	assert.NoError(t, err)

	err = ch.PublishWithContext(ctx,
		"",     // exchange
		q.Name, // routing key
		false,  // mandatory
		false,  // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})
	assert.NoError(t, err)

	// Wait for task processing
	time.Sleep(2 * time.Second)

	// Verify task was processed
	processedTask, err := worker.store.GetTask(ctx, task.ID)
	assert.NoError(t, err)
	assert.Equal(t, "completed", processedTask.Status)
	assert.NotEmpty(t, processedTask.CompletedAt)
}

func TestWorkerErrorHandling(t *testing.T) {
	// Initialize test worker
	worker := NewWorker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start worker in a goroutine
	go worker.Start(ctx)

	// Connect to RabbitMQ
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	assert.NoError(t, err)
	defer conn.Close()

	ch, err := conn.Channel()
	assert.NoError(t, err)
	defer ch.Close()

	// Declare test queue
	q, err := ch.QueueDeclare(
		"tasks", // Use the same queue name as the worker
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
	)
	assert.NoError(t, err)

	// Publish invalid task
	invalidTask := struct {
		InvalidField string `json:"invalid_field"`
	}{
		InvalidField: "invalid",
	}

	body, err := json.Marshal(invalidTask)
	assert.NoError(t, err)

	err = ch.PublishWithContext(ctx,
		"",     // exchange
		q.Name, // routing key
		false,  // mandatory
		false,  // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})
	assert.NoError(t, err)

	// Wait for task processing
	time.Sleep(2 * time.Second)

	// Verify error was logged
	// Note: In a real test, you would want to capture and verify the logs
	// This is just a placeholder to show where you would verify error handling
}

func TestWorkerConcurrency(t *testing.T) {
	// Initialize test worker
	worker := NewWorker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start worker in a goroutine
	go worker.Start(ctx)

	// Connect to RabbitMQ
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	assert.NoError(t, err)
	defer conn.Close()

	ch, err := conn.Channel()
	assert.NoError(t, err)
	defer ch.Close()

	// Declare test queue
	q, err := ch.QueueDeclare(
		"tasks", // Use the same queue name as the worker
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
	)
	assert.NoError(t, err)

	// Publish multiple tasks
	numTasks := 10
	tasks := make([]string, numTasks)
	for i := 0; i < numTasks; i++ {
		taskID := fmt.Sprintf("test-task-%d", i)
		tasks[i] = taskID

		task := models.Task{
			ID:        taskID,
			Type:      "test",
			Status:    "pending",
			CreatedAt: time.Now(),
		}

		body, err := json.Marshal(task)
		assert.NoError(t, err)

		err = ch.PublishWithContext(ctx,
			"",     // exchange
			q.Name, // routing key
			false,  // mandatory
			false,  // immediate
			amqp.Publishing{
				ContentType: "application/json",
				Body:        body,
			})
		assert.NoError(t, err)
	}

	// Wait for all tasks to be processed with timeout
	timeout := time.After(10 * time.Second)
	tick := time.Tick(500 * time.Millisecond)

	for {
		select {
		case <-timeout:
			t.Fatal("Timeout waiting for tasks to complete")
		case <-tick:
			allCompleted := true
			for _, taskID := range tasks {
				task, err := worker.store.GetTask(ctx, taskID)
				if err != nil || task.Status != "completed" {
					allCompleted = false
					break
				}
			}
			if allCompleted {
				goto verification
			}
		}
	}

verification:
	// Verify all tasks were processed
	for _, taskID := range tasks {
		processedTask, err := worker.store.GetTask(ctx, taskID)
		assert.NoError(t, err)
		assert.Equal(t, "completed", processedTask.Status)
		assert.NotEmpty(t, processedTask.CompletedAt)
	}
}
