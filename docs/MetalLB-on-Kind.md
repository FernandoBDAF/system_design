# To set up MetalLB on Kind:

# 1. Determine the Docker network IP range used by Kind:

# `docker network inspect kind | grep Subnet`

# (Look for the IPv4 subnet, e.g., "172.31.0.0/16")

# 2. Create a MetalLB configuration file (e.g., `docs/k8s/metallb-config.yaml`).

# This file defines an IPAddressPool with a range from the subnet found above

# (e.g., 172.31.255.200-172.31.255.250) and an L2Advertisement.

# Example `docs/k8s/metallb-config.yaml`:

# ```yaml

# apiVersion: metallb.io/v1beta1

# kind: IPAddressPool

# metadata:

# name: kind-pool

# namespace: metallb-system

# spec:

# addresses:

# - 172.31.255.200-172.31.255.250 # Adjust based on your 'docker network inspect kind' output

# ---

# apiVersion: metallb.io/v1beta1

# kind: L2Advertisement

# metadata:

# name: kind-l2

# namespace: metallb-system

# spec:

# ipAddressPools:

# - kind-pool

# ```

# 3. Install MetalLB system components (creates CRDs and metallb-system namespace):

# `kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml`

# 4. Wait for MetalLB pods to be ready:

# `kubectl get pods -n metallb-system -w`

# (Wait until controller and speaker pods are 1/1 Running)

# 5. Apply the MetalLB configuration:

# `kubectl apply -f docs/k8s/metallb-config.yaml`

# After this, LoadBalancer services should receive an EXTERNAL-IP.

# ## Accessing LoadBalancer Services from Host Machine (macOS/Windows with Docker Desktop)

# Even though MetalLB assigns an EXTERNAL-IP to your LoadBalancer service (e.g., `172.31.255.201`),

# this IP is part of the internal Docker network that Kind uses. On macOS or Windows using Docker Desktop,

# your host machine might not be able to directly route traffic to this internal IP.

# **Why it happens:**

# Kind nodes run as Docker containers within a virtualized network managed by Docker Desktop.

# While MetalLB makes the service accessible at the EXTERNAL-IP _within_ this Docker network

# (as verified by curling from another pod in the cluster), your host OS doesn't automatically

# have a route to this internal network IP.

# **Recommended Solution: `kubectl port-forward`**

# The most reliable way to access your service from your host machine (e.g., browser, curl)

# is to use `kubectl port-forward`. This command creates a secure tunnel directly from a port

# on your local machine to the service port inside the Kind cluster.

# Example:

# To forward local port 8080 to port 80 on a service named `my-service`:

# `kubectl port-forward service/my-service 8080:80`

# Then, you can access your service via `http://localhost:8080` from your host machine.

# This bypasses the Docker network routing complexities for direct host access.
