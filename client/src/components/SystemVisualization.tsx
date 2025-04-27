import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import type { PodWithMetrics } from "../types/podWithMetrics";
import { mockPods, mockConnections } from "../lib/mockClusterData";

export interface Link {
  source: string;
  target: string;
  value?: number;
}

interface SystemVisualizationProps {
  pods: PodWithMetrics[];
  connections: Link[];
  requestsPerSecond: number;
  isMockedData?: boolean;
}

const SystemVisualization: React.FC<SystemVisualizationProps> = ({
  pods,
  connections,
  isMockedData = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Use mocked data if requested
  const podsToUse: PodWithMetrics[] = useMemo(() => {
    if (isMockedData) {
      return mockPods;
    }
    return pods;
  }, [isMockedData, pods]);

  const connectionsToUse: Link[] = useMemo(() => {
    if (isMockedData) {
      return mockConnections;
    }
    return connections;
  }, [isMockedData, connections]);

  // Memoize the four main namespaces (layers) to visualize
  const LAYER_ORDER = useMemo(
    () => ["client-layer", "server-layer", "data-layer", "observability-layer"],
    []
  );
  const LAYER_SET = useMemo(() => new Set(LAYER_ORDER), [LAYER_ORDER]);

  // Filter pods to only include those in the four main namespaces
  const filteredPodsToUse: PodWithMetrics[] = useMemo(() => {
    return podsToUse.filter((pod) => pod.layer && LAYER_SET.has(pod.layer));
  }, [podsToUse, LAYER_SET]);

  // Group pods by layer (namespace)
  const podsByLayer = useMemo(() => {
    const byLayer: Record<string, PodWithMetrics[]> = {};
    filteredPodsToUse.forEach((pod) => {
      const layer = pod.layer || "service";
      if (!byLayer[layer]) byLayer[layer] = [];
      byLayer[layer].push(pod);
    });
    return byLayer;
  }, [filteredPodsToUse]);

  // Group deployments by layer
  const deploymentsByLayer = useMemo(() => {
    const byLayer: Record<string, Record<string, PodWithMetrics[]>> = {};
    Object.entries(podsByLayer).forEach(([layer, pods]) => {
      const deployments: Record<string, PodWithMetrics[]> = {};
      pods.forEach((pod) => {
        if (pod.isDeploymentPod && pod.deployment) {
          if (!deployments[pod.deployment]) deployments[pod.deployment] = [];
          deployments[pod.deployment].push(pod);
        }
      });
      byLayer[layer] = deployments;
    });
    return byLayer;
  }, [podsByLayer]);

  // Standalone pods by layer
  const standalonePodsByLayer = useMemo(() => {
    const byLayer: Record<string, PodWithMetrics[]> = {};
    Object.entries(podsByLayer).forEach(([layer, pods]) => {
      byLayer[layer] = pods.filter(
        (pod) => !pod.isDeploymentPod || !pod.deployment
      );
    });
    return byLayer;
  }, [podsByLayer]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const height = svgRef.current.clientHeight;
    svg.selectAll("*").remove();

    // Layout
    const layers = LAYER_ORDER.filter((layer) => podsByLayer[layer]);
    const layerHeight = height / (layers.length + 1);
    const podRadius = 28;
    const lbSize = 32;
    const layerPadding = 60;
    const yCursor = layerPadding;
    const maxPerRow = 4; // Limit elements per row

    // Store node positions for connection drawing
    const nodePositions: Record<string, { x: number; y: number }> = {};

    layers.forEach((layer, layerIdx) => {
      const yBase = yCursor + layerIdx * layerHeight;
      // Draw layer label
      svg
        .append("text")
        .attr("x", 20)
        .attr("y", yBase + 20)
        .attr("fill", "#1E293B")
        .attr("font-size", "20px")
        .attr("font-weight", 700)
        .attr("aria-label", `Layer: ${layer}`)
        .text(layer);

      // Deployments in this layer
      const deployments = deploymentsByLayer[layer] || {};
      const deploymentNames = Object.keys(deployments);
      const hasDeployments = deploymentNames.length > 0;
      const xCursor = 120;
      // Draw deployments (if any), limit to maxPerRow per row
      if (hasDeployments) {
        let row = 0;
        for (let i = 0; i < deploymentNames.length; i += maxPerRow) {
          const deploymentsInRow = deploymentNames.slice(i, i + maxPerRow);
          let rowXCursor = xCursor;
          deploymentsInRow.forEach((deployment) => {
            const pods = deployments[deployment];
            const groupWidth = pods.length * (podRadius * 2 + 24);
            const lbX = rowXCursor + groupWidth / 2;
            // Draw load balancer (square)
            svg
              .append("rect")
              .attr("x", lbX - lbSize / 2)
              .attr("y", yBase + 40 + row * 180)
              .attr("width", lbSize)
              .attr("height", lbSize)
              .attr("fill", "#F1F5F9")
              .attr("stroke", "#6366F1")
              .attr("stroke-width", 3)
              .attr("tabindex", 0)
              .attr("aria-label", `Deployment: ${deployment}`)
              .on("mousemove", (event) => {
                setTooltip({
                  visible: true,
                  x: event.clientX,
                  y: event.clientY - 30,
                  content: (
                    <div>
                      <div className="font-semibold text-indigo-700">
                        Deployment: {deployment}
                      </div>
                      <div className="text-xs text-gray-700">
                        Pods: {pods.length}
                      </div>
                    </div>
                  ),
                });
              })
              .on("mouseleave", () =>
                setTooltip((t) => ({ ...t, visible: false }))
              );
            svg
              .append("text")
              .attr("x", lbX)
              .attr("y", yBase + 40 + lbSize + 16 + row * 180)
              .attr("text-anchor", "middle")
              .attr("font-size", 13)
              .attr("fill", "#6366F1")
              .text(deployment);
            // Bottom sublayer: pods
            pods.forEach((pod, j) => {
              const podX = rowXCursor + j * (podRadius * 2 + 24) + podRadius;
              const podY = yBase + 40 + lbSize + 60 + row * 180;
              // Line from LB to pod
              svg
                .append("line")
                .attr("x1", lbX)
                .attr("y1", yBase + 40 + lbSize + row * 180)
                .attr("x2", podX)
                .attr("y2", podY - podRadius)
                .attr("stroke", "#E5E7EB")
                .attr("stroke-width", 1.5);
              // Pod circle
              svg
                .append("circle")
                .attr("cx", podX)
                .attr("cy", podY)
                .attr("r", podRadius)
                .attr("fill", "#F8FAFC")
                .attr(
                  "stroke",
                  pod.status === "Running"
                    ? "#22C55E"
                    : pod.status === "Warning"
                      ? "#F59E42"
                      : "#EF4444"
                )
                .attr("stroke-width", 3)
                .attr("tabindex", 0)
                .attr("aria-label", `Pod: ${pod.name}, Status: ${pod.status}`)
                .on("mousemove", (event) => {
                  setTooltip({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY - 30,
                    content: (
                      <div>
                        <div className="font-semibold text-gray-800">
                          {pod.name}
                        </div>
                        <div className="text-xs text-gray-700">
                          Status: {pod.status}
                        </div>
                        <div className="text-xs text-gray-700">
                          Namespace: {pod.layer}
                        </div>
                        {pod.deployment && (
                          <div className="text-xs text-gray-700">
                            Deployment: {pod.deployment}
                          </div>
                        )}
                        {pod.cpuPercent > 0 && (
                          <div className="text-xs text-gray-700">
                            CPU: {pod.cpuPercent}%
                          </div>
                        )}
                        {pod.memory && (
                          <div className="text-xs text-gray-700">
                            Memory: {pod.memory}
                          </div>
                        )}
                        {pod.labels && (
                          <div className="text-xs text-gray-500 mt-1">
                            Labels:{" "}
                            {Object.entries(pod.labels)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    ),
                  });
                })
                .on("mouseleave", () =>
                  setTooltip((t) => ({ ...t, visible: false }))
                );
              // Status indicator (small filled circle at top right)
              svg
                .append("circle")
                .attr("cx", podX + podRadius * 0.7)
                .attr("cy", podY - podRadius * 0.7)
                .attr("r", 7)
                .attr(
                  "fill",
                  pod.status === "Running"
                    ? "#22C55E"
                    : pod.status === "Warning"
                      ? "#F59E42"
                      : "#EF4444"
                );
              // CPU usage % inside the pod (only if > 0)
              if (pod.cpuPercent > 0) {
                svg
                  .append("text")
                  .attr("x", podX)
                  .attr("y", podY + 5)
                  .attr("text-anchor", "middle")
                  .attr("font-size", 15)
                  .attr("font-weight", 600)
                  .attr("fill", "#6366F1")
                  .text(`${pod.cpuPercent}%`);
              }
              // Pod short name below the pod
              svg
                .append("text")
                .attr("x", podX)
                .attr("y", podY + podRadius + 18)
                .attr("text-anchor", "middle")
                .attr("font-size", 13)
                .attr("fill", "#374151")
                .text(pod.shortName);
              nodePositions[pod.name] = { x: podX, y: podY };
            });
            nodePositions[deployment + "-lb"] = {
              x: lbX,
              y: yBase + 40 + lbSize / 2 + row * 180,
            };
            rowXCursor += groupWidth + 60;
          });
          row++;
        }
      }
      // Standalone pods in this layer, limit to maxPerRow per row
      const standalonePods = standalonePodsByLayer[layer] || [];
      let standaloneRow = 0;
      for (let i = 0; i < standalonePods.length; i += maxPerRow) {
        const podsInRow = standalonePods.slice(i, i + maxPerRow);
        podsInRow.forEach((pod, j) => {
          const podX = xCursor + j * (podRadius * 2 + 60) + podRadius;
          const podY = yBase + 40 + lbSize / 2 + standaloneRow * 120;
          svg
            .append("circle")
            .attr("cx", podX)
            .attr("cy", podY)
            .attr("r", podRadius)
            .attr("fill", "#F8FAFC")
            .attr(
              "stroke",
              pod.status === "Running"
                ? "#22C55E"
                : pod.status === "Warning"
                  ? "#F59E42"
                  : "#EF4444"
            )
            .attr("stroke-width", 3)
            .attr("tabindex", 0)
            .attr("aria-label", `Pod: ${pod.name}, Status: ${pod.status}`)
            .on("mousemove", (event) => {
              setTooltip({
                visible: true,
                x: event.clientX,
                y: event.clientY - 30,
                content: (
                  <div>
                    <div className="font-semibold text-gray-800">
                      {pod.name}
                    </div>
                    <div className="text-xs text-gray-700">
                      Status: {pod.status}
                    </div>
                    <div className="text-xs text-gray-700">
                      Namespace: {pod.layer}
                    </div>
                    {pod.deployment && (
                      <div className="text-xs text-gray-700">
                        Deployment: {pod.deployment}
                      </div>
                    )}
                    {pod.cpuPercent > 0 && (
                      <div className="text-xs text-gray-700">
                        CPU: {pod.cpuPercent}%
                      </div>
                    )}
                    {pod.memory && (
                      <div className="text-xs text-gray-700">
                        Memory: {pod.memory}
                      </div>
                    )}
                    {pod.labels && (
                      <div className="text-xs text-gray-500 mt-1">
                        Labels:{" "}
                        {Object.entries(pod.labels)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ),
              });
            })
            .on("mouseleave", () =>
              setTooltip((t) => ({ ...t, visible: false }))
            );
          // Status indicator (small filled circle at top right)
          svg
            .append("circle")
            .attr("cx", podX + podRadius * 0.7)
            .attr("cy", podY - podRadius * 0.7)
            .attr("r", 7)
            .attr(
              "fill",
              pod.status === "Running"
                ? "#22C55E"
                : pod.status === "Warning"
                  ? "#F59E42"
                  : "#EF4444"
            );
          // CPU usage % inside the pod (only if > 0)
          if (pod.cpuPercent > 0) {
            svg
              .append("text")
              .attr("x", podX)
              .attr("y", podY + 5)
              .attr("text-anchor", "middle")
              .attr("font-size", 15)
              .attr("font-weight", 600)
              .attr("fill", "#6366F1")
              .text(`${pod.cpuPercent}%`);
          }
          // Pod short name below the pod
          svg
            .append("text")
            .attr("x", podX)
            .attr("y", podY + podRadius + 18)
            .attr("text-anchor", "middle")
            .attr("font-size", 13)
            .attr("fill", "#374151")
            .text(pod.shortName);
          nodePositions[pod.name] = { x: podX, y: podY };
        });
        standaloneRow++;
      }
    });

    // Draw pod-to-pod connections (even across namespaces)
    connectionsToUse.forEach((link) => {
      const source = nodePositions[link.source];
      const target = nodePositions[link.target];
      if (!source || !target) return;
      svg
        .append("line")
        .attr("x1", source.x)
        .attr("y1", source.y)
        .attr("x2", target.x)
        .attr("y2", target.y)
        .attr("stroke", "#E5E7EB")
        .attr("stroke-width", 1.5)
        .lower();
    });
  }, [
    podsByLayer,
    deploymentsByLayer,
    standalonePodsByLayer,
    connectionsToUse,
    LAYER_ORDER,
  ]);

  // Conditional rendering for empty pods
  if (!pods || pods.length === 0) {
    return (
      <div style={{ color: "red", padding: 16 }}>
        No pods to display (pods array is empty).
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] relative">
      <div style={{ color: "blue", marginBottom: 8 }}>
        SystemVisualization: pods received = {pods.length}
      </div>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: "600px" }}
      />
      {/* Legend/Key for the visualization */}
      <div className="mt-4 flex flex-wrap gap-8 items-center bg-blue-50 rounded-lg p-4 border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-2">
          <svg width="32" height="32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="#F8FAFC"
              stroke="#22C55E"
              strokeWidth="4"
            />
          </svg>
          <span className="text-sm text-gray-800 font-medium">
            Pod (Running)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="32" height="32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="#F8FAFC"
              stroke="#F59E42"
              strokeWidth="4"
            />
          </svg>
          <span className="text-sm text-gray-800 font-medium">
            Pod (Warning)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="32" height="32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="#F8FAFC"
              stroke="#EF4444"
              strokeWidth="4"
            />
          </svg>
          <span className="text-sm text-gray-800 font-medium">Pod (Error)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="32" height="32">
            <rect
              x="6"
              y="6"
              width="20"
              height="20"
              fill="#F1F5F9"
              stroke="#6366F1"
              strokeWidth="4"
            />
          </svg>
          <span className="text-sm text-gray-800 font-medium">
            Load Balancer / Deployment Group
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="32" height="8">
            <line
              x1="2"
              y1="4"
              x2="30"
              y2="4"
              stroke="#A3A3A3"
              strokeWidth="3"
            />
          </svg>
          <span className="text-sm text-gray-800 font-medium">
            Pod-to-Pod Connection
          </span>
        </div>
      </div>
      {/* Tooltip rendering */}
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-900"
          style={{ left: tooltip.x + 10, top: tooltip.y, minWidth: 180 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default SystemVisualization;
