# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* bun.lockb* ./

# Install dependencies (use npm for better cross-platform compatibility)
RUN npm install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Accept build-time env vars (baked into Vite bundle)
ARG VITE_ASSET_BASE_URL
ENV VITE_ASSET_BASE_URL=${VITE_ASSET_BASE_URL}
ARG VITE_OTEL_COLLECTOR_URL
ENV VITE_OTEL_COLLECTOR_URL=${VITE_OTEL_COLLECTOR_URL}

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx (minimal config - NPM handles proxy/SSL)
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx config
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    # SPA fallback - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Nginx metrics for Prometheus scraping
    location /nginx_status {
        stub_status;
        access_log off;
    }
}
EOF

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
