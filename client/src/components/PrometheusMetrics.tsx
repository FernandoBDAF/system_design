import React from "react";

const PrometheusMetrics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Service Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Request Rate</div>
            <div className="text-2xl font-semibold mt-1">2.5k/s</div>
            <div className="mt-2 h-16 bg-gray-200 rounded">
              {/* Placeholder for chart */}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Error Rate</div>
            <div className="text-2xl font-semibold mt-1">0.1%</div>
            <div className="mt-2 h-16 bg-gray-200 rounded">
              {/* Placeholder for chart */}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Resource Usage
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">CPU Usage</span>
              <span className="text-sm font-medium">75%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: "75%" }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Memory Usage</span>
              <span className="text-sm font-medium">60%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Alert Rules</h3>
        <div className="space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
              <span className="text-sm text-yellow-800">
                High CPU Usage Warning
              </span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              CPU usage above 70% for 5 minutes
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              <span className="text-sm text-red-800">
                Memory Usage Critical
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Memory usage above 85% for 10 minutes
            </p>
          </div>
        </div>
      </div>

      {/* Query Interface */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">PromQL Query</h3>
        <div className="space-y-2">
          <textarea
            className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter PromQL query..."
          ></textarea>
          <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            Execute Query
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrometheusMetrics;
