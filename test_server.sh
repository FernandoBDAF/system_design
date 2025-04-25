#!/bin/bash

# Function to make HTTP requests with curl and pretty print the response
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "\n\033[1;34m$description\033[0m"
    echo "Request: $method $url"
    if [ ! -z "$data" ]; then
        echo "Data: $data"
    fi
    
    local response
    local status
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo -e "\nStatus: $status"
    if [ ! -z "$body" ]; then
        echo "Response:"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    fi
    
    # Store the ID if this is a successful profile creation
    if [ "$method" = "POST" ] && [ "$status" = "201" ]; then
        PROFILE_ID=$(echo "$body" | jq -r '.id')
        echo -e "\nStored profile ID: $PROFILE_ID"
    fi
    
    echo -e "\nWaiting 1 second before next request..."
    sleep 1
}

# Base URL
BASE_URL="http://localhost:8080/api/v1/profiles"

# Create a unique email using timestamp
EMAIL="test$(date +%s)@example.com"

# Create a new profile
PROFILE_DATA='{
    "name": "Test User",
    "email": "'$EMAIL'",
    "bio": "This is a test profile",
    "image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}'

echo -e "\n\033[1;32mRunning API Tests\033[0m"
echo -e "===================="

# 1. Create a new profile
make_request "POST" "$BASE_URL" "$PROFILE_DATA" "1. Creating a new profile"

# 2. Get all profiles
make_request "GET" "$BASE_URL" "" "2. Retrieving all profiles"

# 3. Get profile by ID (using the ID from creation)
if [ ! -z "$PROFILE_ID" ]; then
    make_request "GET" "$BASE_URL/$PROFILE_ID" "" "3. Retrieving profile by ID"
else
    echo -e "\n\033[1;31mSkipping profile retrieval by ID: No profile ID available\033[0m"
fi

# 4. Generate a random profile
make_request "POST" "$BASE_URL/random" "" "4. Generating a random profile"

# 5. Get all profiles again to see the new random profile
make_request "GET" "$BASE_URL" "" "5. Retrieving all profiles (including random)"

echo -e "\n\033[1;32mTest Suite Completed!\033[0m" 