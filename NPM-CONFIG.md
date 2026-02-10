# Nginx Proxy Manager Configuration Guide

## Portainer Stack Setup

Use this stack configuration in Portainer:

```yaml
version: '3.8'

services:
  pokebox:
    image: ghcr.io/YOUR_GITHUB_USERNAME/pokebox:latest
    container_name: pokebox
    restart: unless-stopped
    networks:
      - proxy

networks:
  proxy:
    external: true  # Use your existing NPM network
```

## NPM Proxy Host Configuration

### 1. Basic Setup
- **Domain Names**: `pokebox.yourdomain.com`
- **Scheme**: `http`
- **Forward Hostname / IP**: `pokebox` (container name)
- **Forward Port**: `80`
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ❌ Not needed

### 2. SSL Tab
- **SSL Certificate**: Select or create Let's Encrypt cert
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled
- **HSTS Subdomains**: ✅ Enabled (optional)

### 3. Advanced Tab

Add this custom Nginx configuration:

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# CRITICAL: Camera access permission for MediaPipe face tracking
add_header Permissions-Policy "camera=(self)" always;
```

## Testing Checklist

After deployment:

1. ✅ Visit `https://pokebox.yourdomain.com` - should load
2. ✅ Click camera icon - browser should request camera permission
3. ✅ Check browser console - no CORS or permission errors
4. ✅ View page source - static assets should load from your domain
5. ✅ Test health endpoint: `https://pokebox.yourdomain.com/health`

## Troubleshooting

### Camera Not Working
- Ensure `Permissions-Policy: camera=(self)` header is present (check browser DevTools → Network)
- Camera access requires HTTPS (HTTP won't work in modern browsers)
- Check browser permissions in Settings → Privacy → Camera

### 502 Bad Gateway
- Container not running: `docker ps | grep pokebox`
- Wrong network: Ensure container is on same network as NPM
- Wrong container name/IP in NPM forward settings

### Static Assets Not Loading
- Check NPM SSL settings - ensure Force SSL is enabled
- Clear browser cache
- Check browser console for mixed content warnings

## Networks

If you need to create a shared network for NPM:

```bash
docker network create proxy
```

Then ensure NPM is also on this network, and update your Portainer stack to use `external: true` as shown above.
