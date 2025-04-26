import { useState, useEffect, useCallback } from "react";

export type ConnectionStatus = "connected" | "connecting" | "error";

interface UseConnectionOptions {
  url: string;
  retryInterval?: number;
  maxRetries?: number;
}

interface UseConnectionReturn {
  status: ConnectionStatus;
  lastError: Error | null;
  send: (data: any) => void;
  reconnect: () => void;
}

export function useConnection({
  url,
  retryInterval = 5000,
  maxRetries = 3,
}: UseConnectionOptions): UseConnectionReturn {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
  }, [retryTimeout]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus("connected");
        setLastError(null);
        setRetryCount(0);
        clearRetryTimeout();
      };

      ws.onclose = () => {
        setStatus("error");
        setSocket(null);

        if (retryCount < maxRetries) {
          const timeout = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            setStatus("connecting");
            connect();
          }, retryInterval);
          setRetryTimeout(timeout);
        }
      };

      ws.onerror = (error) => {
        setLastError(error as unknown as Error);
        setStatus("error");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle different message types
          switch (data.type) {
            case "pods":
              // Handle pods update
              break;
            case "metrics":
              // Handle metrics update
              break;
            case "error":
              setLastError(new Error(data.message));
              break;
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      setSocket(ws);
    } catch (error) {
      setLastError(error as Error);
      setStatus("error");
    }
  }, [url, retryCount, maxRetries, retryInterval, clearRetryTimeout]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    setRetryCount(0);
    setStatus("connecting");
    connect();
  }, [socket, connect]);

  const send = useCallback(
    (data: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      } else {
        setLastError(
          new Error("Cannot send message: WebSocket is not connected")
        );
      }
    },
    [socket]
  );

  useEffect(() => {
    connect();
    return () => {
      clearRetryTimeout();
      if (socket) {
        socket.close();
      }
    };
  }, [connect, socket, clearRetryTimeout]);

  return {
    status,
    lastError,
    send,
    reconnect,
  };
}
