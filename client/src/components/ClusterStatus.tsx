import React from "react";

interface Pod {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age: string;
}

interface ClusterStatusProps {
  pods: Pod[];
  onRefresh: () => void;
}

const ClusterStatus: React.FC<ClusterStatusProps> = ({
  pods = [],
  onRefresh,
}) => {
  // Calculate cluster health percentage
  const healthyPods = pods.filter(
    (pod) => pod.status === "Running" && pod.ready
  ).length;
  const healthPercentage =
    pods.length > 0 ? (healthyPods / pods.length) * 100 : 0;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Cluster Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            {healthyPods} of {pods.length} pods healthy
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="h-2 w-24 bg-gray-200 rounded-full">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  healthPercentage >= 90
                    ? "bg-green-500"
                    : healthPercentage >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {Math.round(healthPercentage)}% healthy
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pods?.map((pod) => (
          <div
            key={pod.name}
            className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 relative group"
          >
            <div className="absolute -top-1 -right-1">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  pod.status === "Running" && pod.ready
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              >
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    pod.status === "Running" && pod.ready
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                ></span>
              </span>
            </div>
            <div className="flex justify-between items-start mb-3">
              <h3
                className="font-medium text-sm truncate flex-1"
                title={pod.name}
              >
                {pod.name}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pod.status === "Running"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {pod.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Ready</span>
                <span className={pod.ready ? "text-green-600" : "text-red-600"}>
                  {pod.ready ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Restarts</span>
                <span
                  className={`${
                    pod.restarts > 0 ? "text-yellow-600" : "text-gray-900"
                  }`}
                >
                  {pod.restarts}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Age</span>
                <span className="text-gray-900">{pod.age}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-xs text-gray-500">
                <p>Click for more details</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClusterStatus;
