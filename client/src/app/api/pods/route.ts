import { NextResponse } from "next/server";
import {
  KubeConfig,
  CoreV1Api,
  V1Pod,
  V1ContainerStatus,
} from "@kubernetes/client-node";

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
      ip: pod.status?.podIP || "",
      node: pod.spec?.nodeName || "",
      containers:
        pod.status?.containerStatuses?.map((container: V1ContainerStatus) => ({
          name: container.name,
          ready: container.ready,
          restartCount: container.restartCount,
        })) || [],
    }));

    return NextResponse.json(pods);
  } catch (error) {
    console.error("Error fetching pods:", error);
    return NextResponse.json(
      { error: "Failed to fetch pod information" },
      { status: 500 }
    );
  }
}
