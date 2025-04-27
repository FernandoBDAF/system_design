import React, { useEffect, useState } from "react";
import { KubeConfig, CoreV1Api, V1Pod } from "@kubernetes/client-node";

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

interface PodMetrics {
  name: string;
  status: string;
  cpu: string | null;
  memory: string | null;
}

const KubernetesMetrics: React.FC = () => {
  const [podMetrics, setPodMetrics] = useState<PodMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // In-cluster service account token and CA
        const token = await fetch(
          "/var/run/secrets/kubernetes.io/serviceaccount/token"
        ).then((res) => res.text());
        const ca = await fetch(
          "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
        ).then((res) => res.arrayBuffer());
        const namespace = process.env.NAMESPACE || "profile-service";

        // Get pods using @kubernetes/client-node
        const kc = new KubeConfig();
        kc.loadFromDefault();
        const k8sApi = kc.makeApiClient(CoreV1Api);
        const podsResponse = await k8sApi.listNamespacedPod({ namespace });
        const pods: V1Pod[] = podsResponse.items;

        // Get metrics using in-cluster HTTPS request
        const metricsData: MetricsAPIResponse = await fetch(
          `https://kubernetes.default.svc/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`,
          {
            headers: { Authorization: `Bearer ${token}` },
            // @ts-expect-error - TypeScript doesn't know about the ca property
            ca,
            rejectUnauthorized: false,
          }
        ).then((res) => res.json());

        // Merge metrics into pods
        const podMetrics = pods.map((pod: V1Pod) => {
          const metric: PodMetric | undefined = metricsData.items.find(
            (m) => m.metadata.name === pod.metadata?.name
          );
          return {
            name: pod.metadata?.name || "",
            status: pod.status?.phase || "",
            cpu: metric?.containers[0]?.usage?.cpu || null,
            memory: metric?.containers[0]?.usage?.memory || null,
          };
        });

        setPodMetrics(podMetrics);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch metrics"
        );
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        Kubernetes Pod Metrics
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {podMetrics.map((pod) => (
          <div key={pod.name} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{pod.name}</span>
              <span
                className={`text-sm ${
                  pod.status === "Running"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              >
                {pod.status}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">CPU Usage:</span>
                <span className="text-sm font-medium ml-2">
                  {pod.cpu || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Memory Usage:</span>
                <span className="text-sm font-medium ml-2">
                  {pod.memory || "N/A"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KubernetesMetrics;
