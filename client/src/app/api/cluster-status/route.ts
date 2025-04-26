import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function getPodStatus() {
  try {
    const { stdout } = await execAsync(
      "kubectl get pods -n profile-service -o json"
    );
    const data = JSON.parse(stdout);
    console.log("Raw pod data:", data); // Debug log

    const pods = data.items.map((item: any) => ({
      name: item.metadata?.name || "",
      status: item.status?.phase || "",
      ready: item.status?.containerStatuses?.[0]?.ready || false,
      restarts: item.status?.containerStatuses?.[0]?.restartCount || 0,
      age: getAge(item.metadata?.creationTimestamp || ""),
      type: getPodType(item.metadata?.name || ""),
    }));

    console.log("Transformed pods:", pods); // Debug log
    return pods;
  } catch (error) {
    console.error("Error fetching pod status:", error);
    throw error;
  }
}

function getPodType(name: string): "nginx" | "service" | "redis" | "mongodb" {
  if (name.includes("nginx-lb")) return "nginx";
  if (name.includes("profile-service")) return "service";
  if (name.includes("redis")) return "redis";
  if (name.includes("mongodb")) return "mongodb";
  return "service"; // default type
}

function getAge(timestamp: string): string {
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export async function GET() {
  try {
    const pods = await getPodStatus();
    return NextResponse.json(pods);
  } catch (error) {
    console.error("Error in cluster-status API:", error);
    return NextResponse.json(
      { error: "Failed to fetch cluster status" },
      { status: 500 }
    );
  }
}
