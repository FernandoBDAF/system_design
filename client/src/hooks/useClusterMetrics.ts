import { useEffect, useState } from "react";
import type { PodWithMetrics } from "../types/podWithMetrics";

interface MetricsResponse {
  data: PodWithMetrics[];
  isMocked: boolean;
  reason?: string;
}

export function useClusterMetrics() {
  const [data, setData] = useState<PodWithMetrics[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMocked, setIsMocked] = useState(false);
  const [mockReason, setMockReason] = useState<string | undefined>();

  const fetchMetrics = async () => {
    console.log("[useClusterMetrics] Starting metrics fetch...");
    setLoading(true);
    setError(null);
    try {
      console.log("[useClusterMetrics] Fetching from /api/cluster-metrics");
      const res = await fetch("/api/cluster-metrics");
      if (!res.ok) {
        console.error(
          "[useClusterMetrics] Failed to fetch metrics:",
          res.status,
          res.statusText
        );
        throw new Error(
          `Failed to fetch cluster metrics: ${res.status} ${res.statusText}`
        );
      }
      const json: MetricsResponse = await res.json();
      console.log("[useClusterMetrics] Received metrics data:", {
        podCount: json.data.length,
        isMocked: json.isMocked,
        reason: json.reason,
        pods: json.data.map((p: PodWithMetrics) => ({
          name: p.name,
          cpu: p.cpu,
          memory: p.memory,
          status: p.status,
        })),
      });
      setData(json.data);
      setIsMocked(json.isMocked);
      setMockReason(json.reason);
    } catch (err) {
      console.error("[useClusterMetrics] Error fetching metrics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[useClusterMetrics] Initializing metrics polling");
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => {
      console.log("[useClusterMetrics] Cleaning up metrics polling");
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error, isMocked, mockReason };
}
