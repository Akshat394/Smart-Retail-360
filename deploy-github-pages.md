# 🚀 SmartRetail360 - GitHub Pages Deployment

## Free Deployment on GitHub Pages

### Prerequisites
- GitHub account
- Repository already on GitHub

### Step 1: Configure GitHub Pages

1. **Go to your repository settings**
2. **Scroll to "Pages" section**
3. **Configure:**
   ```
   Source: Deploy from a branch
   Branch: main
   Folder: / (root)
   ```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build frontend
      run: npm run build:frontend
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist/public
```

### Step 3: Backend Deployment

Since GitHub Pages only serves static files, deploy backend separately:

#### Option A: Railway (Recommended)
1. **Go to [Railway](https://railway.app)**
2. **Create new project**
3. **Deploy from GitHub**
4. **Set environment variables**

#### Option B: Render.com
1. **Go to [Render](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Configure build settings**

### Step 4: Database Setup

Use **Neon.tech** (free PostgreSQL):

1. **Go to [Neon](https://neon.tech)**
2. **Create free account**
3. **Create new project**
4. **Get connection string**

### Step 5: Update Environment Variables

In your backend deployment, set:

```bash
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-username.github.io
```

### Step 6: Update Frontend Configuration

Update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/Smart-Retail-360/', // Your repo name
  // ... rest of config
})
```

## Quick Setup Commands

```bash
# Create GitHub Actions workflow
mkdir -p .github/workflows
# Copy the deploy.yml content above

# Commit and push
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

## Environment Variables

### Frontend (GitHub Pages)
```bash
VITE_API_URL=https://your-backend.railway.app/api
VITE_ML_SERVICE_URL=https://your-ml-service.railway.app
VITE_WS_URL=wss://your-backend.railway.app/ws
```

### Backend (Railway/Render)
```bash
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-username.github.io
```

## Troubleshooting

### If GitHub Pages fails:
1. **Check Actions tab for build logs**
2. **Verify repository name in vite.config.ts**
3. **Ensure main branch is selected**

### If backend fails:
1. **Check Railway/Render logs**
2. **Verify environment variables**
3. **Test database connection**

## Success Indicators

✅ **Frontend accessible** at `https://your-username.github.io/Smart-Retail-360`
✅ **Backend API working** at `https://your-backend.railway.app/api`
✅ **Database connected** and migrations run
✅ **CORS configured** for GitHub Pages domain

## Alternative: Netlify Drop

For quick testing:

1. **Build locally:**
   ```bash
   npm run build:frontend
   ```

2. **Go to [Netlify Drop](https://app.netlify.com/drop)**
3. **Drag and drop the `dist/public` folder**
4. **Get instant URL**

## Support

- **GitHub Pages Docs**: https://pages.github.com
- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs 