# Profile Service Client

## How to Use This Document

This README is structured to help developers, operators, and contributors quickly understand, use, and extend the Profile Service Client. Each section is focused on a specific aspect of the project:

- **Development & Usage:** How to run, build, and develop the client locally and in production.
- **Kubernetes Deployment:** How the client is deployed and managed in a Kubernetes environment, including Makefile usage.
- **Architecture & Technical Decisions:** The rationale behind major technical and integration choices, including frontend stack, API integration, Kubernetes alignment, Docker/build pipeline, and how the client fits with the rest of the system.
- **Monitoring & Observability:** How the client supports operational visibility, including Prometheus, Grafana, and real-time metrics.
- **Troubleshooting:** Common issues and their solutions for both development and production environments.
- **Learn More:** Resources for learning about Next.js and related technologies.

When adding new information, please:

- Place usage instructions in the appropriate section (Development, Deployment, etc.).
- Document new technical decisions or architectural changes in the "Architecture & Technical Decisions" section.
- Add new troubleshooting tips to the Troubleshooting section.
- Keep the structure consistent for easy navigation.

---

## Project Configuration (Next.js 15 + Tailwind CSS v4)

This project is built with the latest **Next.js 15 App Router** and **Tailwind CSS v4**, providing a modern, scalable, and fast development experience. Below are the key configuration details and nuances that make this setup robust and future-proof:

### Key Configuration Highlights

- **Next.js 15 App Router**: All routing, layouts, and server/client components are managed in `src/app/` using the new App Router paradigm. This enables advanced routing, layouts, and React Server Components.
- **Turbopack**: Uses Turbopack (the new default build tool in Next.js 15) for faster builds and hot module replacement.
- **TypeScript**: The project is fully typed, including configuration files, for safety and maintainability.
- **Tailwind CSS v4**:
  - Uses the new `@tailwindcss/postcss` plugin (required for Turbopack/Next.js 15+).
  - Global styles are imported with a single `@import "tailwindcss";` in `src/app/globals.css`.
  - No need for `@tailwind base;`, `@tailwind components;`, or `@tailwind utilities;` in Tailwind v4+ with Turbopack.
  - The `tailwind.config.ts` file is written in TypeScript and all customizations (colors, animations, etc.) are under `theme.extend`.
  - The `content` array is set to `./src/**/*.{js,ts,jsx,tsx,mdx}` to ensure all files are scanned for Tailwind classes.
- **PostCSS Configuration**:
  - The `postcss.config.mjs` file uses the array syntax: `plugins: ["@tailwindcss/postcss"]`.
  - No need for `autoprefixer` or the object syntax with Turbopack.
- **Directory Structure**:
  - All code is organized under `src/` for clarity and maintainability.
  - Key folders: `app/` (routing, layouts, pages, API), `components/` (reusable React components), `hooks/`, `lib/`, and `types/`.
- **Custom Theming**:
  - Custom colors and theming are handled via CSS variables and referenced in `tailwind.config.ts`.
  - Animations and other utilities are added via plugins like `tailwindcss-animate`.
- **Dark Mode**:
  - Enabled via `darkMode: "class"` for full control.
- **Best Practices**:
  - Always restart the dev server after config changes.
  - Avoid dynamic class names; Tailwind only generates classes it can statically find in your code.
  - Import global CSS only in `layout.tsx`.
  - Use a single global CSS file (e.g., `globals.css` in `src/app/`).

### Troubleshooting & Nuances

- If styles don't show up, check your `postcss.config.mjs` and `tailwind.config.ts` for typos, and ensure you restarted the dev server.
- If only some classes work, check for typos or dynamic class names.
- Delete `.next`, `node_modules`, and `package-lock.json` and reinstall if needed.
- For more details, see the [Tailwind Next.js Guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

---

## Features

- Real-time pod monitoring and status display
- Profile management interface
- Cache status visualization
- Task monitoring
- Integration with Prometheus and Grafana
- Traffic simulation and system adaptation visualization
- Real-time connection status monitoring
- Graceful error handling and recovery

## UI Components and Features

### 1. Traffic Control Panel

- Request rate control (RPS)
- Request type selection (GET/POST/PUT/DELETE)
- Payload size configuration
- Error rate injection
- Preset scenarios:
  - Traffic spike simulation
  - Gradual increase/decrease
  - Random traffic patterns
- Real-time feedback on connection status
- Error state handling with automatic retry

### 2. System Visualization

- Real-time pod status display
- Traffic flow visualization
- Resource usage indicators
- Health status monitoring
- Connection strength visualization
- Force-directed layout for pod arrangement
- Scaling event animations
- Visual feedback for system state:
  - Connected state (green indicator)
  - Connecting state (yellow pulsing indicator)
  - Error state (red indicator with warning message)
- Graceful degradation during connection issues

### 3. Metrics Dashboard

- Real-time metrics display:
  - CPU/Memory usage per pod
  - Request latency
  - Error rates
  - Scaling events
  - Queue lengths
- Historical data visualization
- Alert indicators
- Loading states with skeleton UI
- Error boundary handling
- Connection status integration

## Connection Status Features

The dashboard now includes comprehensive connection status monitoring:

- Visual status indicator in the navigation bar
- Color-coded status indicators:
  - Green: Connected and healthy
  - Yellow (pulsing): Connecting/reconnecting
  - Red: Connection error
- Error messages with context
- Automatic reconnection attempts
- Graceful UI degradation during outages
- Loading states during transitions

## Error Handling

The client implements robust error handling:

- Visual feedback for connection issues
- Graceful degradation of functionality
- Automatic retry mechanisms
- User-friendly error messages
- Component-level error boundaries
- Loading states during recovery
- Skeleton UI during data fetching

## Kubernetes Integration

The client is designed to run in a Kubernetes environment and includes:

- Service account configuration for pod monitoring
- RBAC permissions to read pod information
- Environment variable configuration for service discovery
- Health checks and resource limits:
  - Memory: 512Mi limit, 256Mi request
  - CPU: 500m limit, 200m request
  - Liveness probe: 60s initial delay, 15s period, 5s timeout
  - Readiness probe: 30s initial delay, 10s period, 5s timeout

## Access Methods

The client can be accessed in two ways:

1. **Port Forwarding** (Development):

   ```bash
   make port-forward
   ```

   Then access at: http://localhost:3000

2. **NodePort** (Direct Cluster Access):
   Access at: http://localhost:30030

## Environment Variables

- `NEXT_PUBLIC_API_URL`: URL of the profile service API (default: http://profile-service:8080)
- `NAMESPACE`: Kubernetes namespace for pod monitoring (default: profile-service)
- `RETRY_INTERVAL`: Interval for connection retry attempts (default: 5000)
- `MAX_RETRY_ATTEMPTS`: Maximum number of retry attempts (default: 3)

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Kubernetes Deployment

The client is deployed as part of the profile service stack using the Makefile:

```bash
# Build and deploy everything
make start

# View logs
make logs COMPONENT=client

# Check connection status
make check-connection
```

## Architecture & Technical Decisions

### 1. Frontend Stack: Next.js 15 + TypeScript + Tailwind CSS

- **Next.js 15**: Chosen for its modern React features (App Router, Server Components, Turbopack), fast builds, and suitability for real-time dashboards.
- **TypeScript**: Enforced strict typing for maintainability and reliability across the codebase.
- **Tailwind CSS v4**: Utility-first CSS for rapid prototyping and easy theming.
- **D3.js**: Used for custom, dynamic system visualizations.

### 2. API Integration & Data Flow

- **Next.js API Routes**: Used for secure, server-side integration with Kubernetes (via `@kubernetes/client-node`). This allows the frontend to fetch real-time cluster state without exposing the K8s API to the browser.
- **Type-Safe Data**: All API routes and data transformations use explicit types (e.g., `Pod`, `Link`, Kubernetes types) for safety and clarity.
- **Mock Data Fallback**: If the cluster API is unavailable, the UI falls back to mock data and alerts the user, ensuring the dashboard is always usable.

### 3. Kubernetes Alignment

- **Namespace & Service Discovery**: All components (client, server, worker) use the same `profile-service` namespace for easy service discovery and RBAC.
- **Resource Limits & Probes**: Deployments use resource requests/limits and health/readiness probes for robust operation in K8s.
- **RBAC & Service Accounts**: The client uses a service account with read-only permissions for pod monitoring, following least-privilege principles.
- **Deployment via Kustomize**: All manifests are managed in `k8s/simple/` and deployed via `kubectl apply -k`, ensuring consistency and easy overlays.

### 4. Docker & Build Pipeline

- **Monorepo-Friendly Dockerfile**: The Dockerfile is designed to work from the monorepo root, copying only the client folder for builds.
- **Pre-Build Lint & Type-Check**: Linting and type-checking are run before the production build to catch errors early.
- **Non-root User**: The Docker image runs as a non-root user for security.
- **kubectl in Image**: The client image includes `kubectl` for in-cluster API access and debugging.

### 5. Integration with Other Project Parts

- **Consistent API Contracts**: The client expects the same API endpoints and data shapes as the server exposes, ensuring seamless integration.
- **Shared Environment Variables**: All services use environment variables for configuration, making it easy to align settings across `client`, `server`, and `k8s`.
- **Makefile Orchestration**: The Makefile centralizes cluster management, build, and deployment for all components, ensuring reproducibility and ease of use.

### 6. Monitoring & Observability

- **Prometheus & Grafana**: The stack includes Prometheus and Grafana for metrics and dashboards, with the client providing links and integration points.
- **Real-Time Metrics**: The client fetches and visualizes real-time metrics, pod status, and logs, supporting operational visibility.

### 7. Error Handling & Resilience

- **Graceful Degradation**: The UI always shows something useful, even if the backend or cluster is down.
- **Automatic Retry & Status Indicators**: Connection status is always visible, and the client retries failed API calls.

### 8. Dependency Management & Compatibility

- **React Version and Peer Dependencies:**
  The project uses React 19, but some dependencies require React 18. The Dockerfile uses `npm install --legacy-peer-deps` to resolve these conflicts. This enables use of the latest React features, but contributors should monitor for compatibility issues and be ready to downgrade if needed.

### 9. Dockerfile Build Order

- **Source Code Copy Before Lint/Type-Check:**
  The Dockerfile copies all source files before running lint and type-check steps, ensuring static analysis tools have access to the full codebase and preventing build errors.

### 10. Mock Data Handling in React

- **useMemo for Mock Data:**
  Mock data is wrapped in `useMemo` to avoid unnecessary re-creation and to comply with React's linting rules, ensuring stable and efficient component behavior.

### 11. Error Handling Philosophy

- **Graceful Fallbacks:**
  The UI always provides feedback, even if the backend is down, by falling back to mock data and alerting the user.

### 12. Build & Linting in CI/CD

- **Pre-Build Linting and Type-Checking:**
  Linting and type-checking are enforced in the Docker build, ensuring only high-quality code is deployed.

### 13. Next.js Standalone Output for Docker

- **Standalone Output Mode:**
  The project uses Next.js's `output: 'standalone'` mode (set in `next.config.ts`). This generates a minimal `.next/standalone` directory for production, which is copied into the Docker image. This approach reduces image size and ensures all required files are included for deployment. If you change the output mode, you must also update the Dockerfile accordingly.

---

## Monitoring

The client provides access to:

- Prometheus metrics at http://prometheus-service:9090
- Grafana dashboards at http://grafana-service:3000
- Real-time system metrics and visualization
- Traffic simulation results
- Scaling event history
- Connection status monitoring
- Error rate tracking

Note: These URLs are accessible within the Kubernetes cluster. For external access, use port forwarding or configure an ingress controller.

## Troubleshooting

Common issues and solutions:

1. **Connection Refused**

   - Check if the pod is running: `kubectl get pods -n profile-service`
   - Verify port forwarding: `kubectl port-forward -n profile-service deployment/profile-client 3000:3000`
   - Check service logs: `kubectl logs -n profile-service deployment/profile-client`

2. **Service Unavailable**

   - Verify service status: `kubectl get svc -n profile-service`
   - Check endpoints: `kubectl get endpoints -n profile-service`
   - Ensure correct namespace: `kubectl config set-context --current --namespace=profile-service`

3. **UI Not Updating**
   - Clear browser cache
   - Check WebSocket connection
   - Verify API endpoints
   - Monitor browser console for errors

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
