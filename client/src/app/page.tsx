"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export interface Pod {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age: string;
  type: "nginx" | "service" | "redis" | "mongodb";
}

export interface Link {
  source: string;
  target: string;
  value: number;
}

export default function Home() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [connections, setConnections] = useState<Link[]>([]);
  const [requestsPerSecond] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockedData, setIsMockedData] = useState(false);

  const mockPods = useMemo(
    () => [
      {
        name: "postgres",
        status: "Running",
        ready: true,
        restarts: 0,
        age: "1h",
        type: "service",
      },
      {
        name: "profile",
        status: "Running",
        ready: true,
        restarts: 0,
        age: "1h",
        type: "service",
      },
      {
        name: "profile-2",
        status: "Running",
        ready: true,
        restarts: 0,
        age: "1h",
        type: "service",
      },
      {
        name: "profile-3",
        status: "Warning",
        ready: false,
        restarts: 2,
        age: "1h",
        type: "service",
      },
      {
        name: "rabbitmq",
        status: "Running",
        ready: true,
        restarts: 0,
        age: "1h",
        type: "service",
      },
      {
        name: "redis",
        status: "Error",
        ready: false,
        restarts: 3,
        age: "1h",
        type: "redis",
      },
    ],
    []
  );

  const mockConnections = useMemo(
    () => [
      { source: "postgres", target: "redis", value: 1 },
      { source: "profile", target: "redis", value: 1 },
      { source: "profile-2", target: "redis", value: 1 },
      { source: "profile-3", target: "redis", value: 1 },
      { source: "rabbitmq", target: "redis", value: 1 },
    ],
    []
  );

  useEffect(() => {
    const fetchSystemState = async () => {
      try {
        const response = await fetch("/api/cluster-status");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Fetched pod data:", data); // Debug log
        const transformedPods: Pod[] = data.map((pod: Pod) => ({
          ...pod,
          type: getPodType(pod.name),
        }));
        setPods(transformedPods);
        // Create connections based on pod types
        const newConnections: Link[] = [];
        const nginxPods = transformedPods.filter(
          (p: Pod) => p.type === "nginx"
        );
        const servicePods = transformedPods.filter(
          (p: Pod) => p.type === "service"
        );
        const redisPod = transformedPods.find((p: Pod) => p.type === "redis");
        const mongodbPod = transformedPods.find(
          (p: Pod) => p.type === "mongodb"
        );
        nginxPods.forEach((nginx: Pod) => {
          servicePods.forEach((service: Pod) => {
            newConnections.push({
              source: nginx.name,
              target: service.name,
              value: Math.floor(Math.random() * 10) + 1,
            });
          });
        });
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
        setIsMockedData(false);
      } catch (error) {
        console.error("Error fetching system state:", error);
        setPods(mockPods as Pod[]);
        setConnections(mockConnections);
        setIsMockedData(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSystemState();
    const interval = setInterval(fetchSystemState, 2000);
    return () => clearInterval(interval);
  }, [mockPods, mockConnections]);

  function getPodType(name: string): "nginx" | "service" | "redis" | "mongodb" {
    if (name.includes("nginx-lb")) return "nginx";
    if (name.includes("profile-service")) return "service";
    if (name.includes("redis")) return "redis";
    if (name.includes("mongodb")) return "mongodb";
    return "service"; // default type
  }

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
        isMockedData={isMockedData}
      />
    </main>
  );
}
