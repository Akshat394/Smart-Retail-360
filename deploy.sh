#!/bin/bash

# 🚀 SmartRetail360 Deployment Script
# This script automates deployment for different platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists python3; then
        missing_deps+=("Python 3")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All prerequisites are installed!"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f .env ]; then
        print_warning "No .env file found. Creating from template..."
        cat > .env << EOF
# Database
DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@localhost:5432/smartretail360

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google Maps API (for mapping features)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Redis (optional)
REDIS_URL=redis://localhost:6379

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:3001/ws
EOF
        print_success ".env file created. Please update with your actual values."
    else
        print_success ".env file already exists."
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install frontend dependencies
    cd client && npm install && cd ..
    
    # Install ML service dependencies
    cd ml_service && pip install -r requirements.txt && cd ..
    
    print_success "All dependencies installed!"
}

# Function to build application
build_application() {
    print_status "Building application..."
    
    # Build backend
    npm run build
    
    # Build frontend
    cd client && npm run build && cd ..
    
    print_success "Application built successfully!"
}

# Function to deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker Compose..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Start all services
    docker-compose up -d
    
    print_success "Docker deployment completed!"
    print_status "Services are starting up..."
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:3001"
    print_status "ML Service: http://localhost:8000"
    print_status "Grafana: http://localhost:3002"
    
    # Show logs
    print_status "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to deploy to Render
deploy_render() {
    print_status "Deploying to Render.com..."
    
    if ! command_exists render; then
        print_error "Render CLI not found. Please install it first:"
        print_status "npm install -g @render/cli"
        exit 1
    fi
    
    # Deploy backend
    print_status "Deploying backend..."
    render deploy --service smart-retail-backend
    
    # Deploy frontend
    print_status "Deploying frontend..."
    render deploy --service smart-retail-frontend
    
    print_success "Render deployment completed!"
}

# Function to deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway.app..."
    
    if ! command_exists railway; then
        print_error "Railway CLI not found. Please install it first:"
        print_status "npm install -g @railway/cli"
        exit 1
    fi
    
    # Login to Railway
    railway login
    
    # Deploy backend
    print_status "Deploying backend..."
    cd server
    railway up
    cd ..
    
    # Deploy frontend
    print_status "Deploying frontend..."
    cd client
    railway up
    cd ..
    
    # Deploy ML service
    print_status "Deploying ML service..."
    cd ml_service
    railway up
    cd ..
    
    print_success "Railway deployment completed!"
}

# Function to deploy to Heroku
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    if ! command_exists heroku; then
        print_error "Heroku CLI not found. Please install it first."
        exit 1
    fi
    
    # Login to Heroku
    heroku login
    
    # Create backend app
    print_status "Creating backend app..."
    heroku create smartretail360-backend
    
    # Add PostgreSQL addon
    heroku addons:create heroku-postgresql:mini
    
    # Deploy backend
    git subtree push --prefix=server heroku main
    
    # Create frontend app
    print_status "Creating frontend app..."
    heroku create smartretail360-frontend
    
    # Build and deploy frontend
    cd client
    npm run build
    git add dist
    git commit -m "Build for production"
    git subtree push --prefix=dist heroku main
    cd ..
    
    print_success "Heroku deployment completed!"
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command_exists vercel; then
        print_error "Vercel CLI not found. Please install it first:"
        print_status "npm install -g vercel"
        exit 1
    fi
    
    # Deploy frontend
    print_status "Deploying frontend..."
    cd client
    vercel --prod
    cd ..
    
    # Deploy backend
    print_status "Deploying backend..."
    cd server
    vercel --prod
    cd ..
    
    print_success "Vercel deployment completed!"
}

# Function to start local development
start_local() {
    print_status "Starting local development environment..."
    
    # Check if database is running
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        print_warning "PostgreSQL is not running. Starting with Docker..."
        docker run -d --name postgres-dev \
            -e POSTGRES_DB=smartretail360 \
            -e POSTGRES_USER=smartretail360_user \
            -e POSTGRES_PASSWORD=smartretail360_password \
            -p 5432:5432 \
            postgres:15
    fi
    
    # Run database migrations
    npm run db:push
    
    # Start all services
    npm run start:all
    
    print_success "Local development environment started!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:3001"
    print_status "ML Service: http://localhost:8000"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    # Stop Docker services
    if [ -f docker-compose.yml ]; then
        docker-compose down
    fi
    
    # Stop local processes
    pkill -f "npm run start:backend" || true
    pkill -f "npm run start:ml" || true
    pkill -f "npm run start:frontend" || true
    
    print_success "Services stopped!"
}

# Function to show status
show_status() {
    print_status "Checking service status..."
    
    # Check Docker containers
    if [ -f docker-compose.yml ]; then
        echo "Docker containers:"
        docker-compose ps
        echo
    fi
    
    # Check local processes
    echo "Local processes:"
    ps aux | grep -E "(npm|node|python)" | grep -v grep || echo "No local processes found"
    echo
    
    # Check ports
    echo "Port usage:"
    netstat -tulpn | grep -E ":(3000|3001|8000)" || echo "No services running on expected ports"
}

# Function to show logs
show_logs() {
    print_status "Showing logs..."
    
    if [ -f docker-compose.yml ]; then
        docker-compose logs -f
    else
        print_warning "No Docker Compose file found. Cannot show logs."
    fi
}

# Function to show help
show_help() {
    echo "🚀 SmartRetail360 Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  docker      Deploy using Docker Compose"
    echo "  render      Deploy to Render.com"
    echo "  railway     Deploy to Railway.app"
    echo "  heroku      Deploy to Heroku"
    echo "  vercel      Deploy to Vercel"
    echo "  local       Start local development environment"
    echo "  stop        Stop all services"
    echo "  status      Show service status"
    echo "  logs        Show service logs"
    echo "  setup       Setup environment and install dependencies"
    echo "  build       Build application"
    echo "  help        Show this help message"
    echo
    echo "Examples:"
    echo "  $0 docker    # Deploy with Docker"
    echo "  $0 local     # Start local development"
    echo "  $0 setup     # Setup environment"
}

# Main script logic
case "${1:-help}" in
    "docker")
        check_prerequisites
        setup_environment
        deploy_docker
        ;;
    "render")
        check_prerequisites
        setup_environment
        build_application
        deploy_render
        ;;
    "railway")
        check_prerequisites
        setup_environment
        build_application
        deploy_railway
        ;;
    "heroku")
        check_prerequisites
        setup_environment
        build_application
        deploy_heroku
        ;;
    "vercel")
        check_prerequisites
        setup_environment
        build_application
        deploy_vercel
        ;;
    "local")
        check_prerequisites
        setup_environment
        install_dependencies
        start_local
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "setup")
        check_prerequisites
        setup_environment
        install_dependencies
        print_success "Setup completed!"
        ;;
    "build")
        check_prerequisites
        build_application
        ;;
    "help"|*)
        show_help
        ;;
esac 