import React from "react";
import {
  Card,
  Title,
  Text,
  Grid,
  Col,
  Metric,
  ProgressBar,
} from "@tremor/react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  podDistribution: Record<string, number>;
}

interface TestResultsProps {
  currentResult: TestResult;
  history: TestResult[];
}

export default function TestResults({
  currentResult,
  history,
}: TestResultsProps) {
  const successRate =
    (currentResult.successfulRequests / currentResult.totalRequests) * 100;

  // Prepare data for the response time chart
  const chartData = {
    labels: history.map((_, index) => `Test ${index + 1}`),
    datasets: [
      {
        label: "Average Response Time (ms)",
        data: history.map((result) => result.avgResponseTime),
        fill: true,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Response Time (ms)",
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Text>Total Requests</Text>
          <Metric>{currentResult.totalRequests}</Metric>
        </Card>
        <Card>
          <Text>Success Rate</Text>
          <Metric>{successRate.toFixed(1)}%</Metric>
          <ProgressBar value={successRate} color="emerald" className="mt-2" />
        </Card>
        <Card>
          <Text>Average Response Time</Text>
          <Metric>{currentResult.avgResponseTime.toFixed(2)} ms</Metric>
        </Card>
        <Card>
          <Text>Failed Requests</Text>
          <Metric>{currentResult.failedRequests}</Metric>
        </Card>
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Response Time History</Title>
          <div className="mt-6 h-72">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>

        <Card>
          <Title>Pod Distribution</Title>
          <div className="mt-6 space-y-4">
            {Object.entries(currentResult.podDistribution).map(
              ([pod, count]) => {
                const percentage = (count / currentResult.totalRequests) * 100;
                return (
                  <div key={pod}>
                    <div className="flex justify-between mb-1">
                      <Text>{pod}</Text>
                      <Text>
                        {count} requests ({percentage.toFixed(1)}%)
                      </Text>
                    </div>
                    <ProgressBar value={percentage} />
                  </div>
                );
              }
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
