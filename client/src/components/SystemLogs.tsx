import React, { useState } from "react";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  service: string;
  message: string;
}

const SystemLogs: React.FC = () => {
  const [logLevel, setLogLevel] = useState<"all" | "info" | "warn" | "error">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Mock log data
  const logs: LogEntry[] = [
    {
      timestamp: "2024-04-25 21:36:54",
      level: "error",
      service: "profile-client",
      message: "Failed to connect to localhost:3000: connection refused",
    },
    {
      timestamp: "2024-04-25 21:36:53",
      level: "warn",
      service: "profile-server",
      message: "High memory usage detected: 85% utilized",
    },
    {
      timestamp: "2024-04-25 21:36:52",
      level: "info",
      service: "redis",
      message: "Successfully processed 1000 requests in the last minute",
    },
  ];

  const getLevelColor = (level: "info" | "warn" | "error") => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warn":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="space-y-4">
      {/* Log Controls */}
      <div className="flex space-x-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          value={logLevel}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setLogLevel(e.target.value as typeof logLevel)
          }
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Log Viewer */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-1">Level</div>
            <div className="col-span-2">Service</div>
            <div className="col-span-7">Message</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="px-4 py-3 hover:bg-gray-50">
              <div className="grid grid-cols-12 gap-4 text-sm">
                <div className="col-span-2 text-gray-500">{log.timestamp}</div>
                <div className="col-span-1">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>
                </div>
                <div className="col-span-2 text-gray-600">{log.service}</div>
                <div className="col-span-7 text-gray-900">{log.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-refresh Toggle */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="auto-refresh"
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="auto-refresh" className="text-sm text-gray-600">
            Auto-refresh (5s)
          </label>
        </div>
        <button className="text-sm text-indigo-600 hover:text-indigo-700">
          Clear Logs
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;
