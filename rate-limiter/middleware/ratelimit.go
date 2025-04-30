package middleware

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"rate-limiter/redis"
)

// RateLimiterConfig holds the configuration for the rate limiter
type RateLimiterConfig struct {
	RedisClient   *redis.Client
	RateLimit     int
	WindowMinutes int
	HeaderPrefix  string
	ErrorHandler  http.HandlerFunc
}

// RateLimiter is a middleware that limits the number of requests per IP address
func RateLimiter(config RateLimiterConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get the client IP using the helper function
			clientIP := getClientIP(r)

			log.Printf("Processing request from IP: %s", clientIP)

			// Try to get the current count from Redis
			count, err := config.RedisClient.GetCounter(r.Context(), clientIP, config.WindowMinutes)
			if err != nil {
				log.Printf("WARNING: Redis error during rate limit check for IP %s: %v", clientIP, err)
				// Continue without rate limiting if Redis is unavailable
				next.ServeHTTP(w, r)
				return
			}

			// Check if we should increment the counter
			if count < int64(config.RateLimit) {
				// Increment the counter
				newCount, err := config.RedisClient.IncrementCounter(r.Context(), clientIP, config.WindowMinutes)
				if err != nil {
					log.Printf("WARNING: Redis error during counter increment for IP %s: %v", clientIP, err)
					// Continue without rate limiting if Redis is unavailable
					next.ServeHTTP(w, r)
					return
				}

				// Set rate limit headers
				w.Header().Set(config.HeaderPrefix+"Limit", strconv.Itoa(config.RateLimit))
				w.Header().Set(config.HeaderPrefix+"Remaining", strconv.Itoa(config.RateLimit-int(newCount)))
				w.Header().Set(config.HeaderPrefix+"Reset", strconv.FormatInt(time.Now().Add(time.Duration(config.WindowMinutes)*time.Minute).Unix(), 10))

				log.Printf("Request allowed for IP %s (count: %d/%d)", clientIP, newCount, config.RateLimit)
				next.ServeHTTP(w, r)
				return
			}

			// Rate limit exceeded
			log.Printf("Rate limit exceeded for IP %s (count: %d/%d)", clientIP, count, config.RateLimit)

			// Calculate retry after time
			windowEnd := time.Now().Add(time.Duration(config.WindowMinutes) * time.Minute)
			retryAfter := int(windowEnd.Sub(time.Now()).Seconds())

			// Set rate limit headers
			w.Header().Set(config.HeaderPrefix+"Limit", strconv.Itoa(config.RateLimit))
			w.Header().Set(config.HeaderPrefix+"Remaining", "0")
			w.Header().Set(config.HeaderPrefix+"Reset", strconv.FormatInt(windowEnd.Unix(), 10))
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))

			// Call error handler if provided, otherwise return 429
			if config.ErrorHandler != nil {
				config.ErrorHandler(w, r)
			} else {
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			}
		})
	}
}

// getClientIP returns the client IP address, preferring X-Forwarded-For header
func getClientIP(r *http.Request) string {
	// Try to get the IP from X-Forwarded-For header
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		// Get the first IP in the list (client IP)
		ips := strings.Split(forwardedFor, ",")
		return strings.TrimSpace(ips[0])
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}
