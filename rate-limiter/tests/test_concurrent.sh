#!/bin/bash

source ./common.sh

echo "=== Test 2: Concurrent Requests ==="
echo "Testing multiple concurrent requests from different IPs"
echo "Expected: Each IP should be rate limited independently"
echo "----------------------------------------"

# Wait for any previous rate limits to expire
wait_for_window_reset

for i in {1..3}; do
    IP="192.168.2.$i"  # Using different IP range to avoid conflicts
    echo "Testing IP: $IP"
    for j in {1..6}; do
        echo "Request $j for $IP:"
        show_headers -H "X-Forwarded-For: $IP" http://localhost:8080/rate-limit
        echo "----------------------------------------"
    done
    echo
done 