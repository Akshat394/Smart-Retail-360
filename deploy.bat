@echo off
REM 🚀 SmartRetail360 Deployment Script for Windows
REM This script automates deployment for different platforms

setlocal enabledelayedexpansion

REM Colors for output (Windows compatible)
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

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking prerequisites..."

set "missing_deps="

call :command_exists node
if %errorlevel% neq 0 set "missing_deps=!missing_deps! Node.js"

call :command_exists npm
if %errorlevel% neq 0 set "missing_deps=!missing_deps! npm"

call :command_exists python
if %errorlevel% neq 0 set "missing_deps=!missing_deps! Python"

call :command_exists docker
if %errorlevel% neq 0 set "missing_deps=!missing_deps! Docker"

if not "%missing_deps%"=="" (
    call :print_error "Missing dependencies:!missing_deps!"
    call :print_status "Please install the missing dependencies and try again."
    exit /b 1
)

call :print_success "All prerequisites are installed!"
goto :eof

REM Function to setup environment
:setup_environment
call :print_status "Setting up environment..."

if not exist .env (
    call :print_warning "No .env file found. Creating from template..."
    (
        echo # Database
        echo DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@localhost:5432/smartretail360
        echo.
        echo # JWT Secret
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
        echo.
        echo # Google Maps API ^(for mapping features^)
        echo GOOGLE_MAPS_API_KEY=your-google-maps-api-key
        echo.
        echo # Redis ^(optional^)
        echo REDIS_URL=redis://localhost:6379
        echo.
        echo # ML Service
        echo ML_SERVICE_URL=http://localhost:8000
        echo.
        echo # Frontend
        echo VITE_API_URL=http://localhost:3001/api
        echo VITE_ML_SERVICE_URL=http://localhost:8000
        echo VITE_WS_URL=ws://localhost:3001/ws
    ) > .env
    call :print_success ".env file created. Please update with your actual values."
) else (
    call :print_success ".env file already exists."
)
goto :eof

REM Function to install dependencies
:install_dependencies
call :print_status "Installing dependencies..."

REM Install root dependencies
npm install

REM Install frontend dependencies
cd client
npm install
cd ..

REM Install ML service dependencies
cd ml_service
pip install -r requirements.txt
cd ..

call :print_success "All dependencies installed!"
goto :eof

REM Function to build application
:build_application
call :print_status "Building application..."

REM Build backend
npm run build

REM Build frontend
cd client
npm run build
cd ..

call :print_success "Application built successfully!"
goto :eof

REM Function to deploy with Docker
:deploy_docker
call :print_status "Deploying with Docker Compose..."

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)

REM Start all services
docker-compose up -d

call :print_success "Docker deployment completed!"
call :print_status "Services are starting up..."
call :print_status "Frontend: http://localhost:3000"
call :print_status "Backend API: http://localhost:3001"
call :print_status "ML Service: http://localhost:8000"
call :print_status "Grafana: http://localhost:3002"

REM Show logs
call :print_status "Showing logs (Ctrl+C to exit)..."
docker-compose logs -f
goto :eof

REM Function to start local development
:start_local
call :print_status "Starting local development environment..."

REM Check if database is running (simplified check)
netstat -an | findstr ":5432" >nul
if %errorlevel% neq 0 (
    call :print_warning "PostgreSQL is not running. Please start PostgreSQL manually."
)

REM Run database migrations
npm run db:push

REM Start all services
npm run start:all

call :print_success "Local development environment started!"
call :print_status "Frontend: http://localhost:3000"
call :print_status "Backend: http://localhost:3001"
call :print_status "ML Service: http://localhost:8000"
goto :eof

REM Function to stop services
:stop_services
call :print_status "Stopping services..."

REM Stop Docker services
if exist docker-compose.yml (
    docker-compose down
)

REM Stop local processes (Windows equivalent)
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1

call :print_success "Services stopped!"
goto :eof

REM Function to show status
:show_status
call :print_status "Checking service status..."

REM Check Docker containers
if exist docker-compose.yml (
    echo Docker containers:
    docker-compose ps
    echo.
)

REM Check local processes
echo Local processes:
tasklist /fi "imagename eq node.exe" 2>nul
tasklist /fi "imagename eq python.exe" 2>nul
echo.

REM Check ports
echo Port usage:
netstat -an | findstr ":3000\|:3001\|:8000"
goto :eof

REM Function to show help
:show_help
echo 🚀 SmartRetail360 Deployment Script
echo.
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   docker      Deploy using Docker Compose
echo   local       Start local development environment
echo   stop        Stop all services
echo   status      Show service status
echo   setup       Setup environment and install dependencies
echo   build       Build application
echo   help        Show this help message
echo.
echo Examples:
echo   %0 docker    # Deploy with Docker
echo   %0 local     # Start local development
echo   %0 setup     # Setup environment
goto :eof

REM Main script logic
if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="docker" (
    call :check_prerequisites
    call :setup_environment
    call :deploy_docker
    goto :eof
)
if "%1"=="local" (
    call :check_prerequisites
    call :setup_environment
    call :install_dependencies
    call :start_local
    goto :eof
)
if "%1"=="stop" (
    call :stop_services
    goto :eof
)
if "%1"=="status" (
    call :show_status
    goto :eof
)
if "%1"=="setup" (
    call :check_prerequisites
    call :setup_environment
    call :install_dependencies
    call :print_success "Setup completed!"
    goto :eof
)
if "%1"=="build" (
    call :check_prerequisites
    call :build_application
    goto :eof
)

echo Unknown command: %1
call :show_help 