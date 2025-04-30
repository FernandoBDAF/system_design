package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the rate limiter service
type Config struct {
	// Service configuration
	ServicePort string
	BackendURL  string

	// Rate limiting configuration
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// Redis configuration
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Logging configuration
	LogLevel string
}

// NewConfig creates a new configuration with defaults and environment overrides
func NewConfig() (*Config, error) {
	config := &Config{
		// Service defaults
		ServicePort: getEnvOrDefault("SERVICE_PORT", "8080"),
		BackendURL:  getEnvOrDefault("BACKEND_SERVER_URL", "http://localhost:8081"),

		// Rate limiting defaults
		RateLimitRequests: getEnvOrDefaultInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   time.Duration(getEnvOrDefaultInt("RATE_LIMIT_WINDOW_MINUTES", 1)) * time.Minute,

		// Redis defaults
		RedisHost:     getEnvOrDefault("REDIS_HOST", "localhost"),
		RedisPort:     getEnvOrDefault("REDIS_PORT", "6379"),
		RedisPassword: getEnvOrDefault("REDIS_PASSWORD", ""),
		RedisDB:       getEnvOrDefaultInt("REDIS_DB", 0),

		// Logging defaults
		LogLevel: getEnvOrDefault("LOG_LEVEL", "info"),
	}

	if err := config.validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return config, nil
}

// validate checks if the configuration is valid
func (c *Config) validate() error {
	if c.ServicePort == "" {
		return fmt.Errorf("service port is required")
	}

	if c.BackendURL == "" {
		return fmt.Errorf("backend URL is required")
	}

	if c.RateLimitRequests <= 0 {
		return fmt.Errorf("rate limit requests must be positive")
	}

	if c.RateLimitWindow <= 0 {
		return fmt.Errorf("rate limit window must be positive")
	}

	if c.RedisHost == "" {
		return fmt.Errorf("redis host is required")
	}

	if c.RedisPort == "" {
		return fmt.Errorf("redis port is required")
	}

	return nil
}

// getEnvOrDefault returns the environment variable value or the default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvOrDefaultInt returns the environment variable value as int or the default
func getEnvOrDefaultInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
		log.Printf("WARNING: Invalid value for %s, using default: %d", key, defaultValue)
	}
	return defaultValue
}
