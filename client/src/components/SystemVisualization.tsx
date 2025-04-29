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
  mockReason?: string;
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
    // First, deduplicate pods by name within each layer
    const seenPods = new Set<string>();
    filteredPodsToUse.forEach((pod) => {
      const layer = pod.layer || "service";
      const podKey = `${layer}:${pod.name}`;
      if (!seenPods.has(podKey)) {
        if (!byLayer[layer]) byLayer[layer] = [];
        byLayer[layer].push(pod);
        seenPods.add(podKey);
      }
    });
    return byLayer;
  }, [filteredPodsToUse]);

  // Group deployments and statefulsets by layer
  const deploymentsByLayer = useMemo(() => {
    const byLayer: Record<string, Record<string, PodWithMetrics[]>> = {};
    Object.entries(podsByLayer).forEach(([layer, pods]) => {
      const deployments: Record<string, PodWithMetrics[]> = {};
      pods.forEach((pod) => {
        // Group if it's part of a deployment (either directly or via ReplicaSet)
        if (
          (pod.ownerKind === "Deployment" || pod.ownerKind === "ReplicaSet") &&
          pod.deployment
        ) {
          if (!deployments[pod.deployment]) deployments[pod.deployment] = [];
          deployments[pod.deployment].push(pod);
        }
      });
      byLayer[layer] = deployments;
    });
    return byLayer;
  }, [podsByLayer]);

  // Standalone pods by layer (anything not in a deployment)
  const standalonePodsByLayer = useMemo(() => {
    const byLayer: Record<string, PodWithMetrics[]> = {};
    Object.entries(podsByLayer).forEach(([layer, pods]) => {
      byLayer[layer] = pods.filter(
        (pod) =>
          !(pod.ownerKind === "Deployment" || pod.ownerKind === "ReplicaSet") ||
          !pod.deployment
      );
    });
    return byLayer;
  }, [podsByLayer]);

  // Helper function to determine if a pod group should show a load balancer
  function shouldShowLoadBalancer(pods: PodWithMetrics[]): boolean {
    if (!pods.length) return false;

    // Get the first pod as reference (they should all have same owner/service)
    const pod = pods[0];

    // Rule 1: Must be part of a Deployment (not StatefulSet)
    if (pod.ownerKind !== "Deployment") {
      return false;
    }

    // Rule 2: Must have multiple replicas
    if (!pod.replicas || pod.replicas <= 1) {
      return false;
    }

    // Rule 3: Must have a non-headless service
    if (!pod.service || pod.service.type === "Headless") {
      return false;
    }

    return true;
  }

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    svg.selectAll("*").remove();

    // Layout constants
    const podRadius = 28;
    const lbSize = 32;
    const leftWidth = width * 0.5;
    const rightWidth = width * 0.5;
    const height = 600; // fixed height for now
    const leftSectionHeight = height / 3;
    const contentStartX = 120;
    const maxPerRow = 4;

    // Store node positions for connection drawing
    const nodePositions: Record<string, { x: number; y: number }> = {};

    // --- LEFT HALF: client-layer, data-layer, observability-layer ---
    const leftLayers = ["client-layer", "data-layer", "observability-layer"];
    leftLayers.forEach((layer, idx) => {
      const yBase = idx * leftSectionHeight;
      // Draw layer background
      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", yBase)
        .attr("width", leftWidth)
        .attr("height", leftSectionHeight)
        .attr("fill", idx % 2 === 0 ? "#F8FAFC" : "#F1F5F9")
        .attr("stroke", "#E5E7EB")
        .attr("stroke-width", 1)
        .attr("class", "viz-lb");
      // Draw layer label
      svg
        .append("text")
        .attr("x", 32)
        .attr("y", yBase + 36)
        .attr("fill", "#1E293B")
        .attr("font-size", "22px")
        .attr("font-weight", 800)
        .attr("aria-label", `Layer: ${layer}`)
        .text(layer);
      // Deployments in this layer
      const deployments = deploymentsByLayer[layer] || {};
      const deploymentNames = Object.keys(deployments);
      const hasDeployments = deploymentNames.length > 0;
      // Calculate deployment groups
      const deploymentGroups: {
        width: number;
        pods: PodWithMetrics[];
        name: string;
      }[] = [];
      if (hasDeployments) {
        deploymentNames.forEach((deployment) => {
          const pods = deployments[deployment];
          const groupWidth = pods.length * (podRadius * 2 + 32);
          deploymentGroups.push({ width: groupWidth, pods, name: deployment });
        });
      }
      // Standalone pods in this layer
      const standalonePods = standalonePodsByLayer[layer] || [];
      const standaloneGroups: { width: number; pods: PodWithMetrics[] }[] = [];
      if (standalonePods.length > 0) {
        for (let i = 0; i < standalonePods.length; i += maxPerRow) {
          const podsInRow = standalonePods.slice(i, i + maxPerRow);
          const groupWidth = podsInRow.length * (podRadius * 2 + 60);
          standaloneGroups.push({ width: groupWidth, pods: podsInRow });
        }
      }
      // Calculate total content width for centering
      const totalContentWidth =
        deploymentGroups.reduce((sum, g) => sum + g.width, 0) +
        (deploymentGroups.length > 0 ? (deploymentGroups.length - 1) * 60 : 0) +
        standaloneGroups.reduce((sum, g) => sum + g.width, 0) +
        (standaloneGroups.length > 0 ? (standaloneGroups.length - 1) * 60 : 0);
      let xCursor =
        contentStartX +
        Math.max(0, (leftWidth - contentStartX - totalContentWidth) / 2);
      // Draw deployments (horizontally)
      deploymentGroups.forEach((group) => {
        const shouldShowLB = shouldShowLoadBalancer(group.pods);
        const lbX = xCursor + group.width / 2;
        const lbY = yBase + 60;

        if (shouldShowLB) {
          // Draw load balancer (square)
          svg
            .append("rect")
            .attr("x", lbX - lbSize / 2)
            .attr("y", lbY)
            .attr("width", lbSize)
            .attr("height", lbSize)
            .attr("fill", "#F1F5F9")
            .attr("stroke", "#6366F1")
            .attr("stroke-width", 3)
            .attr("tabindex", 0)
            .attr("aria-label", `Deployment: ${group.name}`)
            .attr("class", "viz-lb")
            .on("mousemove", (event) => {
              setTooltip({
                visible: true,
                x: event.clientX,
                y: event.clientY - 30,
                content: (
                  <div>
                    <div className="font-semibold text-indigo-700">
                      Deployment: {group.name}
                    </div>
                    <div className="text-xs text-gray-700">
                      Pods: {group.pods.length}
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
            .attr("y", lbY + lbSize + 16)
            .attr("text-anchor", "middle")
            .attr("font-size", 13)
            .attr("fill", "#6366F1")
            .text(group.name);
        }
        // Pods below the load balancer
        group.pods.forEach((pod, j) => {
          const podX = xCursor + j * (podRadius * 2 + 32) + podRadius;
          const podY = lbY + lbSize + 60;
          svg
            .append("line")
            .attr("x1", lbX)
            .attr("y1", lbY + lbSize)
            .attr("x2", podX)
            .attr("y2", podY - podRadius)
            .attr("stroke", "#E5E7EB")
            .attr("stroke-width", 1.5)
            .attr("class", "viz-connection");
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
            .attr("class", "viz-pod")
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
        nodePositions[group.name + "-lb"] = {
          x: lbX,
          y: lbY + lbSize / 2,
        };
        xCursor += group.width + 60;
      });
      // Draw standalone pods (horizontally)
      standaloneGroups.forEach((group) => {
        group.pods.forEach((pod, j) => {
          const podX = xCursor + j * (podRadius * 2 + 60) + podRadius;
          const podY = yBase + leftSectionHeight / 2;
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
            .attr("class", "viz-pod")
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
        xCursor += group.width + 60;
      });
    });

    // --- RIGHT HALF: server-layer ---
    const serverLayer = "server-layer";
    const serverYStart = 0;
    const serverYEnd = height;
    // Draw server-layer background
    svg
      .append("rect")
      .attr("x", leftWidth)
      .attr("y", serverYStart)
      .attr("width", rightWidth)
      .attr("height", serverYEnd)
      .attr("fill", "#F8FAFC")
      .attr("stroke", "#E5E7EB")
      .attr("stroke-width", 1)
      .attr("class", "viz-lb");
    // Draw server-layer label
    svg
      .append("text")
      .attr("x", leftWidth + 32)
      .attr("y", 36)
      .attr("fill", "#1E293B")
      .attr("font-size", "22px")
      .attr("font-weight", 800)
      .attr("aria-label", `Layer: ${serverLayer}`)
      .text(serverLayer);
    // Deployments in server-layer
    const serverDeployments = deploymentsByLayer[serverLayer] || {};
    const serverDeploymentNames = Object.keys(serverDeployments);
    const serverHasDeployments = serverDeploymentNames.length > 0;
    // Calculate deployment groups (vertical arrangement)
    const serverDeploymentGroups: {
      height: number;
      pods: PodWithMetrics[];
      name: string;
    }[] = [];
    if (serverHasDeployments) {
      serverDeploymentNames.forEach((deployment) => {
        const pods = serverDeployments[deployment];
        const groupHeight = pods.length * (podRadius * 2 + 32);
        serverDeploymentGroups.push({
          height: groupHeight,
          pods,
          name: deployment,
        });
      });
    }
    // Standalone pods in server-layer
    const serverStandalonePods = standalonePodsByLayer[serverLayer] || [];
    const serverStandaloneGroups: { height: number; pods: PodWithMetrics[] }[] =
      [];
    if (serverStandalonePods.length > 0) {
      for (let i = 0; i < serverStandalonePods.length; i += maxPerRow) {
        const podsInCol = serverStandalonePods.slice(i, i + maxPerRow);
        const groupHeight = podsInCol.length * (podRadius * 2 + 60);
        serverStandaloneGroups.push({ height: groupHeight, pods: podsInCol });
      }
    }
    // Calculate total content height for centering
    const totalServerContentHeight =
      serverDeploymentGroups.reduce((sum, g) => sum + g.height, 0) +
      (serverDeploymentGroups.length > 0
        ? (serverDeploymentGroups.length - 1) * 60
        : 0) +
      serverStandaloneGroups.reduce((sum, g) => sum + g.height, 0) +
      (serverStandaloneGroups.length > 0
        ? (serverStandaloneGroups.length - 1) * 60
        : 0);
    let yCursor =
      80 + Math.max(0, (height - 80 - totalServerContentHeight) / 2);
    // Draw deployments (vertically)
    serverDeploymentGroups.forEach((group) => {
      const lbY = yCursor + group.height / 2;
      const lbX = leftWidth + 120;
      // Draw load balancer (square)
      svg
        .append("rect")
        .attr("x", lbX - lbSize / 2)
        .attr("y", lbY - lbSize / 2)
        .attr("width", lbSize)
        .attr("height", lbSize)
        .attr("fill", "#F1F5F9")
        .attr("stroke", "#6366F1")
        .attr("stroke-width", 3)
        .attr("tabindex", 0)
        .attr("aria-label", `Deployment: ${group.name}`)
        .attr("class", "viz-lb")
        .on("mousemove", (event) => {
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY - 30,
            content: (
              <div>
                <div className="font-semibold text-indigo-700">
                  Deployment: {group.name}
                </div>
                <div className="text-xs text-gray-700">
                  Pods: {group.pods.length}
                </div>
              </div>
            ),
          });
        })
        .on("mouseleave", () => setTooltip((t) => ({ ...t, visible: false })));
      svg
        .append("text")
        .attr("x", lbX)
        .attr("y", lbY + lbSize / 2 + 18)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", "#6366F1")
        .text(group.name);
      // Pods to the right of the load balancer
      group.pods.forEach((pod, j) => {
        const podY = yCursor + j * (podRadius * 2 + 32) + podRadius;
        const podX = lbX + lbSize + 80;
        svg
          .append("line")
          .attr("x1", lbX + lbSize / 2)
          .attr("y1", podY)
          .attr("x2", podX - podRadius)
          .attr("y2", podY)
          .attr("stroke", "#E5E7EB")
          .attr("stroke-width", 1.5)
          .attr("class", "viz-connection");
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
          .attr("class", "viz-pod")
          .on("mousemove", (event) => {
            setTooltip({
              visible: true,
              x: event.clientX,
              y: event.clientY - 30,
              content: (
                <div>
                  <div className="font-semibold text-gray-800">{pod.name}</div>
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
      nodePositions[group.name + "-lb"] = {
        x: lbX,
        y: lbY,
      };
      yCursor += group.height + 60;
    });
    // Draw standalone pods (vertically)
    serverStandaloneGroups.forEach((group) => {
      group.pods.forEach((pod, j) => {
        const podY = yCursor + j * (podRadius * 2 + 60) + podRadius;
        const podX = leftWidth + 120 + lbSize + 80;
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
          .attr("class", "viz-pod")
          .on("mousemove", (event) => {
            setTooltip({
              visible: true,
              x: event.clientX,
              y: event.clientY - 30,
              content: (
                <div>
                  <div className="font-semibold text-gray-800">{pod.name}</div>
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
      yCursor += group.height + 60;
    });

    // --- CONNECTIONS ---
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
        .attr("stroke", "#A3A3A3")
        .attr("stroke-width", 1.5)
        .attr("class", "viz-connection")
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
    <div
      className="w-full h-[600px] relative"
      style={{ background: "#F3F6FB", borderRadius: 16 }}
    >
      <style>{`
        .viz-pod, .viz-lb {
          filter: drop-shadow(0 2px 8px rgba(60,60,120,0.10));
          transition: transform 0.18s cubic-bezier(.4,2,.6,1), filter 0.18s;
        }
        .viz-pod:hover, .viz-lb:hover {
          transform: scale(1.10);
          filter: drop-shadow(0 4px 16px rgba(60,60,120,0.18));
        }
        .viz-connection {
          transition: stroke 0.18s;
        }
      `}</style>
      <div style={{ color: "blue", marginBottom: 8 }}>
        SystemVisualization: pods received = {pods.length}
      </div>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: "600px", background: "none" }}
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
          style={{
            left: tooltip.x + 10,
            top: tooltip.y,
            minWidth: 180,
            transition: "opacity 0.18s",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default SystemVisualization;
