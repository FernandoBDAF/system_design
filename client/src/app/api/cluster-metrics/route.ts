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
  // Handle StatefulSet pods (e.g., postgres-0, rabbitmq-0)
  if (name.match(/^[a-zA-Z]+-\d+$/)) {
    return name;
  }

  // e.g. server-5489b5fdcf-9vj6b => server-9vj6
  const match = name.match(/([a-zA-Z]+)-([a-f0-9]+)-([a-z0-9]{5})/i);
  if (match) {
    return `${match[1]}-${match[3].slice(0, 4)}`;
  }

  // fallback: just use last segment
  const parts = name.split("-");
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    return `${parts[0]}-${lastPart.slice(0, 4)}`;
  }
  return name;
}

function mapLayerLabel(label: string): string {
  // Map k8s layer labels to our visualization layers
  const layerMap: Record<string, string> = {
    frontend: "client-layer",
    application: "server-layer",
    persistence: "data-layer",
    monitoring: "observability-layer",
  };
  return layerMap[label] || label;
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
        // Get pod's CPU limit
        const cpuLimit = pod.spec?.containers[0]?.resources?.limits?.cpu;
        const cpuLimitMillicores = cpuLimit ? parseCpu(cpuLimit) : 0;

        // Calculate percentage based on pod's CPU limit
        // Example: Pod using 73m out of 500m limit = 14.6%
        cpuPercent = cpuLimitMillicores
          ? Math.min(
              Math.round((cpuMillicores / cpuLimitMillicores) * 100) / 10,
              100
            )
          : 0;
      }
      const memory = metric?.containers[0]?.usage?.memory || "";
      // Deployment info
      const labels = pod.metadata?.labels || {};
      const ownerRefs = pod.metadata?.ownerReferences || [];
      const deployment = labels.app || (ownerRefs[0]?.name ?? "");
      const isDeploymentPod = ownerRefs.some(
        (ref) => ref.kind === "Deployment" || ref.kind === "ReplicaSet"
      );

      // Determine pod status
      let status = pod.status?.phase || "";
      // Check container statuses for more accurate state
      const containerStatuses = pod.status?.containerStatuses || [];
      if (containerStatuses.length > 0) {
        const mainContainer = containerStatuses[0];
        if (mainContainer.state?.waiting) {
          status = "Warning";
          if (mainContainer.state.waiting.reason === "CrashLoopBackOff") {
            status = "Error";
          }
        } else if (!mainContainer.ready) {
          status = "Warning";
        }
      }

      // Use layer label instead of namespace
      const layerLabel = labels.layer || "";
      return {
        name: pod.metadata?.name || "",
        shortName: shortenPodName(pod.metadata?.name || ""),
        status,
        cpu,
        cpuPercent,
        memory,
        deployment,
        isDeploymentPod,
        layer: mapLayerLabel(layerLabel),
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
