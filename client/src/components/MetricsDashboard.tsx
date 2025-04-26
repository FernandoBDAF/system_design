import React from "react";

const MetricsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Real-time Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-xs text-gray-500">CPU Usage</div>
            <div className="text-lg font-semibold">45%</div>
            <div className="h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: "45%" }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-xs text-gray-500">Memory Usage</div>
            <div className="text-lg font-semibold">512MB</div>
            <div className="h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-2 bg-green-500 rounded-full"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Request Metrics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Requests/sec</span>
            <span className="text-sm font-medium">150</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Avg. Latency</span>
            <span className="text-sm font-medium">120ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Error Rate</span>
            <span className="text-sm font-medium text-red-600">2.5%</span>
          </div>
        </div>
      </div>

      {/* Pod Status */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Pod Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total Pods</span>
            <span className="text-sm font-medium">8</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Running</span>
            <span className="text-sm font-medium text-green-600">7</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Pending</span>
            <span className="text-sm font-medium text-yellow-600">1</span>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Recent Events
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          <div className="text-sm bg-gray-50 p-2 rounded">
            <div className="font-medium">Pod Scaled Up</div>
            <div className="text-xs text-gray-500">2 minutes ago</div>
          </div>
          <div className="text-sm bg-gray-50 p-2 rounded">
            <div className="font-medium">High CPU Usage Alert</div>
            <div className="text-xs text-gray-500">5 minutes ago</div>
          </div>
          <div className="text-sm bg-gray-50 p-2 rounded">
            <div className="font-medium">Pod Restarted</div>
            <div className="text-xs text-gray-500">10 minutes ago</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
