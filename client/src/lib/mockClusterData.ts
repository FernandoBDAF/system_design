import type { PodWithMetrics } from "../types/podWithMetrics";
import type { Link } from "../components/SystemVisualization";

export const mockPods: PodWithMetrics[] = [
  {
    name: "profile-server-abc12345-x1y2z",
    shortName: "server-abc1",
    status: "Running",
    cpu: "120m",
    cpuPercent: 3.0,
    memory: "256Mi",
    deployment: "profile-server",
    isDeploymentPod: true,
    layer: "server-layer",
  },
  {
    name: "profile-server-abc12345-x1y2a",
    shortName: "server-abc1",
    status: "Running",
    cpu: "90m",
    cpuPercent: 2.2,
    memory: "220Mi",
    deployment: "profile-server",
    isDeploymentPod: true,
    layer: "server-layer",
  },
  {
    name: "profile-client-5994555b84-z5xl7",
    shortName: "client-5994",
    status: "Running",
    cpu: "80m",
    cpuPercent: 2.0,
    memory: "180Mi",
    deployment: "profile-client",
    isDeploymentPod: true,
    layer: "client-layer",
  },
  {
    name: "profile-client-5994555b84-z5xk2",
    shortName: "client-5994",
    status: "Running",
    cpu: "70m",
    cpuPercent: 1.8,
    memory: "170Mi",
    deployment: "profile-client",
    isDeploymentPod: true,
    layer: "client-layer",
  },
  {
    name: "redis-7b67d9d966-hzbls",
    shortName: "redis-7b67",
    status: "Running",
    cpu: "30m",
    cpuPercent: 0.8,
    memory: "100Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "data-layer",
  },
  {
    name: "metrics-server-86d4dd4fd9-abcde",
    shortName: "metrics-86d4",
    status: "CrashLoopBackOff",
    cpu: "10m",
    cpuPercent: 0.2,
    memory: "50Mi",
    deployment: "",
    isDeploymentPod: false,
    layer: "observability-layer",
  },
];

export const mockConnections: Link[] = [
  { source: "profile-server-abc12345-x1y2z", target: "redis-7b67d9d966-hzbls" },
  { source: "profile-server-abc12345-x1y2a", target: "redis-7b67d9d966-hzbls" },
  {
    source: "profile-client-5994555b84-z5xl7",
    target: "redis-7b67d9d966-hzbls",
  },
  {
    source: "profile-client-5994555b84-z5xk2",
    target: "redis-7b67d9d966-hzbls",
  },
  {
    source: "metrics-server-86d4dd4fd9-abcde",
    target: "redis-7b67d9d966-hzbls",
  },
];
