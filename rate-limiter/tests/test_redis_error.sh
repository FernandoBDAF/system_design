#!/bin/bash

source ./common.sh

echo "=== Test 4: Error Handling ==="
echo "Testing system behavior when Redis is unavailable"
echo "Expected: System should handle Redis failures gracefully"
echo "----------------------------------------"

echo "Stopping Redis container..."
docker-compose stop redis

echo "Testing requests during Redis downtime..."
echo "Note: System should log Redis connection errors and continue accepting requests"
for i in {1..3}; do
    echo "Request $i:"
    show_headers -H "X-Forwarded-For: 192.168.4.200" http://localhost:8080/rate-limit
    echo "----------------------------------------"
done

echo "Restarting Redis container..."
docker-compose start redis
sleep 5  # Wait for Redis to be ready

echo "Testing requests after Redis recovery..."
show_headers -H "X-Forwarded-For: 192.168.4.200" http://localhost:8080/rate-limit 