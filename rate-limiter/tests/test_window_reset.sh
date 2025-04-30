#!/bin/bash

source ./common.sh

echo "=== Test 3: Window Reset ==="
echo "Testing rate limit window reset after expiration"
echo "Expected: After window expires, requests should be allowed again"
echo "----------------------------------------"

# First, use up the rate limit
echo "Using up rate limit..."
for i in {1..5}; do
    curl -s -H "X-Forwarded-For: 192.168.3.100" http://localhost:8080/rate-limit > /dev/null
done

# Verify we're rate limited
echo "Verifying rate limit is enforced..."
show_headers -H "X-Forwarded-For: 192.168.3.100" http://localhost:8080/rate-limit

# Wait for window to reset
wait_for_window_reset

echo "Testing after window reset..."
show_headers -H "X-Forwarded-For: 192.168.3.100" http://localhost:8080/rate-limit 