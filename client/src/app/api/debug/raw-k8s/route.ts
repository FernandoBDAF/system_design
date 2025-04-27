// /api/debug/raw-k8s/route.ts
// Debug endpoint: Returns raw pod and deployment data from all main namespaces.
// WARNING: For development/debugging only. Do NOT expose in production.

import { NextResponse } from "next/server";
import * as k8s from "@kubernetes/client-node";
import type { V1Pod } from "@kubernetes/client-node";
import type { V1Deployment } from "@kubernetes/client-node";

const NAMESPACES = [
  "client-layer",
  "server-layer",
  "data-layer",
  "observability-layer",
];

export async function GET() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const appsApi = kc.makeApiClient(k8s.AppsV1Api);

  const result: Record<
    string,
    { pods: V1Pod[]; deployments: V1Deployment[] } | { error: string }
  > = {};

  for (const ns of NAMESPACES) {
    try {
      const podsList = await k8sApi.listNamespacedPod({ namespace: ns });
      const deploymentsList = await appsApi.listNamespacedDeployment({
        namespace: ns,
      });
      result[ns] = {
        pods: podsList.items,
        deployments: deploymentsList.items,
      };
    } catch (err) {
      result[ns] = { error: (err as Error).message };
    }
  }

  return NextResponse.json(result);
}
