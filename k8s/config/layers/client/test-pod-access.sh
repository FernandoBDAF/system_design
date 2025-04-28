#!/bin/bash

# Test pod access from client pod
echo "Testing pod access from client pod..."

# Get the client pod name
CLIENT_POD=$(kubectl get pod -n client-layer -l app=client -o jsonpath='{.items[0].metadata.name}')

# Test 1: List pods in client-layer namespace
echo "Test 1: Listing pods in client-layer namespace"
kubectl exec -n client-layer $CLIENT_POD -- kubectl get pods -n client-layer

# Test 2: List pods in server-layer namespace
echo -e "\nTest 2: Listing pods in server-layer namespace"
kubectl exec -n client-layer $CLIENT_POD -- kubectl get pods -n server-layer

# Test 3: List pods in data-layer namespace
echo -e "\nTest 3: Listing pods in data-layer namespace"
kubectl exec -n client-layer $CLIENT_POD -- kubectl get pods -n data-layer

# Test 4: List pods in observability-layer namespace
echo -e "\nTest 4: Listing pods in observability-layer namespace"
kubectl exec -n client-layer $CLIENT_POD -- kubectl get pods -n observability-layer 