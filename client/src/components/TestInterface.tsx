import React, { useState } from "react";

interface TestInterfaceProps {
  onRunTest: (testType: string, count: number) => void;
  isLoading: boolean;
}

const TestInterface: React.FC<TestInterfaceProps> = ({
  onRunTest,
  isLoading,
}) => {
  const [requestCount, setRequestCount] = useState<number>(100);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const testTypes = [
    {
      id: "read",
      label: "Read Requests",
      description: "Send GET requests to fetch profiles",
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      color: "blue",
    },
    {
      id: "write",
      label: "Write Requests",
      description: "Send POST requests to create profiles",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      color: "green",
    },
    {
      id: "mixed",
      label: "Mixed Requests",
      description: "Send a mix of read and write requests",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      color: "purple",
    },
    {
      id: "burst",
      label: "Burst Requests",
      description: "Send a burst of requests in a short time",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: "yellow",
    },
  ];

  const getColorClass = (color: string, isSelected: boolean) => {
    const baseClass = isSelected ? "border-2" : "border hover:border-2";
    switch (color) {
      case "blue":
        return `${baseClass} ${
          isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-blue-500"
        }`;
      case "green":
        return `${baseClass} ${
          isSelected
            ? "border-green-500 bg-green-50"
            : "border-gray-200 hover:border-green-500"
        }`;
      case "purple":
        return `${baseClass} ${
          isSelected
            ? "border-purple-500 bg-purple-50"
            : "border-gray-200 hover:border-purple-500"
        }`;
      case "yellow":
        return `${baseClass} ${
          isSelected
            ? "border-yellow-500 bg-yellow-50"
            : "border-gray-200 hover:border-yellow-500"
        }`;
      default:
        return `${baseClass} border-gray-200`;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Test Scenarios</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Requests
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            value={requestCount}
            onChange={(e) => setRequestCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            min="1"
            max="1000"
          />
          <div className="relative">
            <input
              type="number"
              value={requestCount}
              onChange={(e) => setRequestCount(Number(e.target.value))}
              className="w-24 px-3 py-2 border rounded-md"
              min="1"
              max="1000"
            />
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
              Max: 1000
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {testTypes.map((test) => (
          <div
            key={test.id}
            className={`rounded-lg p-4 cursor-pointer transition-all duration-200 ${getColorClass(
              test.color,
              selectedTest === test.id
            )}`}
            onClick={() => setSelectedTest(test.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg bg-${test.color}-100`}>
                {test.icon}
              </div>
              <div>
                <h3 className="font-medium mb-1">{test.label}</h3>
                <p className="text-sm text-gray-600">{test.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (selectedTest) {
              onRunTest(selectedTest, requestCount);
            }
          }}
          disabled={isLoading || !selectedTest}
          className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
            isLoading
              ? "bg-gray-200 cursor-not-allowed"
              : selectedTest
                ? `bg-${testTypes.find((t) => t.id === selectedTest)
                    ?.color}-500 hover:bg-${testTypes.find(
                    (t) => t.id === selectedTest
                  )?.color}-600 text-white`
                : "bg-gray-200 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Running Test...
            </>
          ) : (
            <>
              Run Test
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TestInterface;
