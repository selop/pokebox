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
limit_req_zone \$binary_remote_addr zone=static:10m rate=30r/s;

server {
    listen 80;
    server_name _;
    server_tokens off;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includePreload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://otel.lopatkin.net; worker-src 'self' blob:; font-src 'self' https://fonts.gstatic.com;" always;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    # Rate limiting
    limit_req zone=static burst=60 nodelay;

    # Serve card assets from mounted SSD volume
    location /assets/ {
        alias /data/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files \$uri =404;
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check endpoint (internal only)
    location /health {
        access_log off;
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        deny all;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Nginx metrics for Prometheus scraping (internal only)
    location /nginx_status {
        stub_status;
        access_log off;
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        deny all;
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
