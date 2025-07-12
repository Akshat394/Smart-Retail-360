# 🚀 SmartRetail360 - Vercel Deployment Guide

## Quick Deploy to Vercel (Free Tier)

### Prerequisites
- GitHub account
- Vercel account (free)

### Step 1: Deploy Frontend to Vercel

1. **Go to [Vercel](https://vercel.com)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build:frontend
   Output Directory: dist/public
   Install Command: npm install
   ```

### Step 2: Environment Variables

Add these environment variables in Vercel:

```
VITE_API_URL=https://your-backend-url.vercel.app/api
VITE_ML_SERVICE_URL=https://your-ml-service-url.vercel.app
VITE_WS_URL=wss://your-backend-url.vercel.app/ws
```

### Step 3: Deploy Backend to Vercel

1. **Create a new Vercel project for backend**
2. **Configure:**
   ```
   Framework Preset: Node.js
   Root Directory: ./
   Build Command: npm run build:backend
   Output Directory: dist
   ```

### Step 4: Database Setup

Use **Neon.tech** (free PostgreSQL):

1. **Go to [Neon](https://neon.tech)**
2. **Create free account**
3. **Create new project**
4. **Get connection string**
5. **Add to Vercel environment variables:**
   ```
   DATABASE_URL=postgresql://user:password@host/database
   ```

### Step 5: Deploy ML Service

Use **Railway** for ML service (separate from main app):

1. **Go to [Railway](https://railway.app)**
2. **Create new project**
3. **Deploy from GitHub**
4. **Set environment variables:**
   ```
   PYTHONPATH=/app
   MODEL_PATH=/app/models
   ```

## Alternative: Netlify + Supabase

### Frontend on Netlify
1. **Go to [Netlify](https://netlify.com)**
2. **Deploy from GitHub**
3. **Build settings:**
   ```
   Build command: npm run build:frontend
   Publish directory: dist/public
   ```

### Backend on Railway
1. **Deploy backend to Railway**
2. **Use Railway's PostgreSQL**

### Database on Supabase
1. **Go to [Supabase](https://supabase.com)**
2. **Create free project**
3. **Get connection string**

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/Akshat394/Smart-Retail-360
cd SmartRetail360

# Install dependencies
npm install

# Build locally to test
npm run build:frontend
npm run build:backend

# Deploy to Vercel
npx vercel --prod
```

## Environment Variables Reference

```bash
# Frontend (Vercel/Netlify)
VITE_API_URL=https://your-backend.vercel.app/api
VITE_ML_SERVICE_URL=https://your-ml-service.railway.app
VITE_WS_URL=wss://your-backend.vercel.app/ws

# Backend (Vercel/Railway)
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://your-redis-url

# ML Service (Railway)
PYTHONPATH=/app
MODEL_PATH=/app/models
```

## Troubleshooting

### If Vercel fails:
1. **Check build logs**
2. **Verify environment variables**
3. **Try Railway for backend**

### If Railway fails:
1. **Try Render.com**
2. **Use Heroku free tier**
3. **Deploy to Vercel Edge Functions**

## Success Indicators

✅ **Frontend accessible** at `https://your-app.vercel.app`
✅ **Backend API working** at `https://your-backend.vercel.app/api`
✅ **Database connected** and migrations run
✅ **ML service responding** at `https://your-ml-service.railway.app`

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs 