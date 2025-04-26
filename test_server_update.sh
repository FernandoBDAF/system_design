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

# Function to make API calls and print results
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${GREEN}$description${NC}"
    
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
    
    # Always print response body
    echo -e "${BLUE}Response Body:${NC}"
    if [ -n "$body" ]; then
        echo "$body" | jq
    else
        echo "No response body"
    fi
    
    # Add a delay between requests
    sleep 1
}

# Get list of profile IDs
PROFILE_IDS=$(curl -s "$SERVER_URL/api/v1/profiles" | jq -r '.[].id' | head -n 3)

# Test 1: Get initial profiles
print_header "Getting initial profiles"
for id in $PROFILE_IDS; do
    make_request "GET" "/api/v1/profiles/$id" "" "Getting initial profile $id"
done

# Test 2: Update profiles with different fields
print_header "Updating profiles with different fields"
for id in $PROFILE_IDS; do
    # Update name and bio
    make_request "PUT" "/api/v1/profiles/$id" \
        "{\"name\":\"Updated Name $id\",\"bio\":\"Updated bio for $id\"}" \
        "Updating name and bio for profile $id"
    
    # Update email with timestamp to ensure uniqueness
    timestamp=$(date +%s)
    make_request "PUT" "/api/v1/profiles/$id" \
        "{\"email\":\"updated.$timestamp.$id@example.com\"}" \
        "Updating email for profile $id"
    
    # Update image_urls
    make_request "PUT" "/api/v1/profiles/$id" \
        "{\"image_urls\":[\"https://example.com/updated1.jpg\",\"https://example.com/updated2.jpg\"]}" \
        "Updating image_urls for profile $id"
done

# Test 3: Verify updates
print_header "Verifying updates"
for id in $PROFILE_IDS; do
    make_request "GET" "/api/v1/profiles/$id" "" "Verifying updates for profile $id"
done

# Test 4: Test partial updates
print_header "Testing partial updates"
for id in $PROFILE_IDS; do
    # Update only name
    make_request "PUT" "/api/v1/profiles/$id" \
        "{\"name\":\"Partial Update $id\"}" \
        "Updating only name for profile $id"
    
    # Verify only name was updated
    make_request "GET" "/api/v1/profiles/$id" "" "Verifying partial update for profile $id"
done

echo -e "\n${GREEN}Update tests completed!${NC}" 