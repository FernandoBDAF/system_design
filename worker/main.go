package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type DelayedTask struct {
	ID        string          `json:"id"`
	TaskType  string          `json:"task_type"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
}

type TaskResult struct {
	ID        string    `json:"id"`
	Result    string    `json:"result"`
	CreatedAt time.Time `json:"created_at"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func main() {
	// Start health check server
	go func() {
		http.HandleFunc("/health", healthHandler)
		log.Fatal(http.ListenAndServe(":8081", nil))
	}()

	// Initialize RabbitMQ connection
	conn, err := amqp.Dial(os.Getenv("RABBITMQ_URI"))
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open channel: %v", err)
	}
	defer ch.Close()

	// Declare queues
	taskQueue, err := ch.QueueDeclare(
		"delayed_tasks", // name
		true,            // durable
		false,           // delete when unused
		false,           // exclusive
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare queue: %v", err)
	}

	resultQueue, err := ch.QueueDeclare(
		"task_results", // name
		true,           // durable
		false,          // delete when unused
		false,          // exclusive
		false,          // no-wait
		nil,            // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare queue: %v", err)
	}

	msgs, err := ch.Consume(
		taskQueue.Name, // queue
		"",             // consumer
		true,           // auto-ack
		false,          // exclusive
		false,          // no-local
		false,          // no-wait
		nil,            // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			var task DelayedTask
			if err := json.Unmarshal(d.Body, &task); err != nil {
				log.Printf("Error unmarshaling task: %v", err)
				continue
			}

			// Process the task
			go processTask(context.Background(), task, ch, resultQueue.Name)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}

func processTask(ctx context.Context, task DelayedTask, ch *amqp.Channel, resultQueue string) {
	// Simulate processing delay
	time.Sleep(10 * time.Second)

	result := TaskResult{
		ID:        task.ID,
		Result:    "We waited 10 seconds",
		CreatedAt: time.Now(),
	}

	// Publish result to RabbitMQ
	resultJSON, _ := json.Marshal(result)
	err := ch.PublishWithContext(ctx,
		"",          // exchange
		resultQueue, // routing key
		false,       // mandatory
		false,       // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        resultJSON,
		})
	if err != nil {
		log.Printf("Error publishing result: %v", err)
	}
}
