import React, { useState } from "react";

interface TrafficControlPanelProps {}

const TrafficControlPanel: React.FC<TrafficControlPanelProps> = () => {
  const [requestRate, setRequestRate] = useState(100);
  const [requestType, setRequestType] = useState("GET");
  const [payloadSize, setPayloadSize] = useState(1);
  const [errorRate, setErrorRate] = useState(0);
  const [scenario, setScenario] = useState("Custom");
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = () => {
    setIsRunning(true);
    // Add logic to start traffic simulation
  };

  const handleStop = () => {
    setIsRunning(false);
    // Add logic to stop traffic simulation
  };

  return (
    <div className="space-y-6">
      {/* Request Rate Control */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="requestRate"
            className="block text-sm font-medium text-gray-700"
          >
            Request Rate (RPS)
          </label>
          <span className="text-sm text-gray-500">{requestRate} req/s</span>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            id="requestRate"
            min="0"
            max="1000"
            value={requestRate}
            onChange={(e) => setRequestRate(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Request Type Selection */}
      <div className="space-y-2">
        <label
          htmlFor="requestType"
          className="block text-sm font-medium text-gray-700"
        >
          Request Type
        </label>
        <select
          id="requestType"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
        </select>
      </div>

      {/* Payload Size */}
      <div className="space-y-2">
        <label
          htmlFor="payloadSize"
          className="block text-sm font-medium text-gray-700"
        >
          Payload Size (KB)
        </label>
        <input
          type="number"
          id="payloadSize"
          value={payloadSize}
          onChange={(e) => setPayloadSize(Number(e.target.value))}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Error Rate */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="errorRate"
            className="block text-sm font-medium text-gray-700"
          >
            Error Rate (%)
          </label>
          <span className="text-sm text-gray-500">{errorRate}%</span>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            id="errorRate"
            min="0"
            max="100"
            value={errorRate}
            onChange={(e) => setErrorRate(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <label
          htmlFor="scenario"
          className="block text-sm font-medium text-gray-700"
        >
          Scenarios
        </label>
        <select
          id="scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option>Custom</option>
          <option>Gradual Increase</option>
          <option>Traffic Spike</option>
          <option>Random Pattern</option>
        </select>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
            ${
              isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            }`}
        >
          Start
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
            ${
              !isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            }`}
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default TrafficControlPanel;
