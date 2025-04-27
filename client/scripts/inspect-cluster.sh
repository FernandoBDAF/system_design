#!/bin/bash

# inspect-cluster.sh: Inspect pods, deployments, and metrics in all main namespaces

NAMESPACES=(client-layer server-layer data-layer observability-layer)

for ns in "${NAMESPACES[@]}"; do
  echo "\n=============================="
  echo "Namespace: $ns"
  echo "=============================="

  echo "\n-- Pods (with labels) --"
  kubectl get pods -n "$ns" -o wide --show-labels

  echo "\n-- Deployments (with labels) --"
  kubectl get deployments -n "$ns" -o wide --show-labels

  echo "\n-- Pod Metrics (if available) --"
  kubectl top pods -n "$ns" 2>/dev/null || echo "(metrics-server not available)"

done 