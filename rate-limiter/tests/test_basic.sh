#!/bin/bash

source ./common.sh

echo "=== Test 1: Basic Rate Limiting ==="
echo "Testing $REQUESTS requests with $DELAY second delay between them"
echo "Expected: First $RATE_LIMIT requests should succeed, rest should be rate limited"
echo "----------------------------------------"

for i in $(seq 1 $REQUESTS); do
    echo "Request $i:"
    show_headers -H "X-Forwarded-For: 192.168.1.1" http://localhost:8080/rate-limit
    echo "----------------------------------------"
    sleep $DELAY
done 