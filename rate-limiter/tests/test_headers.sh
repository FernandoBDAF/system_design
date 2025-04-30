#!/bin/bash

source ./common.sh

echo "=== Test 5: Header Validation ==="
echo "Testing rate limit headers are correctly set"
echo "Expected: All rate limit headers should be present and correct"
echo "----------------------------------------"

echo "Making initial request..."
show_headers -H "X-Forwarded-For: 192.168.5.300" http://localhost:8080/rate-limit

echo "Making subsequent requests..."
for i in {1..4}; do
    echo "Request $i:"
    show_headers -H "X-Forwarded-For: 192.168.5.300" http://localhost:8080/rate-limit
    echo "----------------------------------------"
done 