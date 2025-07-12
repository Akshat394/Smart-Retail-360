# 🚀 Railway.app Deployment Guide

## Quick Deploy to Railway (FREE - No Payment Info Required)

### Step 1: Sign Up
1. Go to [Railway.app](https://railway.app)
2. Sign up with your GitHub account
3. No payment information required!

### Step 2: Deploy Frontend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: `Akshat394/Smart-Retail-360`
4. Railway will automatically:
   - Use `Dockerfile.railway-simple`
   - Build the frontend
   - Deploy it live

### Step 3: Deploy Backend (Optional)
1. Click "New Service" in your project
2. Select "GitHub Repo"
3. Choose same repository
4. Set Root Directory: `server`
5. Add Environment Variables:
   ```
   DATABASE_URL=your_postgresql_url
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

### Step 4: Deploy ML Service (Optional)
1. Click "New Service"
2. Select "GitHub Repo"
3. Choose same repository
4. Set Root Directory: `ml_service`
5. Add Environment Variables:
   ```
   PYTHONPATH=/app
   MODEL_PATH=/app/models
   HOST=0.0.0.0
   PORT=8000
   ```

## Your Live URLs
- **Frontend:** `https://smartretail360-frontend.railway.app`
- **Backend:** `https://smartretail360-backend.railway.app`
- **ML Service:** `https://smartretail360-ml.railway.app`

## Environment Variables
Set these in Railway dashboard:

### Frontend (.env)
```
VITE_API_URL=https://smartretail360-backend.railway.app/api
VITE_ML_SERVICE_URL=https://smartretail360-ml.railway.app
VITE_WS_URL=wss://smartretail360-backend.railway.app/ws
```

### Backend (.env)
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
REDIS_URL=redis://localhost:6379
```

### ML Service (.env)
```
PYTHONPATH=/app
MODEL_PATH=/app/models
HOST=0.0.0.0
PORT=8000
```

## Database Setup
1. Create PostgreSQL database on [Neon.tech](https://neon.tech) (FREE)
2. Get connection string
3. Add to Railway environment variables

## Success Indicators
✅ All services show green status
✅ Frontend loads without errors
✅ Backend API responds
✅ ML service accessible
✅ Database connected

## Troubleshooting
- Check Railway logs for errors
- Verify environment variables
- Ensure database is accessible
- Check service URLs are correct

Your SmartRetail360 will be live and accessible to anyone! 🎉 