import React, { useState } from "react";

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  podDistribution: Record<string, number>;
}

interface TestControlsProps {
  onRunTest: (type: string, count: number) => Promise<void>;
}

export default function TestControls({ onRunTest }: TestControlsProps) {
  const [testType, setTestType] = React.useState("read");
  const [requestCount, setRequestCount] = React.useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType, count: requestCount }),
      });

      if (!response.ok) {
        throw new Error("Failed to run test");
      }

      const data = await response.json();
      setResult(data);
      onRunTest(testType, requestCount);
    } catch (err) {
      setError("Failed to run test. Please try again.");
      console.error("Test error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
          disabled={isLoading}
        >
          <option value="read">Read Test</option>
          <option value="write">Write Test</option>
          <option value="mixed">Mixed Test</option>
          <option value="burst">Burst Test</option>
        </select>

        <input
          type="number"
          value={requestCount}
          onChange={(e) => setRequestCount(Number(e.target.value))}
          min={1}
          max={1000}
          placeholder="Number of requests"
          className="w-full mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
          disabled={isLoading}
        />

        <button
          onClick={handleRunTest}
          disabled={isLoading}
          className={`w-full py-2 ${
            isLoading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white rounded-md text-sm font-medium transition-colors`}
        >
          {isLoading ? "Running Test..." : "Run Test"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-lg font-semibold">
                {result.totalRequests}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-lg font-semibold">
                {Math.round(
                  (result.successfulRequests / result.totalRequests) * 100
                )}
                %
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Avg Response Time</div>
              <div className="text-lg font-semibold">
                {result.avgResponseTime.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Requests/Second</div>
              <div className="text-lg font-semibold">
                {result.requestsPerSecond}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Pod Distribution</div>
            <div className="space-y-2">
              {Object.entries(result.podDistribution).map(([pod, count]) => (
                <div key={pod} className="flex justify-between text-sm">
                  <span className="text-gray-600">{pod}</span>
                  <span className="font-medium">{count} requests</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
