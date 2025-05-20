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

	"github.com/fernandobarroso/profile-service/internal/api/handler"
	"github.com/fernandobarroso/profile-service/internal/api/middleware/logger"
	"github.com/fernandobarroso/profile-service/internal/api/middleware/metrics"
	"github.com/fernandobarroso/profile-service/internal/api/router"
	"github.com/fernandobarroso/profile-service/internal/api/service"
	"github.com/fernandobarroso/profile-service/internal/cache"
	"github.com/fernandobarroso/profile-service/internal/cache/redis"
	"github.com/fernandobarroso/profile-service/internal/config"
	"github.com/fernandobarroso/profile-service/internal/queue/rabbitmq"
	"github.com/fernandobarroso/profile-service/internal/repository/postgresql"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger first
	if err := logger.InitLogger(); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	logger.Log.Info("Logger initialized")
	defer logger.Log.Sync()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Log.Fatal("Failed to load configuration", zap.Error(err))
	}

	logger.Log.Info("Configuration loaded", zap.Any("config", cfg))

	// Initialize repository
	profileRepo, err := postgresql.NewRepository(cfg)
	if err != nil {
		logger.Log.Fatal("Failed to create PostgreSQL repository", zap.Error(err))
	}
	logger.Log.Info("PostgreSQL repository created")
	defer profileRepo.Close(context.Background())

	// Initialize Redis client
	var cacheImpl cache.Cache
	redisClient, err := redis.NewClient(cfg)
	if err != nil {
		logger.Log.Warn("Failed to initialize Redis client, continuing without cache", zap.Error(err))
		cacheImpl = cache.NewMemoryCache()
	} else {
		logger.Log.Info("Redis client initialized")
		cacheImpl = redisClient
	}

	// Initialize RabbitMQ connection
	rabbitConn, err := rabbitmq.NewQueue(cfg)
	if err != nil {
		logger.Log.Warn("Failed to connect to RabbitMQ, continuing without queue", zap.Error(err))
	} else {
		logger.Log.Info("RabbitMQ connection initialized")
	}

	// Initialize components
	profileService := service.NewProfileService(profileRepo, cacheImpl, rabbitConn)
	profileHandler := handler.NewProfileHandler(profileService)

	// Initialize Gin router
	router := router.SetupRouter(profileHandler)

	// Get pod name from environment
	podName := os.Getenv("POD_NAME")
	if podName == "" {
		podName = "unknown"
	}
	logger.Log.Info("Pod name", zap.String("podName", podName))

	// Add middleware for logging, metrics, and pod name header
	router.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		// Set pod name header
		c.Header("X-Pod-Name", podName)

		c.Next()

		status := c.Writer.Status()
		method := c.Request.Method

		// Log request
		logger.Log.Info("HTTP request",
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("duration", time.Since(start)),
		)

		// Record metrics
		metrics.HttpRequestsTotal.WithLabelValues(method, path, fmt.Sprint(status)).Inc()
		metrics.HttpRequestDuration.WithLabelValues(method, path).Observe(time.Since(start).Seconds())
	})

	// Add metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Start server
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	// Close connections
	if redisClient != nil {
		if err := redisClient.Close(); err != nil {
			logger.Log.Error("Failed to close Redis connection", zap.Error(err))
		}
		logger.Log.Info("Redis connection closed")
	}
	if rabbitConn != nil {
		if err := rabbitConn.Close(); err != nil {
			logger.Log.Error("Failed to close RabbitMQ connection", zap.Error(err))
		}
		logger.Log.Info("RabbitMQ connection closed")
	}

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Log.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Log.Info("Server exiting")
}
