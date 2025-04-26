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

# Function to print metrics by type
print_metrics() {
    local metric_type=$1
    echo -e "\n${BLUE}$metric_type Metrics:${NC}"
    case $metric_type in
        "HTTP")
            curl -s "$SERVER_URL/metrics" | grep -E "http_(requests_total|request_duration_seconds)"
            ;;
        "Database")
            curl -s "$SERVER_URL/metrics" | grep -E "db_(operations_total|operation_duration_seconds)"
            ;;
        "Memory")
            curl -s "$SERVER_URL/metrics" | grep -E "go_memstats_(alloc|heap|stack)_bytes"
            ;;
        "All")
            curl -s "$SERVER_URL/metrics"
            ;;
    esac
}

# Function to make API calls and print results with metrics
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${GREEN}$description${NC}"
    
    # Print metrics before request
    echo -e "\n${BLUE}Metrics before request:${NC}"
    print_metrics "HTTP"
    print_metrics "Database"
    
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
    
    # Print response body
    echo -e "${BLUE}Response Body:${NC}"
    if [ -n "$body" ]; then
        echo "$body" | jq
    else
        echo "No response body"
    fi
    
    # Print metrics after request
    echo -e "\n${BLUE}Metrics after request:${NC}"
    print_metrics "HTTP"
    print_metrics "Database"
    
    # Add delay between requests
    sleep 2
}

# Test 1: Initial metrics baseline
print_header "Initial Metrics Baseline"
print_metrics "All"

# Test 2: Create and monitor a new profile
print_header "Creating and Monitoring New Profile"
make_request "POST" "/api/v1/profiles/random" "" "Creating random profile"

# Test 3: Database operation metrics test
print_header "Database Operation Metrics Test"
# Get the ID of the last created profile
PROFILE_ID=$(curl -s "$SERVER_URL/api/v1/profiles" | jq -r '.[0].id')

# Get profile (should trigger database operation)
make_request "GET" "/api/v1/profiles/$PROFILE_ID" "" "Getting profile (testing database metrics)"

# Test 4: Update operation metrics test
print_header "Update Operation Metrics Test"
make_request "PUT" "/api/v1/profiles/$PROFILE_ID" \
    "{\"name\":\"Updated User\",\"email\":\"updated@example.com\",\"bio\":\"Updated bio\"}" \
    "Updating profile (testing update metrics)"

# Test 5: Error metrics test
print_header "Error Metrics Test"
make_request "GET" "/api/v1/profiles/nonexistent-id" "" "Requesting non-existent profile (testing error metrics)"

# Test 6: Memory metrics
print_header "Memory Metrics"
print_metrics "Memory"

# Test 7: Database metrics
print_header "Database Operation Metrics"
print_metrics "Database"

# Final metrics summary
print_header "Final Metrics Summary"
print_metrics "All"

echo -e "\n${GREEN}Monitoring test completed!${NC}" 