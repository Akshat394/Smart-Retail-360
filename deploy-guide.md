# SmartRetail360 Netlify Deployment Guide

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **Git** 
3. **Netlify CLI** (optional but recommended)
   ```bash
   npm install -g netlify-cli
   ```

## Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd smartretail360
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   VITE_API_URL=http://localhost:8888/.netlify/functions
   VITE_WS_URL=ws://localhost:8888/ws
   ```

3. **Local Development**
   ```bash
   # Start development server
   npm run dev
   
   # Start Netlify functions locally (in another terminal)
   netlify dev
   ```

## Netlify Deployment

### Option 1: Git-based Deployment (Recommended)

1. **Push to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Functions directory**: `netlify/functions`

3. **Environment Variables**
   In Netlify Dashboard → Site Settings → Environment Variables:
   ```
   VITE_API_URL=https://your-site-name.netlify.app/api
   NODE_VERSION=18
   ```

### Option 2: CLI Deployment

1. **Login to Netlify**
   ```bash
   netlify login
   ```

2. **Initialize Site**
   ```bash
   netlify init
   ```

3. **Deploy**
   ```bash
   # Build and deploy
   npm run build
   netlify deploy --prod
   ```

## Real-time Features Configuration

### WebSocket Alternative (Server-Sent Events)

Since Netlify doesn't support WebSockets, we use polling and Server-Sent Events:

```typescript
// src/hooks/useRealTimeData.ts
export const useRealTimeData = () => {
  // Polling every 3 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(updateData, 3000);
    return () => clearInterval(interval);
  }, []);
};
```

### Database Integration

For production, integrate with:

1. **MongoDB Atlas** (Free tier available)
   ```bash
   # Add to environment variables
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartretail360
   ```

2. **Supabase** (PostgreSQL with real-time)
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

3. **PlanetScale** (MySQL with edge functions)
   ```bash
   DATABASE_URL=mysql://username:password@host/database
   ```

## Performance Optimization

### Build Optimization

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  }
});
```

### Caching Strategy

```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "public, max-age=60"
```

## Monitoring and Analytics

### Error Tracking

```javascript
// Add to your functions
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});
```

### Performance Monitoring

```javascript
// Add to main.tsx
if (import.meta.env.PROD) {
  // Initialize analytics
  gtag('config', 'GA_MEASUREMENT_ID');
}
```

## Security Configuration

### Content Security Policy

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'"
```

### API Rate Limiting

```javascript
// netlify/functions/middleware/rateLimit.js
const rateLimit = new Map();

exports.checkRateLimit = (event) => {
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'];
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const limit = rateLimit.get(ip);
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowMs;
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
};
```

## Testing Deployment

### Local Testing

```bash
# Test functions locally
netlify dev

# Test build
npm run build
npm run preview
```

### Production Testing

```bash
# Test API endpoints
curl https://your-site.netlify.app/api/forecast-accuracy

# Test real-time updates
curl https://your-site.netlify.app/api/events
```

## Troubleshooting

### Common Issues

1. **Function Timeout**
   ```javascript
   // Increase timeout in netlify.toml
   [functions]
     timeout = 30
   ```

2. **Build Failures**
   ```bash
   # Check build logs
   netlify logs

   # Clear cache
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment Variables**
   ```bash
   # Verify variables
   netlify env:list
   
   # Set variables
   netlify env:set VITE_API_URL https://your-site.netlify.app/api
   ```

## Scaling Considerations

### Edge Functions (Beta)

```javascript
// netlify/edge-functions/analytics.js
export default async (request, context) => {
  // Process at edge for better performance
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' }
  });
};
```

### CDN Optimization

```toml
# netlify.toml
[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true
```

## Maintenance

### Automated Updates

```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

Your SmartRetail360 application is now ready for production deployment on Netlify with real-time capabilities, optimized performance, and enterprise-grade security!