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
    
    # Add a longer delay between requests
    sleep 2
}

# Create 15 random profiles
print_header "Creating 15 random profiles"
for i in $(seq 1 15); do
    make_request "POST" "/api/v1/profiles" \
        "{\"name\":\"User$i\",\"email\":\"user$i@example.com\",\"bio\":\"Bio for user $i\",\"skills\":[\"skill1\",\"skill2\"]}" \
        "Creating profile $i"
done

echo -e "\n${GREEN}Test completed!${NC}" 