import React from "react";
import PrometheusMetrics from "./PrometheusMetrics";
import KubernetesMetrics from "./KubernetesMetrics";

const MetricsDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Application Metrics
        </h2>
        <PrometheusMetrics />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Kubernetes Metrics
        </h2>
        <KubernetesMetrics />
      </div>
    </div>
  );
};

export default MetricsDashboard;
