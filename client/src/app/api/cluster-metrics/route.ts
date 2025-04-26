import { KubeConfig, CoreV1Api, V1Pod } from "@kubernetes/client-node";
import fs from "fs";
import https from "https";

interface PodMetricContainer {
  name: string;
  usage: {
    cpu: string;
    memory: string;
  };
}

interface PodMetric {
  metadata: { name: string };
  containers: PodMetricContainer[];
}

interface MetricsAPIResponse {
  items: PodMetric[];
}

export async function GET() {
  try {
    // In-cluster service account token and CA
    const token = fs.readFileSync(
      "/var/run/secrets/kubernetes.io/serviceaccount/token",
      "utf8"
    );
    const ca = fs.readFileSync(
      "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
    );
    const namespace = process.env.NAMESPACE || "profile-service";

    // Get pods using @kubernetes/client-node
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    const podsResponse = await k8sApi.listNamespacedPod({ namespace });
    const pods: V1Pod[] = podsResponse.items;

    // Get metrics using in-cluster HTTPS request
    const metricsData: MetricsAPIResponse =
      await new Promise<MetricsAPIResponse>((resolve, reject) => {
        const options = {
          hostname: "kubernetes.default.svc",
          port: 443,
          path: `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`,
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          ca,
          rejectUnauthorized: false, // set to true if your CA is valid
        };
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(JSON.parse(data)));
        });
        req.on("error", reject);
        req.end();
      });

    // Merge metrics into pods
    const podMetrics = pods.map((pod: V1Pod) => {
      const metric: PodMetric | undefined = metricsData.items.find(
        (m) => m.metadata.name === pod.metadata?.name
      );
      return {
        name: pod.metadata?.name,
        status: pod.status?.phase,
        cpu: metric?.containers[0]?.usage?.cpu || null,
        memory: metric?.containers[0]?.usage?.memory || null,
      };
    });

    return Response.json(podMetrics);
  } catch (error) {
    console.error("Error fetching pod metrics:", error);
    return Response.json(
      { error: "Failed to fetch pod metrics" },
      { status: 500 }
    );
  }
}
