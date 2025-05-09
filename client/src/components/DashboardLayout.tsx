import React, { useState, useEffect } from "react";
import SystemVisualization from "./SystemVisualization";
import TrafficControlPanel from "./TrafficControlPanel";
import PrometheusMetrics from "./PrometheusMetrics";
import SystemLogs from "./SystemLogs";
import type { Pod, Link } from "../app/page";
import type { PodWithMetrics } from "../types/podWithMetrics";
import { useClusterMetrics } from "../hooks/useClusterMetrics";
import { mockPods } from "../lib/mockClusterData";

interface DashboardLayoutProps {
  pods?: Pod[];
  connections: Link[];
  requestsPerSecond: number;
  isMockedData?: boolean;
}

type TabType = "traffic" | "prometheus" | "logs";

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  connections,
  requestsPerSecond,
  isMockedData = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("traffic");
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: clusterPods,
    loading,
    error,
    isMocked,
    mockReason,
  } = useClusterMetrics();

  // Choose which pods to use
  const podsToUse: PodWithMetrics[] = clusterPods || mockPods;
  const isShowingMockData = isMockedData || isMocked;

  // Debug logs
  useEffect(() => {
    console.log("[DashboardLayout] Metrics state update:", {
      hasClusterPods: !!clusterPods,
      podCount: clusterPods?.length || 0,
      loading,
      error: error || null,
      isMocked,
      mockReason,
      isShowingMockData,
      activeTab,
    });
  }, [
    clusterPods,
    loading,
    error,
    isMocked,
    mockReason,
    isShowingMockData,
    activeTab,
  ]);

  const handleTabChange = (tabId: TabType) => {
    if (tabId === activeTab) return;
    setIsLoading(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setIsLoading(false);
    }, 150);
  };

  const getTabContent = () => {
    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "traffic":
        return <TrafficControlPanel />;
      case "prometheus":
        return <PrometheusMetrics />;
      case "logs":
        return <SystemLogs />;
    }
  };

  return (
    <div className="h-screen w-full bg-gray-100">
      {isShowingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <strong>Warning:</strong> Showing mocked data
          {mockReason ? ` (${mockReason})` : ""}
        </div>
      )}
      <div className="grid grid-cols-12 gap-4 h-full p-4">
        {/* Left section - Takes up 8/12 (2/3) of the screen */}
        <div className="col-span-8 bg-white rounded-lg shadow-sm p-4 overflow-auto">
          {loading ? (
            <div className="text-gray-500 p-8 text-center">
              Loading cluster metrics...
            </div>
          ) : (
            <SystemVisualization
              pods={podsToUse}
              connections={connections}
              requestsPerSecond={requestsPerSecond}
              isMockedData={isShowingMockData}
              mockReason={mockReason}
            />
          )}
        </div>

        {/* Right section - Takes up 4/12 (1/3) of the screen */}
        <div className="col-span-4 bg-white rounded-lg shadow-sm p-4 flex flex-col">
          {/* Navigation Bar */}
          <nav className="mb-4">
            <h1 className="text-xl font-semibold text-gray-800 mb-4">
              Profile Service Dashboard
            </h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTabChange("traffic")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "traffic"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Traffic Control
              </button>
              <button
                onClick={() => handleTabChange("prometheus")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "prometheus"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Prometheus
              </button>
              <button
                onClick={() => handleTabChange("logs")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "logs"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Logs
              </button>
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">{getTabContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
