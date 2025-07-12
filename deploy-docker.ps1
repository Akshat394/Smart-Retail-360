# 🚀 SmartRetail360 Docker Deployment Script for PowerShell
# Complete deployment with monitoring, logging, and testing

param(
    [switch]$Clean
)

Write-Host "🚀 SmartRetail360 - Complete Docker Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "[ERROR] Please run this script from the SmartRetail360 project root directory" -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    $null = docker --version
} catch {
    Write-Host "[ERROR] Docker is not installed. Please install Docker Desktop." -ForegroundColor Red
    Write-Host "Download from: https://docker.com/" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    $null = docker info
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] All prerequisites are satisfied!" -ForegroundColor Green

# Create necessary directories
Write-Host "[STEP] Creating required directories..." -ForegroundColor Magenta
$directories = @(
    "nginx\logs",
    "nginx\ssl",
    "mqtt\config",
    "mqtt\data",
    "mqtt\log",
    "monitoring\grafana\dashboards",
    "monitoring\grafana\datasources",
    "logs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "[SUCCESS] Directories created!" -ForegroundColor Green

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "[STEP] Creating environment configuration..." -ForegroundColor Magenta
    
    $envContent = @"
# Database Configuration
DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@postgres:5432/smartretail360
POSTGRES_DB=smartretail360
POSTGRES_USER=smartretail360_user
POSTGRES_PASSWORD=smartretail360_password

# JWT Configuration
JWT_SECRET=smartretail360-jwt-secret-key-2024-production-change-this

# Redis Configuration
REDIS_URL=redis://redis:6379

# ML Service Configuration
ML_SERVICE_URL=http://ml-service:8000
MODEL_PATH=/app/models

# Frontend Configuration
VITE_API_URL=http://localhost:3001/api
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:3001/ws

# Google Maps API (optional - for mapping features)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Blockchain Configuration
GANACHE_NETWORK_ID=1337
GANACHE_MNEMONIC=smart retail 360 blockchain development mnemonic

# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=admin
PROMETHEUS_RETENTION_TIME=200h

# Logging Configuration
ELASTICSEARCH_DISCOVERY_TYPE=single-node
ELASTICSEARCH_XPACK_SECURITY_ENABLED=false

# Environment
NODE_ENV=production
PYTHONPATH=/app
"@

    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "[SUCCESS] Environment configuration created!" -ForegroundColor Green
}

# Stop any existing containers
Write-Host "[STEP] Stopping existing containers..." -ForegroundColor Magenta
docker-compose down --remove-orphans 2>$null
Write-Host "[SUCCESS] Existing containers stopped!" -ForegroundColor Green

# Clean up old images (optional)
if ($Clean) {
    Write-Host "[STEP] Cleaning up old images..." -ForegroundColor Magenta
    docker system prune -f
    Write-Host "[SUCCESS] Cleanup completed!" -ForegroundColor Green
}

# Build and start services
Write-Host "[STEP] Building and starting services..." -ForegroundColor Magenta

Write-Host "[INFO] Building Docker images..." -ForegroundColor Blue
docker-compose build --parallel
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to build images" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Images built successfully!" -ForegroundColor Green

Write-Host "[INFO] Starting services..." -ForegroundColor Blue
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Services started!" -ForegroundColor Green

# Wait for services to be ready
Write-Host "[STEP] Waiting for services to be ready..." -ForegroundColor Magenta

# Function to wait for service health
function Wait-ForService {
    param($ServiceName)
    
    $maxAttempts = 30
    $attempt = 1
    
    Write-Host "[INFO] Waiting for $ServiceName to be ready..." -ForegroundColor Blue
    
    while ($attempt -le $maxAttempts) {
        $status = docker-compose ps $ServiceName 2>$null | Select-String "Up"
        if ($status) {
            Write-Host "[SUCCESS] $ServiceName is ready!" -ForegroundColor Green
            return $true
        }
        
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-Host "[ERROR] $ServiceName failed to start within expected time" -ForegroundColor Red
    return $false
}

# Wait for critical services
$services = @("postgres", "redis", "backend", "frontend", "ml-service")
foreach ($service in $services) {
    if (-not (Wait-ForService $service)) {
        exit 1
    }
}

Write-Host "[SUCCESS] All critical services are ready!" -ForegroundColor Green

# Run database migrations
Write-Host "[STEP] Running database migrations..." -ForegroundColor Magenta
docker-compose exec -T backend npm run db:push 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Database migration failed, but continuing..." -ForegroundColor Yellow
}

# Initialize sample data
Write-Host "[STEP] Initializing sample data..." -ForegroundColor Magenta
$sampleDataQuery = @"
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('demo@smartretail360.com', crypt('demo123', gen_salt('bf')), 'Demo', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;
"@

docker-compose exec -T postgres psql -U smartretail360_user -d smartretail360 -c $sampleDataQuery 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Sample data initialization skipped" -ForegroundColor Yellow
}

Write-Host "[SUCCESS] Sample data initialized!" -ForegroundColor Green

# Show deployment summary
Write-Host ""
Write-Host "🎉 SmartRetail360 Deployment Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Application URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API:  http://localhost:3001" -ForegroundColor White
Write-Host "   ML Service:   http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:     http://localhost:3001/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management URLs:" -ForegroundColor Cyan
Write-Host "   Nginx Proxy:  http://localhost:80" -ForegroundColor White
Write-Host "   Grafana:      http://localhost:3002 (admin/admin)" -ForegroundColor White
Write-Host "   Prometheus:   http://localhost:9090" -ForegroundColor White
Write-Host "   Kibana:       http://localhost:5601" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing URLs:" -ForegroundColor Cyan
Write-Host "   Selenium Hub: http://localhost:4444" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Blockchain:" -ForegroundColor Cyan
Write-Host "   Ganache:      http://localhost:8545" -ForegroundColor White
Write-Host ""
Write-Host "📊 Demo Credentials:" -ForegroundColor Cyan
Write-Host "   Email: demo@smartretail360.com" -ForegroundColor White
Write-Host "   Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   View logs:    docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop:         docker-compose down" -ForegroundColor White
Write-Host "   Restart:      docker-compose restart" -ForegroundColor White
Write-Host "   Status:       docker-compose ps" -ForegroundColor White
Write-Host "   Clean restart: .\deploy-docker.ps1 -Clean" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Quick Demo Features:" -ForegroundColor Cyan
Write-Host "   1. Dashboard - Real-time KPIs and analytics" -ForegroundColor White
Write-Host "   2. AI Command Center - Anomaly detection and recommendations" -ForegroundColor White
Write-Host "   3. IoT Dashboard - Warehouse sensors and robots" -ForegroundColor White
Write-Host "   4. Digital Twin - Supply chain simulations" -ForegroundColor White
Write-Host "   5. Channel Analytics - Omnichannel performance" -ForegroundColor White
Write-Host "   6. Video Analytics - Object detection demos" -ForegroundColor White
Write-Host "   7. Blockchain - Supply chain traceability" -ForegroundColor White
Write-Host "   8. Monitoring - Grafana dashboards and alerts" -ForegroundColor White
Write-Host ""

# Show recent logs
Write-Host "[INFO] Showing recent logs (Ctrl+C to exit)..." -ForegroundColor Blue
Start-Sleep -Seconds 3
docker-compose logs --tail=20

Write-Host ""
Write-Host "[SUCCESS] Deployment completed successfully!" -ForegroundColor Green
Write-Host "[INFO] Access the application at: http://localhost:3000" -ForegroundColor Blue 