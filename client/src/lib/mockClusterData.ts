import type { PodWithMetrics } from "../types/podWithMetrics";
import type { Link } from "../components/SystemVisualization";

export const mockPods: PodWithMetrics[] = [
  // Server pods (deployment)
  {
    name: "server-abc12345-x1y2z",
    shortName: "server-2xls",
    status: "Error",
    cpu: "120m",
    cpuPercent: 3.0,
    memory: "256Mi",
    deployment: "server",
    isDeploymentPod: true,
    layer: "server-layer",
    ownerKind: "Deployment",
    replicas: 2,
    service: {
      name: "server-service",
      type: "ClusterIP",
    },
  },
  {
    name: "server-abc12345-6fn5",
    shortName: "server-6fn5",
    status: "Error",
    cpu: "90m",
    cpuPercent: 2.2,
    memory: "220Mi",
    deployment: "server",
    isDeploymentPod: true,
    layer: "server-layer",
    ownerKind: "Deployment",
    replicas: 2,
    service: {
      name: "server-service",
      type: "ClusterIP",
    },
  },
  // Client pod (standalone)
  {
    name: "client-v7qr",
    shortName: "client-v7qr",
    status: "Running",
    cpu: "80m",
    cpuPercent: 100,
    memory: "180Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "client-layer",
    ownerKind: undefined,
    replicas: 1,
    service: {
      name: "client-service",
      type: "ClusterIP",
    },
  },
  // Database pods (statefulsets)
  {
    name: "postgres-0",
    shortName: "postgres-0",
    status: "Running",
    cpu: "200m",
    cpuPercent: 100,
    memory: "512Mi",
    deployment: "postgres",
    isDeploymentPod: true,
    layer: "data-layer",
    ownerKind: "StatefulSet",
    replicas: 1,
    service: {
      name: "postgres",
      type: "Headless",
    },
  },
  {
    name: "rabbitmq-0",
    shortName: "rabbitmq-0",
    status: "Running",
    cpu: "150m",
    cpuPercent: 100,
    memory: "256Mi",
    deployment: "rabbitmq",
    isDeploymentPod: true,
    layer: "data-layer",
    ownerKind: "StatefulSet",
    replicas: 1,
    service: {
      name: "rabbitmq",
      type: "Headless",
    },
  },
  {
    name: "redis-d8pj",
    shortName: "redis-d8pj",
    status: "Running",
    cpu: "100m",
    cpuPercent: 100,
    memory: "128Mi",
    deployment: "redis",
    isDeploymentPod: true,
    layer: "data-layer",
    ownerKind: "StatefulSet",
    replicas: 1,
    service: {
      name: "redis",
      type: "Headless",
    },
  },
  // Worker pod (standalone)
  {
    name: "worker-cwnr",
    shortName: "worker-cwnr",
    status: "Running",
    cpu: "100m",
    cpuPercent: 100,
    memory: "256Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "server-layer",
    ownerKind: undefined,
    replicas: 1,
    service: undefined,
  },
  // Monitoring pods (mix of deployment and standalone)
  {
    name: "grafana-wkgk",
    shortName: "grafana-wkgk",
    status: "Error",
    cpu: "50m",
    cpuPercent: 100,
    memory: "128Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "observability-layer",
    ownerKind: undefined,
    replicas: 1,
    service: {
      name: "grafana",
      type: "ClusterIP",
    },
  },
  {
    name: "prometheus-gkwr",
    shortName: "prometheus-gkwr",
    status: "Running",
    cpu: "150m",
    cpuPercent: 100,
    memory: "512Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "observability-layer",
    ownerKind: undefined,
    replicas: 1,
    service: {
      name: "prometheus",
      type: "ClusterIP",
    },
  },
];

export const mockConnections: Link[] = [
  // Server to database connections
  { source: "server-abc12345-x1y2z", target: "postgres-0" },
  { source: "server-abc12345-x1y2z", target: "redis-d8pj" },
  { source: "server-abc12345-6fn5", target: "postgres-0" },
  { source: "server-abc12345-6fn5", target: "redis-d8pj" },

  // Client to server connections
  { source: "client-v7qr", target: "server-abc12345-x1y2z" },
  { source: "client-v7qr", target: "server-abc12345-6fn5" },

  // Worker connections
  { source: "worker-cwnr", target: "rabbitmq-0" },
  { source: "worker-cwnr", target: "postgres-0" },

  // Monitoring connections
  { source: "prometheus-gkwr", target: "redis-d8pj" },
  { source: "grafana-wkgk", target: "prometheus-gkwr" },
];
