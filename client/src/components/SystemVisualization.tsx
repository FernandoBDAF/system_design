import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { Pod, Link } from "../app/page";

interface SystemVisualizationProps {
  pods: Pod[];
  connections: Link[];
  requestsPerSecond: number;
  isMockedData?: boolean;
}

interface Node {
  id: string;
  type: string;
  layer: string;
  status: "healthy" | "warning" | "error";
}

const SystemVisualization: React.FC<SystemVisualizationProps> = ({
  pods,
  connections,
  isMockedData = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Use props for nodes/links if not mocked, otherwise use mock data
  const nodes: Node[] = useMemo(
    () =>
      !isMockedData
        ? pods.map((pod) => ({
            id: pod.name,
            type: pod.type,
            layer: pod.type,
            status:
              pod.status === "Running" && pod.ready
                ? "healthy"
                : pod.status === "Warning"
                  ? "warning"
                  : "error",
          }))
        : [
            {
              id: "postgres",
              type: "pod",
              layer: "service",
              status: "healthy",
            },
            { id: "profile", type: "pod", layer: "service", status: "healthy" },
            {
              id: "profile-2",
              type: "pod",
              layer: "service",
              status: "healthy",
            },
            {
              id: "profile-3",
              type: "pod",
              layer: "service",
              status: "warning",
            },
            {
              id: "rabbitmq",
              type: "pod",
              layer: "service",
              status: "healthy",
            },
            { id: "redis", type: "pod", layer: "storage", status: "error" },
          ],
    [isMockedData, pods]
  );

  const links: Link[] = useMemo(
    () =>
      !isMockedData
        ? connections.map((conn) => ({
            source: conn.source,
            target: conn.target,
            value: conn.value ?? 1,
          }))
        : [
            { source: "postgres", target: "redis", value: 1 },
            { source: "profile", target: "redis", value: 1 },
            { source: "profile-2", target: "redis", value: 1 },
            { source: "profile-3", target: "redis", value: 1 },
            { source: "rabbitmq", target: "redis", value: 1 },
          ],
    [isMockedData, connections]
  );

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    svg.selectAll("*").remove();

    // Dynamically compute layers from nodes
    const uniqueLayers = Array.from(new Set(nodes.map((n) => n.layer)));
    const layers = uniqueLayers.length > 0 ? uniqueLayers : ["service"];
    const layerHeight = height / layers.length;

    // Add layer labels
    svg
      .selectAll(".layer-label")
      .data(layers)
      .enter()
      .append("text")
      .attr("class", "layer-label")
      .attr("x", 20)
      .attr("y", (d, i) => i * layerHeight + 30)
      .attr("fill", "#4B5563")
      .attr("font-size", "14px")
      .text((d) => d.charAt(0).toUpperCase() + d.slice(1) + " Layer");

    // Create node positions
    const nodePositions = new Map();
    nodes.forEach((node) => {
      const layerIndex = layers.indexOf(node.layer);
      const nodesInLayer = nodes.filter((n) => n.layer === node.layer).length;
      const nodeIndex = nodes
        .filter((n) => n.layer === node.layer)
        .findIndex((n) => n.id === node.id);
      nodePositions.set(node.id, {
        x: ((width - 100) * (nodeIndex + 1)) / (nodesInLayer + 1) + 50,
        y: layerHeight * layerIndex + layerHeight / 2,
      });
    });

    // Draw connections
    const linkGroup = svg.append("g");
    links.forEach((link) => {
      const source = nodePositions.get(link.source);
      const target = nodePositions.get(link.target);
      if (!source || !target) return;
      linkGroup
        .append("path")
        .attr("d", `M${source.x},${source.y} L${target.x},${target.y}`)
        .attr("stroke", "#E5E7EB")
        .attr("stroke-width", 2)
        .attr("fill", "none");
    });

    // Draw nodes
    const nodeGroup = svg.append("g");
    nodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      const color =
        node.status === "healthy"
          ? "#10B981"
          : node.status === "warning"
            ? "#F59E0B"
            : "#EF4444";
      const group = nodeGroup
        .append("g")
        .attr("transform", `translate(${pos.x},${pos.y})`);
      group
        .append("circle")
        .attr("r", 20)
        .attr("fill", "white")
        .attr("stroke", color)
        .attr("stroke-width", 2);
      group
        .append("circle")
        .attr("r", 6)
        .attr("cx", 14)
        .attr("cy", -14)
        .attr("fill", color);
      group
        .append("text")
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .attr("fill", "#374151")
        .attr("font-size", "12px")
        .text(node.id);
    });
  }, [nodes, links]);

  return (
    <div className="w-full h-[600px] relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
};

export default SystemVisualization;
