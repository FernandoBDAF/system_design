package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

type Config struct {
	Server struct {
		Port string
	}
	Database struct {
		URI      string
		Database string
		Timeout  time.Duration
	}
	Cache struct {
		Address  string
		Password string
		DB       int
	}
	Queue struct {
		URI      string
		Username string
		Password string
	}
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		zap.L().Warn("No .env file found")
	}

	cfg := &Config{}

	// Server configuration
	cfg.Server.Port = getEnv("SERVER_PORT", "8080")

	// Database configuration
	cfg.Database.URI = getEnv("DB_URI", "postgres://profile:profile123@postgres:5432/profile_service")
	cfg.Database.Database = getEnv("DB_NAME", "profile_service")
	timeout, err := time.ParseDuration(getEnv("DB_TIMEOUT", "10s"))
	if err != nil {
		return nil, err
	}
	cfg.Database.Timeout = timeout

	// Cache configuration
	cfg.Cache.Address = getEnv("REDIS_HOST", "redis") + ":" + getEnv("REDIS_PORT", "6379")
	cfg.Cache.Password = getEnv("REDIS_PASSWORD", "")
	cfg.Cache.DB = getEnvAsInt("REDIS_DB", 0)

	// Queue configuration
	cfg.Queue.URI = getEnv("RABBITMQ_URI", "amqp://user:password@rabbitmq:5672/")
	cfg.Queue.Username = getEnv("RABBITMQ_USERNAME", "user")
	cfg.Queue.Password = getEnv("RABBITMQ_PASSWORD", "password")

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
