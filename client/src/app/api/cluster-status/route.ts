import { KubeConfig, CoreV1Api, V1Pod } from "@kubernetes/client-node";

function getPodType(name: string): "nginx" | "service" | "redis" | "mongodb" {
  if (name.includes("nginx-lb")) return "nginx";
  if (name.includes("profile-service")) return "service";
  if (name.includes("redis")) return "redis";
  if (name.includes("mongodb")) return "mongodb";
  return "service"; // default type
}

export async function GET() {
  try {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    const namespace = process.env.NAMESPACE || "profile-service";
    const response = await k8sApi.listNamespacedPod({ namespace });
    const pods = response.items?.map((pod: V1Pod) => ({
      name: pod.metadata?.name || "",
      status: pod.status?.phase || "Unknown",
      ready: pod.status?.containerStatuses?.[0]?.ready ?? false,
      restarts: pod.status?.containerStatuses?.[0]?.restartCount ?? 0,
      age: pod.metadata?.creationTimestamp || "",
      type: getPodType(pod.metadata?.name || ""),
    }));
    return Response.json(pods);
  } catch (error) {
    console.error("Error fetching pods:", error);
    return Response.json(
      { error: "Failed to fetch pod information" },
      { status: 500 }
    );
  }
}
