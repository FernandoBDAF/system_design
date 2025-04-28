#!/bin/bash

# Get the service account token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Test metrics API access
echo "Testing metrics API access..."
curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/apis/metrics.k8s.io/v1beta1/pods

# Test pod listing
echo -e "\nTesting pod listing..."
kubectl get pods --all-namespaces

# Test deployments listing
echo -e "\nTesting deployments listing..."
kubectl get deployments --all-namespaces 