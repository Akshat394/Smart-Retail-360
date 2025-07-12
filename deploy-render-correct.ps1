# 🚀 SmartRetail360 Render.com Deployment Script (Corrected)
# Handles the proper deployment process for Render.com

Write-Host "🚀 SmartRetail360 - Render.com Deployment (Corrected)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Check if git is installed
try {
    $null = git --version
} catch {
    Write-Host "[ERROR] Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "[ERROR] This is not a git repository. Please initialize git first." -ForegroundColor Red
    Write-Host "Run: git init && git add . && git commit -m 'Initial commit'" -ForegroundColor Yellow
    exit 1
}

# Check if we have a remote repository
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "[WARNING] No remote repository found. You need to create a GitHub repository first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps to create GitHub repository:" -ForegroundColor Cyan
    Write-Host "1. Go to https://github.com" -ForegroundColor White
    Write-Host "2. Click 'New repository'" -ForegroundColor White
    Write-Host "3. Name it 'smart-retail-360'" -ForegroundColor White
    Write-Host "4. Make it public or private" -ForegroundColor White
    Write-Host "5. Don't initialize with README (we already have files)" -ForegroundColor White
    Write-Host ""
    
    $createRepo = Read-Host "Have you created the GitHub repository? (y/n)"
    if ($createRepo -eq "y" -or $createRepo -eq "Y") {
        $repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/smart-retail-360)"
        git remote add origin $repoUrl
    } else {
        Write-Host "[INFO] Please create a GitHub repository and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Check if we have uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "[INFO] You have uncommitted changes. Committing them..." -ForegroundColor Blue
    git add .
    git commit -m "Ready for Render.com deployment"
}

# Push to GitHub
Write-Host "[STEP] Pushing to GitHub..." -ForegroundColor Magenta
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to push to GitHub. Please check your git configuration." -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Code pushed to GitHub!" -ForegroundColor Green

# Instructions for Render.com deployment
Write-Host ""
Write-Host "🎉 Render.com Deployment Instructions:" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Step 1: Deploy Backend and ML Service" -ForegroundColor Cyan
Write-Host "1. Go to https://render.com" -ForegroundColor White
Write-Host "2. Sign up with your GitHub account" -ForegroundColor White
Write-Host "3. Click 'New +' → 'Blueprint'" -ForegroundColor White
Write-Host "4. Connect your GitHub repository" -ForegroundColor White
Write-Host "5. Render will use render.yaml to deploy backend + ML service" -ForegroundColor White
Write-Host ""
Write-Host "📋 Step 2: Deploy Frontend (Static Site)" -ForegroundColor Cyan
Write-Host "1. In Render dashboard, click 'New +' → 'Static Site'" -ForegroundColor White
Write-Host "2. Connect your GitHub repository" -ForegroundColor White
Write-Host "3. Configure:" -ForegroundColor White
Write-Host "   - Name: smart-retail-frontend" -ForegroundColor White
Write-Host "   - Build Command: cd client && npm install && npm run build" -ForegroundColor White
Write-Host "   - Publish Directory: client/dist" -ForegroundColor White
Write-Host "   - Root Directory: client" -ForegroundColor White
Write-Host ""
Write-Host "📋 Step 3: Set up Database" -ForegroundColor Cyan
Write-Host "1. Go to https://neon.tech" -ForegroundColor White
Write-Host "2. Create free PostgreSQL database" -ForegroundColor White
Write-Host "3. Copy connection string" -ForegroundColor White
Write-Host "4. Add as DATABASE_URL in backend environment variables" -ForegroundColor White
Write-Host ""
Write-Host "📋 Step 4: Configure Environment Variables" -ForegroundColor Cyan
Write-Host "Backend Service:" -ForegroundColor White
Write-Host "  - DATABASE_URL: Your Neon connection string" -ForegroundColor White
Write-Host "  - JWT_SECRET: Auto-generated" -ForegroundColor White
Write-Host ""
Write-Host "Frontend Service:" -ForegroundColor White
Write-Host "  - VITE_API_URL: https://smart-retail-backend.onrender.com/api" -ForegroundColor White
Write-Host "  - VITE_ML_SERVICE_URL: https://smart-retail-ml-service.onrender.com" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Expected URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://smart-retail-frontend.onrender.com" -ForegroundColor White
Write-Host "   Backend:  https://smart-retail-backend.onrender.com" -ForegroundColor White
Write-Host "   ML Service: https://smart-retail-ml-service.onrender.com" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed instructions, see: FREE_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "[SUCCESS] Your code is ready for Render.com deployment!" -ForegroundColor Green 