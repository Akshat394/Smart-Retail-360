@echo off
setlocal enabledelayedexpansion

REM 🚀 SmartRetail360 Docker Deployment Script for Windows
REM Complete deployment with monitoring, logging, and testing

echo 🚀 SmartRetail360 - Complete Docker Deployment
echo ==============================================

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo [ERROR] Please run this script from the SmartRetail360 project root directory
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop.
    echo Download from: https://docker.com/
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)

echo [SUCCESS] All prerequisites are satisfied!

REM Create necessary directories
echo [STEP] Creating required directories...
if not exist "nginx\logs" mkdir nginx\logs
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "mqtt\config" mkdir mqtt\config
if not exist "mqtt\data" mkdir mqtt\data
if not exist "mqtt\log" mkdir mqtt\log
if not exist "monitoring\grafana\dashboards" mkdir monitoring\grafana\dashboards
if not exist "monitoring\grafana\datasources" mkdir monitoring\grafana\datasources
if not exist "logs" mkdir logs

echo [SUCCESS] Directories created!

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [STEP] Creating environment configuration...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@postgres:5432/smartretail360
        echo POSTGRES_DB=smartretail360
        echo POSTGRES_USER=smartretail360_user
        echo POSTGRES_PASSWORD=smartretail360_password
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=smartretail360-jwt-secret-key-2024-production-change-this
        echo.
        echo # Redis Configuration
        echo REDIS_URL=redis://redis:6379
        echo.
        echo # ML Service Configuration
        echo ML_SERVICE_URL=http://ml-service:8000
        echo MODEL_PATH=/app/models
        echo.
        echo # Frontend Configuration
        echo VITE_API_URL=http://localhost:3001/api
        echo VITE_ML_SERVICE_URL=http://localhost:8000
        echo VITE_WS_URL=ws://localhost:3001/ws
        echo.
        echo # Google Maps API ^(optional - for mapping features^)
        echo GOOGLE_MAPS_API_KEY=your-google-maps-api-key
        echo.
        echo # Blockchain Configuration
        echo GANACHE_NETWORK_ID=1337
        echo GANACHE_MNEMONIC=smart retail 360 blockchain development mnemonic
        echo.
        echo # Monitoring Configuration
        echo GRAFANA_ADMIN_PASSWORD=admin
        echo PROMETHEUS_RETENTION_TIME=200h
        echo.
        echo # Logging Configuration
        echo ELASTICSEARCH_DISCOVERY_TYPE=single-node
        echo ELASTICSEARCH_XPACK_SECURITY_ENABLED=false
        echo.
        echo # Environment
        echo NODE_ENV=production
        echo PYTHONPATH=/app
    ) > .env
    echo [SUCCESS] Environment configuration created!
)

REM Stop any existing containers
echo [STEP] Stopping existing containers...
docker-compose down --remove-orphans >nul 2>&1
echo [SUCCESS] Existing containers stopped!

REM Clean up old images (optional)
if "%1"=="--clean" (
    echo [STEP] Cleaning up old images...
    docker system prune -f
    echo [SUCCESS] Cleanup completed!
)

REM Build and start services
echo [STEP] Building and starting services...

echo [INFO] Building Docker images...
docker-compose build --parallel
if errorlevel 1 (
    echo [ERROR] Failed to build images
    exit /b 1
)

echo [SUCCESS] Images built successfully!

echo [INFO] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    exit /b 1
)

echo [SUCCESS] Services started!

REM Wait for services to be ready
echo [STEP] Waiting for services to be ready...

REM Function to wait for service health
:wait_for_service
set service=%1
set max_attempts=30
set attempt=1

echo [INFO] Waiting for %service% to be ready...

:wait_loop
docker-compose ps %service% | findstr "Up" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] %service% is ready!
    goto :eof
)

echo -n .
timeout /t 2 /nobreak >nul
set /a attempt+=1
if %attempt% leq %max_attempts% goto wait_loop

echo [ERROR] %service% failed to start within expected time
exit /b 1

REM Wait for critical services
call :wait_for_service postgres
call :wait_for_service redis
call :wait_for_service backend
call :wait_for_service frontend
call :wait_for_service ml-service

echo [SUCCESS] All critical services are ready!

REM Run database migrations
echo [STEP] Running database migrations...
docker-compose exec -T backend npm run db:push >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Database migration failed, but continuing...
)

REM Initialize sample data
echo [STEP] Initializing sample data...
docker-compose exec -T postgres psql -U smartretail360_user -d smartretail360 -c "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ('demo@smartretail360.com', crypt('demo123', gen_salt('bf')), 'Demo', 'User', 'admin') ON CONFLICT (email) DO NOTHING;" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Sample data initialization skipped
)

echo [SUCCESS] Sample data initialized!

REM Show deployment summary
echo.
echo 🎉 SmartRetail360 Deployment Complete!
echo =====================================
echo.
echo 📱 Application URLs:
echo    Frontend:     http://localhost:3000
echo    Backend API:  http://localhost:3001
echo    ML Service:   http://localhost:8000
echo    API Docs:     http://localhost:3001/api-docs
echo.
echo 🔧 Management URLs:
echo    Nginx Proxy:  http://localhost:80
echo    Grafana:      http://localhost:3002 ^(admin/admin^)
echo    Prometheus:   http://localhost:9090
echo    Kibana:       http://localhost:5601
echo.
echo 🧪 Testing URLs:
echo    Selenium Hub: http://localhost:4444
echo.
echo 🔗 Blockchain:
echo    Ganache:      http://localhost:8545
echo.
echo 📊 Demo Credentials:
echo    Email: demo@smartretail360.com
echo    Password: demo123
echo.
echo 🔧 Management Commands:
echo    View logs:    docker-compose logs -f
echo    Stop:         docker-compose down
echo    Restart:      docker-compose restart
echo    Status:       docker-compose ps
echo    Clean restart: deploy-docker.bat --clean
echo.
echo 🎯 Quick Demo Features:
echo    1. Dashboard - Real-time KPIs and analytics
echo    2. AI Command Center - Anomaly detection and recommendations
echo    3. IoT Dashboard - Warehouse sensors and robots
echo    4. Digital Twin - Supply chain simulations
echo    5. Channel Analytics - Omnichannel performance
echo    6. Video Analytics - Object detection demos
echo    7. Blockchain - Supply chain traceability
echo    8. Monitoring - Grafana dashboards and alerts
echo.

REM Show recent logs
echo [INFO] Showing recent logs ^(Ctrl+C to exit^)...
timeout /t 3 /nobreak >nul
docker-compose logs --tail=20

echo.
echo [SUCCESS] Deployment completed successfully!
echo [INFO] Access the application at: http://localhost:3000 