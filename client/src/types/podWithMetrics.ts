export interface PodWithMetrics {
  name: string; // Full pod name
  shortName: string; // Shortened name for UI
  status: string;
  cpu: string; // Raw value, e.g. "100m"
  cpuPercent: number; // As % of node capacity
  memory: string;
  deployment: string; // Deployment name (if any)
  isDeploymentPod: boolean;
  layer?: string; // Optional: for visualization grouping
  labels?: Record<string, string>; // Optional: pod labels for tooltips
  // New fields for load balancer rules
  ownerKind?: "Deployment" | "StatefulSet" | "ReplicaSet"; // Type of the owner controller
  replicas?: number; // Number of replicas in the deployment/statefulset
  service?: {
    name: string;
    type: string; // "ClusterIP", "LoadBalancer", "NodePort", or "Headless"
  };
}
