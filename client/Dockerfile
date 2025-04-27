# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run lint
RUN npm run type-check
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Install kubectl
RUN apk add --no-cache curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Create directory for service account token
RUN mkdir -p /var/run/secrets/kubernetes.io/serviceaccount

# Add non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
RUN chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /var/run/secrets/kubernetes.io/serviceaccount && \
    chmod +x /usr/local/bin/kubectl

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 