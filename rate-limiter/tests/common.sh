#!/bin/bash

# Common test parameters
REQUESTS=10
DELAY=0.1
RATE_LIMIT=5
WINDOW_MINUTES=1

# Function to show all relevant headers
show_headers() {
    curl -v "$@" 2>&1 | grep -E "HTTP/1.1|X-RateLimit|Retry-After|Error|Warning"
}

# Function to wait for rate limit window to reset
wait_for_window_reset() {
    echo "Waiting for rate limit window to reset ($WINDOW_MINUTES minute)..."
    sleep $(($WINDOW_MINUTES * 60))
} 