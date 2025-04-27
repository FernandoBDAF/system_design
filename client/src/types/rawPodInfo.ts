// Example TypeScript interface for pod information
export interface RawPodInfo {
  metadata: {
    name: string;
    namespace: string;
    labels: {
      app: string; // Matches deployment selector
      podTemplateHash: string; // Links to specific deployment revision
    };
    ownerReferences: [
      {
        kind: string; // "Deployment"
        name: string; // Deployment name
        uid: string;
      },
    ];
  };
  spec: {
    containers: [
      {
        name: string;
        resources: {
          requests: { cpu: string; memory: string };
          limits: { cpu: string; memory: string };
        };
      },
    ];
  };
}
