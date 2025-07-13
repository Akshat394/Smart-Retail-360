# Vercel Deployment Guide for SmartRetail360

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub repository connected to Vercel
- Node.js 18+ installed locally

### Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `Akshat394/Smart-Retail-360`
4. Select the repository and click "Deploy"

### Step 2: Configure Build Settings

**Framework Preset:** Other
**Root Directory:** `./` (root of project)
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### Step 3: Environment Variables

Add these environment variables in Vercel dashboard:

```
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
JWT_SECRET=your_jwt_secret_key
```

### Step 4: Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be available at: `https://your-project-name.vercel.app`

## 🔧 Manual Deployment

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow prompts to configure deployment
```

### Option 2: GitHub Integration

1. Connect your GitHub repository to Vercel
2. Enable automatic deployments
3. Every push to `main` branch will trigger deployment

## 📁 Project Structure for Vercel

```
Smart-Retail-360/
├── vercel.json          # Vercel configuration
├── package.json         # Main package.json
├── server/             # Backend API
├── client/             # Frontend React app
├── dist/               # Build output
└── public/             # Static assets
```

## ⚙️ Configuration Details

### vercel.json
```json
{
  "version": 2,
  "name": "smartretail360",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Build Process
1. **Frontend Build:** Vite builds React app to `dist/`
2. **Backend Build:** TypeScript compilation to `dist/`
3. **Static Assets:** Copied to deployment

## 🔍 Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (18+ required)
- Verify all dependencies in package.json
- Check for TypeScript errors

**API Routes Not Working:**
- Ensure server/index.ts is properly configured
- Check environment variables
- Verify database connection

**Static Assets Missing:**
- Check vite.config.ts build settings
- Ensure public/ directory is included
- Verify dist/ directory structure

### Debug Commands

```bash
# Local build test
npm run build

# Check build output
ls -la dist/

# Test server locally
npm run start

# Check environment variables
echo $DATABASE_URL
```

## 🌐 Custom Domain (Optional)

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## 📊 Monitoring

- **Vercel Analytics:** Built-in performance monitoring
- **Function Logs:** View serverless function execution
- **Build Logs:** Monitor deployment process

## 🔄 Continuous Deployment

### Automatic Deployments
- Push to `main` branch → Automatic deployment
- Pull requests → Preview deployments
- Manual deployments via Vercel dashboard

### Deployment URLs
- **Production:** `https://your-project.vercel.app`
- **Preview:** `https://your-project-git-branch.vercel.app`

## 💡 Best Practices

1. **Environment Variables:** Never commit secrets to Git
2. **Build Optimization:** Use Vite for fast builds
3. **Caching:** Leverage Vercel's edge caching
4. **Monitoring:** Set up alerts for build failures
5. **Backup:** Keep database backups separate

## 🆘 Support

- **Vercel Documentation:** https://vercel.com/docs
- **Community:** https://github.com/vercel/vercel/discussions
- **Status:** https://vercel-status.com

---

**🎉 Your SmartRetail360 app is now deployed on Vercel!**

Visit your deployment URL to see the live application. 