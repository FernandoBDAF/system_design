import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface SystemVisualizationProps {
  pods: any[];
  connections: any[];
  requestsPerSecond: number;
}

interface Node {
  id: string;
  type: "pod" | "service";
  layer: "load-balancer" | "service" | "storage";
  status: "healthy" | "warning" | "error";
}

interface Link {
  source: string;
  target: string;
  value: number;
}

const SystemVisualization: React.FC<SystemVisualizationProps> = ({
  pods,
  connections,
  requestsPerSecond,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Mock data for visualization
  const nodes: Node[] = [
    { id: "postgres", type: "pod", layer: "service", status: "healthy" },
    { id: "profile", type: "pod", layer: "service", status: "healthy" },
    { id: "profile-2", type: "pod", layer: "service", status: "healthy" },
    { id: "profile-3", type: "pod", layer: "service", status: "warning" },
    { id: "rabbitmq", type: "pod", layer: "service", status: "healthy" },
    { id: "redis", type: "pod", layer: "storage", status: "error" },
  ];

  const links: Link[] = [
    { source: "postgres", target: "redis", value: 1 },
    { source: "profile", target: "redis", value: 1 },
    { source: "profile-2", target: "redis", value: 1 },
    { source: "profile-3", target: "redis", value: 1 },
    { source: "rabbitmq", target: "redis", value: 1 },
  ];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create layers
    const layers = ["Load Balancer Layer", "Service Layer", "Storage Layer"];
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
      .text((d) => d);

    // Create node positions
    const nodePositions = new Map();
    nodes.forEach((node) => {
      const layerIndex =
        node.layer === "load-balancer" ? 0 : node.layer === "service" ? 1 : 2;
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

      // Node circle
      group
        .append("circle")
        .attr("r", 20)
        .attr("fill", "white")
        .attr("stroke", color)
        .attr("stroke-width", 2);

      // Status indicator
      group
        .append("circle")
        .attr("r", 6)
        .attr("cx", 14)
        .attr("cy", -14)
        .attr("fill", color);

      // Label
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
