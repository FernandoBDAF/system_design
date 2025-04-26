#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server URL
SERVER_URL="http://localhost:8080"

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to print cache metrics
print_cache_metrics() {
    echo -e "\n${BLUE}Cache Metrics:${NC}"
    curl -s "$SERVER_URL/metrics" | grep -E "cache_(hits|misses|evictions|errors)_total"
}

# Function to print detailed cache metrics
print_detailed_cache_metrics() {
    echo -e "\n${BLUE}Detailed Cache Metrics:${NC}"
    curl -s "$SERVER_URL/metrics" | grep -E "cache_|go_memstats_mcache"
}

# Function to make API calls and print results with cache metrics
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${GREEN}$description${NC}"
    
    # Print cache metrics before request
    print_cache_metrics
    
    # Get start time
    start_time=$(date +%s.%N)
    
    if [ -n "$data" ]; then
        response=$(curl -X $method "$SERVER_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -s -w "\n%{http_code}\n%{time_total}\n")
    else
        response=$(curl -X $method "$SERVER_URL$endpoint" \
            -s -w "\n%{http_code}\n%{time_total}\n")
    fi
    
    # Get end time and calculate duration
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    # Split response into parts
    body=$(echo "$response" | sed '$d' | sed '$d')
    status_code=$(echo "$response" | tail -n 2 | head -n 1)
    curl_time=$(echo "$response" | tail -n 1)
    
    # Print response details
    echo -e "${BLUE}Status: $status_code${NC}"
    echo -e "${BLUE}Response Time: ${curl_time}s${NC}"
    echo -e "${BLUE}Total Time: ${duration}s${NC}"
    
    # Print response body with source information
    echo -e "${BLUE}Response Body:${NC}"
    if [ -n "$body" ]; then
        source=$(echo "$body" | jq -r '.source // "unknown"')
        echo -e "${BLUE}Source: $source${NC}"
        echo "$body" | jq
    else
        echo "No response body"
    fi
    
    # Print cache metrics after request
    print_cache_metrics
    
    # Add delay between requests
    sleep 1
}

# Test 1: Initial cache metrics
print_header "Initial Cache Metrics"
print_detailed_cache_metrics

# Test 2: Create and cache a new profile
print_header "Creating and Caching New Profile"
make_request "POST" "/api/v1/profiles/random" "" "Creating random profile"

# Get the ID of the newly created profile
PROFILE_ID=$(curl -s "$SERVER_URL/api/v1/profiles" | jq -r '.[0].id')
if [ -z "$PROFILE_ID" ]; then
    echo -e "${RED}Failed to get profile ID${NC}"
    exit 1
fi

# Test 3: Cache hit/miss test
print_header "Cache Hit/Miss Test"
echo -e "${BLUE}Testing cache behavior for profile $PROFILE_ID${NC}"

# First request (should be cache miss)
make_request "GET" "/api/v1/profiles/$PROFILE_ID" "" "First profile request (EXPECTED: cache miss, source: database)"

# Second request (should be cache hit)
make_request "GET" "/api/v1/profiles/$PROFILE_ID" "" "Second profile request (EXPECTED: cache hit, source: cache)"

# Third request (should be cache hit)
make_request "GET" "/api/v1/profiles/$PROFILE_ID" "" "Third profile request (EXPECTED: cache hit, source: cache)"

# Test 4: Cache invalidation test
print_header "Cache Invalidation Test"
echo -e "${BLUE}Testing cache invalidation after profile update${NC}"

# Update profile (should invalidate cache)
make_request "PUT" "/api/v1/profiles/$PROFILE_ID" \
    "{\"name\":\"Updated User\",\"email\":\"updated@example.com\",\"bio\":\"Updated bio\"}" \
    "Updating profile (EXPECTED: cache invalidation)"

# Verify cache state after update
make_request "GET" "/api/v1/profiles/$PROFILE_ID" "" "Getting updated profile (EXPECTED: cache miss, source: database)"

# Test 5: Cache eviction test
print_header "Cache Eviction Test"
echo -e "${BLUE}Testing cache eviction with multiple profiles${NC}"

# Create multiple profiles to fill cache
for i in {1..5}; do
    make_request "POST" "/api/v1/profiles/random" "" "Creating profile $i to fill cache"
done

# Get all profile IDs
PROFILE_IDS=$(curl -s "$SERVER_URL/api/v1/profiles" | jq -r '.[].id')

# Request profiles in sequence to test cache behavior
echo -e "${BLUE}Testing cache behavior with multiple profiles${NC}"
for id in $PROFILE_IDS; do
    make_request "GET" "/api/v1/profiles/$id" "" "Getting profile $id (testing cache behavior)"
done

# Request same profiles again to verify cache hits
echo -e "${BLUE}Verifying cache hits for previously requested profiles${NC}"
for id in $PROFILE_IDS; do
    make_request "GET" "/api/v1/profiles/$id" "" "Getting profile $id again (EXPECTED: cache hit)"
done

# Test 6: Cache error handling
print_header "Cache Error Handling Test"
make_request "GET" "/api/v1/profiles/nonexistent-id" "" "Requesting non-existent profile (testing error handling)"

# Final cache metrics summary
print_header "Final Cache Metrics Summary"
print_detailed_cache_metrics

echo -e "\n${GREEN}Cache test completed!${NC}" 