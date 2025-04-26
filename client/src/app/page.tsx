"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Pod {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age: string;
  type: "nginx" | "service" | "redis" | "mongodb";
}

interface Link {
  source: string;
  target: string;
  value: number;
}

export default function Home() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [connections, setConnections] = useState<Link[]>([]);
  const [requestsPerSecond, setRequestsPerSecond] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSystemState = async () => {
    try {
      const response = await fetch("/api/cluster-status");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Fetched pod data:", data); // Debug log

      // Transform pod data to include type
      const transformedPods = data.map((pod: any) => ({
        ...pod,
        type: getPodType(pod.name),
      }));
      console.log("Transformed pods:", transformedPods); // Debug log

      setPods(transformedPods);

      // Create connections based on pod types
      const newConnections: Link[] = [];
      const nginxPods = transformedPods.filter((p: Pod) => p.type === "nginx");
      const servicePods = transformedPods.filter(
        (p: Pod) => p.type === "service"
      );
      const redisPod = transformedPods.find((p: Pod) => p.type === "redis");
      const mongodbPod = transformedPods.find((p: Pod) => p.type === "mongodb");

      // Connect nginx to all service pods
      nginxPods.forEach((nginx: Pod) => {
        servicePods.forEach((service: Pod) => {
          newConnections.push({
            source: nginx.name,
            target: service.name,
            value: Math.floor(Math.random() * 10) + 1,
          });
        });
      });

      // Connect all service pods to Redis and MongoDB
      if (servicePods.length) {
        if (redisPod) {
          servicePods.forEach((service: Pod) => {
            newConnections.push({
              source: service.name,
              target: redisPod.name,
              value: Math.floor(Math.random() * 5) + 1,
            });
          });
        }

        if (mongodbPod) {
          servicePods.forEach((service: Pod) => {
            newConnections.push({
              source: service.name,
              target: mongodbPod.name,
              value: Math.floor(Math.random() * 5) + 1,
            });
          });
        }
      }

      console.log("New connections:", newConnections); // Debug log
      setConnections(newConnections);
    } catch (error) {
      console.error("Error fetching system state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  function getPodType(name: string): "nginx" | "service" | "redis" | "mongodb" {
    if (name.includes("nginx-lb")) return "nginx";
    if (name.includes("profile-service")) return "service";
    if (name.includes("redis")) return "redis";
    if (name.includes("mongodb")) return "mongodb";
    return "service"; // default type
  }

  const handleRunTest = async (type: string, count: number) => {
    setRequestsPerSecond(0); // Reset the counter
  };

  useEffect(() => {
    fetchSystemState();
    const interval = setInterval(fetchSystemState, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main>
      <DashboardLayout
        pods={pods}
        connections={connections}
        requestsPerSecond={requestsPerSecond}
      />
    </main>
  );
}
