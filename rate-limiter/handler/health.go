package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"rate-limiter/redis"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string `json:"status"`
	Redis     string `json:"redis"`
	Timestamp string `json:"timestamp"`
}

// HealthHandler handles health check requests
type HealthHandler struct {
	redisClient *redis.Client
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(redisClient *redis.Client) *HealthHandler {
	return &HealthHandler{
		redisClient: redisClient,
	}
}

// ServeHTTP implements http.Handler interface
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	response := HealthResponse{
		Status:    "ok",
		Redis:     "ok",
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Check Redis connection
	if err := h.redisClient.Ping(ctx); err != nil {
		response.Status = "degraded"
		response.Redis = "error"
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
