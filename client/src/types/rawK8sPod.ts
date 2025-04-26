export interface K8sPod {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    [key: string]: unknown;
  };
  spec: {
    containers: Array<{
      name: string;
      image: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  status: {
    phase: string;
    podIP?: string;
    podIPs?: Array<{ ip: string }>;
    containerStatuses?: Array<{
      name: string;
      ready: boolean;
      restartCount: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
