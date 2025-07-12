# 🚀 Render.com Deployment Guide for SmartRetail360

This guide provides the correct way to deploy SmartRetail360 on Render.com.

## 🎯 Overview

Render.com has different service types and plans. For our application:
- **Backend & ML Service**: Web Services (using `render.yaml`)
- **Frontend**: Static Site (deployed separately)
- **Database**: External (Neon.tech)

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

### Step 2: Deploy Backend and ML Service

1. **Go to Render.com:**
   - Visit [render.com](https://render.com)
   - Sign up with your GitHub account

2. **Create Blueprint:**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` and deploy backend + ML service

3. **Configure Services:**
   - **Backend Service:** Will be created automatically
   - **ML Service:** Will be created automatically
   - Both will use the `starter` plan (free tier)

### Step 3: Deploy Frontend (Static Site)

1. **In Render Dashboard:**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Static Site:**
   - **Name:** `smart-retail-frontend`
   - **Build Command:** `cd client && npm install && npm run build`
   - **Publish Directory:** `client/dist`
   - **Root Directory:** `client`

### Step 4: Set Up Database

1. **Create Neon Database:**
   - Go to [neon.tech](https://neon.tech)
   - Sign up with GitHub
   - Create new project
   - Copy connection string

2. **Add to Backend Environment:**
   - Go to your backend service in Render
   - Environment tab → Add Variable
   - **Key:** `DATABASE_URL`
   - **Value:** Your Neon connection string

### Step 5: Configure Environment Variables

#### Backend Service:
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=auto-generated
REDIS_URL=redis://localhost:6379
```

#### ML Service:
```
PYTHONPATH=/opt/render/project/src/ml_service
MODEL_PATH=/opt/render/project/src/ml_service/models
```

#### Frontend Service:
```
VITE_API_URL=https://smart-retail-backend.onrender.com/api
VITE_ML_SERVICE_URL=https://smart-retail-ml-service.onrender.com
```

## 🔗 Expected URLs

After deployment, your services will be available at:
- **Frontend:** `https://smart-retail-frontend.onrender.com`
- **Backend:** `https://smart-retail-backend.onrender.com`
- **ML Service:** `https://smart-retail-ml-service.onrender.com`

## 💰 Pricing

### Render.com Free Tier:
- **Web Services:** 750 hours/month (shared)
- **Static Sites:** Unlimited
- **Custom Domains:** Free
- **SSL Certificates:** Free

### Neon.tech Free Tier:
- **Storage:** 3GB
- **Compute:** Shared
- **Connections:** 100 concurrent
- **Backups:** 7 days retention

**Total Cost: $0/month** 🎉

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check Node.js version compatibility
   - Ensure all dependencies are in `package.json`
   - Verify build commands in `render.yaml`

2. **Database Connection:**
   - Verify `DATABASE_URL` format
   - Check if database allows external connections
   - Add `?sslmode=require` for PostgreSQL

3. **Frontend Not Loading:**
   - Check `VITE_API_URL` points to correct backend
   - Verify build output in `client/dist`
   - Check environment variables in frontend service

4. **CORS Issues:**
   - Backend should allow requests from frontend domain
   - Update CORS configuration if needed

## 📊 Monitoring

### Render.com Built-in:
- **Logs:** Available in service dashboard
- **Metrics:** CPU, memory, request count
- **Health Checks:** Automatic monitoring

### External Monitoring (Free):
- **UptimeRobot:** Website uptime monitoring
- **Google Analytics:** User analytics
- **Sentry:** Error tracking

## 🚀 Quick Deploy Commands

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for Render deployment"
git push origin main

# 2. Follow the web interface steps above
# 3. Set up database and environment variables
# 4. Your app will be live!
```

## 🎯 Success Checklist

- [ ] Code pushed to GitHub
- [ ] Backend service deployed and running
- [ ] ML service deployed and running
- [ ] Frontend static site deployed
- [ ] Database connected and working
- [ ] Environment variables configured
- [ ] Frontend can communicate with backend
- [ ] All services responding correctly

## 📚 Additional Resources

- [Render.com Documentation](https://render.com/docs)
- [Neon.tech Documentation](https://neon.tech/docs)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)

Your SmartRetail360 application should now be successfully deployed on Render.com! 🎉 