
// When running inside the cluster, use the internal service name
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://profile-service:8080";

interface RequestResult {
  success: boolean;
  time: number;
  pod: string;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  podDistribution: Record<string, number>;
}

async function sendRequest(
  url: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<RequestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_URL}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const endTime = Date.now();
    return {
      success: response.ok,
      time: endTime - startTime,
      pod: response.headers.get("X-Pod-Name") || "unknown",
    };
  } catch (error) {
    console.error("Request failed:", error);
    const endTime = Date.now();
    return {
      success: false,
      time: endTime - startTime,
      pod: "unknown",
    };
  }
}

async function runReadTest(count: number): Promise<TestResult> {
  console.log(`Running read test with ${count} requests`);
  const results = await Promise.all(
    Array(count)
      .fill(null)
      .map(() => sendRequest("/api/v1/profiles"))
  );

  const totalTime = results.reduce((sum, r) => sum + r.time, 0);
  const podCounts = results.reduce(
    (acc, r) => {
      acc[r.pod] = (acc[r.pod] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const result = {
    totalRequests: count,
    successfulRequests: results.filter((r) => r.success).length,
    failedRequests: results.filter((r) => !r.success).length,
    avgResponseTime: totalTime / count,
    requestsPerSecond: Math.round((count / (totalTime / 1000)) * 100) / 100,
    podDistribution: podCounts,
  };

  console.log("Read test results:", result);
  return result;
}

async function runWriteTest(count: number): Promise<TestResult> {
  console.log(`Running write test with ${count} requests`);
  const results = await Promise.all(
    Array(count)
      .fill(null)
      .map(() =>
        sendRequest("/api/v1/profiles", "POST", {
          name: "Test User",
          email: "test@example.com",
          bio: "Test profile",
        })
      )
  );

  const totalTime = results.reduce((sum, r) => sum + r.time, 0);
  const podCounts = results.reduce(
    (acc, r) => {
      acc[r.pod] = (acc[r.pod] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const result = {
    totalRequests: count,
    successfulRequests: results.filter((r) => r.success).length,
    failedRequests: results.filter((r) => !r.success).length,
    avgResponseTime: totalTime / count,
    requestsPerSecond: Math.round((count / (totalTime / 1000)) * 100) / 100,
    podDistribution: podCounts,
  };

  console.log("Write test results:", result);
  return result;
}

async function runMixedTest(count: number): Promise<TestResult> {
  console.log(`Running mixed test with ${count} requests`);
  const results = await Promise.all(
    Array(count)
      .fill(null)
      .map((_, i) =>
        i % 2 === 0
          ? sendRequest("/api/v1/profiles")
          : sendRequest("/api/v1/profiles", "POST", {
              name: "Test User",
              email: "test@example.com",
              bio: "Test profile",
            })
      )
  );

  const totalTime = results.reduce((sum, r) => sum + r.time, 0);
  const podCounts = results.reduce(
    (acc, r) => {
      acc[r.pod] = (acc[r.pod] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const result = {
    totalRequests: count,
    successfulRequests: results.filter((r) => r.success).length,
    failedRequests: results.filter((r) => !r.success).length,
    avgResponseTime: totalTime / count,
    requestsPerSecond: Math.round((count / (totalTime / 1000)) * 100) / 100,
    podDistribution: podCounts,
  };

  console.log("Mixed test results:", result);
  return result;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { testType, count }: { testType: string; count: number } =
      await request.json();
    console.log(`Received test request - type: ${testType}, count: ${count}`);

    let result: TestResult;

    switch (testType) {
      case "read":
        result = await runReadTest(count);
        break;
      case "write":
        result = await runWriteTest(count);
        break;
      case "mixed":
        result = await runMixedTest(count);
        break;
      default:
        console.error("Invalid test type:", testType);
        return Response.json({ error: "Invalid test type" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Error running test:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
