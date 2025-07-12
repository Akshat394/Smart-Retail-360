@echo off
REM 🚀 SmartRetail360 One-Command Deployment for Windows
REM This script deploys the entire application with minimal user interaction

setlocal enabledelayedexpansion

echo 🚀 SmartRetail360 - One-Command Deployment
echo ==========================================

REM Colors for Windows
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Check if we're in the right directory
if not exist "package.json" (
    call :print_error "Please run this script from the SmartRetail360 project root directory"
    exit /b 1
)

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Check prerequisites
call :print_status "Checking prerequisites..."

set "missing_deps="

call :command_exists docker
if %errorlevel% neq 0 set "missing_deps=!missing_deps! Docker"

call :command_exists docker-compose
if %errorlevel% neq 0 set "missing_deps=!missing_deps! Docker Compose"

if not "!missing_deps!"=="" (
    call :print_error "Missing dependencies:!missing_deps!"
    call :print_status "Please install Docker Desktop and try again."
    call :print_status "Download from: https://docker.com/"
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running. Please start Docker Desktop and try again."
    exit /b 1
)

call :print_success "All prerequisites are satisfied!"

REM Create .env file if it doesn't exist
if not exist .env (
    call :print_status "Creating environment configuration..."
    (
        echo # Database
        echo DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@postgres:5432/smartretail360
        echo.
        echo # JWT Secret
        echo JWT_SECRET=smartretail360-jwt-secret-key-2024
        echo.
        echo # Google Maps API ^(optional - for mapping features^)
        echo GOOGLE_MAPS_API_KEY=your-google-maps-api-key
        echo.
        echo # Redis
        echo REDIS_URL=redis://redis:6379
        echo.
        echo # ML Service
        echo ML_SERVICE_URL=http://ml-service:8000
        echo.
        echo # Frontend
        echo VITE_API_URL=http://localhost:3001/api
        echo VITE_ML_SERVICE_URL=http://localhost:8000
        echo VITE_WS_URL=ws://localhost:3001/ws
    ) > .env
    call :print_success "Environment configuration created!"
)

REM Deploy with Docker Compose
call :print_status "Starting SmartRetail360 deployment..."

REM Pull latest images and start services
docker-compose up -d --build

call :print_success "Deployment completed successfully!"
echo.
echo 🎉 SmartRetail360 is now running!
echo.
echo 📱 Application URLs:
echo    Frontend:     http://localhost:3000
echo    Backend API:  http://localhost:3001
echo    ML Service:   http://localhost:8000
echo    API Docs:     http://localhost:3001/api-docs
echo.
echo 📊 Monitoring:
echo    Grafana:      http://localhost:3002 ^(admin/admin^)
echo    Prometheus:   http://localhost:9090
echo.
echo 🔧 Management Commands:
echo    View logs:    docker-compose logs -f
echo    Stop:         docker-compose down
echo    Restart:      docker-compose restart
echo    Status:       docker-compose ps
echo.
echo 🎯 Quick Demo Features:
echo    1. Dashboard - Real-time KPIs and analytics
echo    2. AI Command Center - Anomaly detection and recommendations
echo    3. IoT Dashboard - Warehouse sensors and robots
echo    4. Digital Twin - Supply chain simulations
echo    5. Channel Analytics - Omnichannel performance
echo    6. Video Analytics - Object detection demos
echo.
call :print_status "Services are starting up. Please wait 1-2 minutes for all services to be ready."
call :print_status "You can view logs with: docker-compose logs -f"

REM Show logs for a few seconds to demonstrate
echo.
call :print_status "Showing recent logs..."
timeout /t 3 >nul
docker-compose logs --tail=20

pause 