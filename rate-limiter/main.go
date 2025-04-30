package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"rate-limiter/config"
	"rate-limiter/handler"
	"rate-limiter/middleware"
	"rate-limiter/redis"
)

func main() {
	// Load configuration
	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize Redis client
	redisClient, err := redis.NewClient(cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Create rate limiter configuration
	rateLimiterConfig := middleware.RateLimiterConfig{
		RedisClient:   redisClient,
		RateLimit:     cfg.RateLimitRequests,
		WindowMinutes: int(cfg.RateLimitWindow.Minutes()),
		HeaderPrefix:  "X-RateLimit-",
		ErrorHandler:  nil,
	}

	// Create handler
	rateLimiterHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Rate Limiter Service is running!\n")
		fmt.Fprintf(w, "Request from: %s\n", r.RemoteAddr)
	})

	// Register health handler
	healthHandler := handler.NewHealthHandler(redisClient)
	http.Handle("/health", healthHandler)

	// Wrap handler with rate limiter middleware
	http.Handle("/rate-limit", middleware.RateLimiter(rateLimiterConfig)(rateLimiterHandler))

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":" + cfg.ServicePort,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Channel to listen for errors coming from the listener
	serverErrors := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %s", cfg.ServicePort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErrors <- err
		}
	}()

	// Channel to listen for interrupt signals
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	// Block until we receive a signal or error
	select {
	case err := <-serverErrors:
		log.Printf("Error starting server: %v", err)
		os.Exit(1)

	case sig := <-shutdown:
		log.Printf("Received signal %v, starting graceful shutdown", sig)

		// Create a context with timeout for shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// Attempt graceful shutdown
		if err := server.Shutdown(ctx); err != nil {
			log.Printf("Graceful shutdown failed: %v", err)
			if err := server.Close(); err != nil {
				log.Printf("Forced shutdown failed: %v", err)
			}
		}

		log.Println("Server shutdown complete")
	}
}
