import { KubeConfig, CoreV1Api, V1Pod, V1Node } from "@kubernetes/client-node";
import fs from "fs";
import https from "https";
import { PodWithMetrics } from "../../../types/podWithMetrics";
import { mockPods } from "../../../lib/mockClusterData";

interface PodMetricContainer {
  name: string;
  usage: {
    cpu: string;
    memory: string;
  };
}

interface PodMetric {
  metadata: { name: string; namespace: string };
  containers: PodMetricContainer[];
}

interface MetricsAPIResponse {
  items: PodMetric[];
}

function parseCpu(cpu: string): number {
  // "100m" => 100, "1" => 1000
  if (!cpu) return 0;
  if (cpu.endsWith("m")) return parseInt(cpu.replace("m", ""), 10);
  return parseFloat(cpu) * 1000;
}

function shortenPodName(name: string): string {
  // e.g. profile-client-5994555b84-z5xl7 => client-5994
  const match = name.match(/([a-zA-Z]+)-([a-zA-Z]+)-([0-9a-f]+)-/);
  if (match) {
    return `${match[2]}-${match[3].slice(0, 4)}`;
  }
  // fallback: just use last two segments
  const parts = name.split("-");
  if (parts.length >= 3) {
    return `${parts[parts.length - 3]}-${parts[parts.length - 2].slice(0, 4)}`;
  }
  return name;
}

export async function GET() {
  console.log("[cluster-metrics] Starting metrics fetch request");
  try {
    // In-cluster service account token and CA
    let token: string, ca: Buffer;
    try {
      console.log("[cluster-metrics] Reading service account credentials");
      token = fs.readFileSync(
        "/var/run/secrets/kubernetes.io/serviceaccount/token",
        "utf8"
      );
      ca = fs.readFileSync(
        "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
      );
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT") {
        console.log(
          "[cluster-metrics] Running outside cluster, returning mock data"
        );
        // Fallback: return mock pod metrics if running outside the cluster
        return Response.json(mockPods);
      } else {
        console.error(
          "[cluster-metrics] Error reading service account credentials:",
          err
        );
        throw err;
      }
    }
    const namespace = process.env.NAMESPACE || "profile-service";
    console.log("[cluster-metrics] Using namespace:", namespace);

    // Get pods and nodes using @kubernetes/client-node
    console.log("[cluster-metrics] Fetching pods and nodes (all namespaces)");
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    const podsResponse = await k8sApi.listPodForAllNamespaces();
    const pods: V1Pod[] = podsResponse.items;
    const nodesResponse = await k8sApi.listNode();
    const nodes: V1Node[] = nodesResponse.items;
    console.log("[cluster-metrics] Found pods:", pods.length);
    console.log("[cluster-metrics] Found nodes:", nodes.length);
    // Assume all pods are on the first node
    const nodeCpuCapacityStr = nodes[0]?.status?.capacity?.cpu || "1";
    const nodeCpuCapacity = nodeCpuCapacityStr.endsWith("m")
      ? parseInt(nodeCpuCapacityStr.replace("m", ""), 10)
      : parseFloat(nodeCpuCapacityStr) * 1000;

    // Get metrics for all pods in all namespaces
    console.log("[cluster-metrics] Fetching metrics for all pods");
    const metricsData: MetricsAPIResponse =
      await new Promise<MetricsAPIResponse>((resolve, reject) => {
        const options = {
          hostname: "kubernetes.default.svc",
          port: 443,
          path: `/apis/metrics.k8s.io/v1beta1/pods`,
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          ca,
          rejectUnauthorized: false,
        };
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            console.log("[cluster-metrics] Received metrics data");
            resolve(JSON.parse(data));
          });
        });
        req.on("error", (err) => {
          console.error("[cluster-metrics] Error fetching metrics:", err);
          reject(err);
        });
        req.end();
      });

    // Merge metrics into pods and enrich
    const podMetrics: PodWithMetrics[] = pods.map((pod: V1Pod) => {
      const metric: PodMetric | undefined = metricsData.items.find(
        (m) =>
          m.metadata.name === pod.metadata?.name &&
          m.metadata.namespace === pod.metadata?.namespace
      );
      let cpu = "";
      let cpuPercent = 0;
      if (metric && metric.containers[0]?.usage?.cpu) {
        cpu = metric.containers[0].usage.cpu;
        const cpuMillicores = parseCpu(cpu);
        cpuPercent = nodeCpuCapacity
          ? Math.round((cpuMillicores / nodeCpuCapacity) * 1000) / 10
          : 0;
      }
      const memory = metric?.containers[0]?.usage?.memory || "";
      // Deployment info
      const labels = pod.metadata?.labels || {};
      const ownerRefs = pod.metadata?.ownerReferences || [];
      const deployment = labels.app || (ownerRefs[0]?.name ?? "");
      const isDeploymentPod = ownerRefs.some(
        (ref) => ref.kind === "Deployment"
      );
      const namespace = pod.metadata?.namespace || "default";
      // Layer = namespace for visualization
      return {
        name: pod.metadata?.name || "",
        shortName: shortenPodName(pod.metadata?.name || ""),
        status: pod.status?.phase || "",
        cpu,
        cpuPercent,
        memory,
        deployment,
        isDeploymentPod,
        layer: namespace,
      };
    });

    console.log(
      "[cluster-metrics] Successfully processed metrics for",
      podMetrics.length,
      "pods"
    );
    return Response.json(podMetrics);
  } catch (error) {
    console.error("[cluster-metrics] Error in metrics API:", error);
    return Response.json(
      { error: "Failed to fetch pod metrics" },
      { status: 500 }
    );
  }
}
