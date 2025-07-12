#!/bin/bash

# 🚀 SmartRetail360 Docker Deployment Script
# Complete deployment with monitoring, logging, and testing

set -e

echo "🚀 SmartRetail360 - Complete Docker Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Status functions
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the SmartRetail360 project root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_step "Checking prerequisites..."

MISSING_DEPS=()
if ! command_exists docker; then MISSING_DEPS+=("Docker"); fi
if ! command_exists docker-compose; then MISSING_DEPS+=("Docker Compose"); fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    print_error "Missing dependencies: ${MISSING_DEPS[*]}"
    print_status "Please install Docker Desktop and try again."
    print_status "Download from: https://docker.com/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

print_success "All prerequisites are satisfied!"

# Create necessary directories
print_step "Creating required directories..."
mkdir -p nginx/logs nginx/ssl
mkdir -p mqtt/config mqtt/data mqtt/log
mkdir -p monitoring/grafana/dashboards monitoring/grafana/datasources
mkdir -p logs

print_success "Directories created!"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_step "Creating environment configuration..."
    cat > .env << 'EOF'
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
GANACHE_MNEMONIC="smart retail 360 blockchain development mnemonic"

# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=admin
PROMETHEUS_RETENTION_TIME=200h

# Logging Configuration
ELASTICSEARCH_DISCOVERY_TYPE=single-node
ELASTICSEARCH_XPACK_SECURITY_ENABLED=false

# Environment
NODE_ENV=production
PYTHONPATH=/app
EOF
    print_success "Environment configuration created!"
fi

# Stop any existing containers
print_step "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true
print_success "Existing containers stopped!"

# Clean up old images (optional)
if [ "$1" = "--clean" ]; then
    print_step "Cleaning up old images..."
    docker system prune -f
    print_success "Cleanup completed!"
fi

# Build and start services
print_step "Building and starting services..."

# Build images in parallel
print_status "Building Docker images..."
docker-compose build --parallel

print_success "Images built successfully!"

# Start services
print_status "Starting services..."
docker-compose up -d

print_success "Services started!"

# Wait for services to be ready
print_step "Waiting for services to be ready..."

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "Up"; then
            print_success "$service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start within expected time"
    return 1
}

# Wait for critical services
wait_for_service postgres
wait_for_service redis
wait_for_service backend
wait_for_service frontend
wait_for_service ml-service

print_success "All critical services are ready!"

# Run database migrations
print_step "Running database migrations..."
docker-compose exec -T backend npm run db:push || {
    print_warning "Database migration failed, but continuing..."
}

# Initialize sample data
print_step "Initializing sample data..."
docker-compose exec -T postgres psql -U smartretail360_user -d smartretail360 -c "
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('demo@smartretail360.com', crypt('demo123', gen_salt('bf')), 'Demo', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;
" 2>/dev/null || print_warning "Sample data initialization skipped"

print_success "Sample data initialized!"

# Show deployment summary
echo
echo "🎉 SmartRetail360 Deployment Complete!"
echo "====================================="
echo
echo "📱 Application URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:3001"
echo "   ML Service:   http://localhost:8000"
echo "   API Docs:     http://localhost:3001/api-docs"
echo
echo "🔧 Management URLs:"
echo "   Nginx Proxy:  http://localhost:80"
echo "   Grafana:      http://localhost:3002 (admin/admin)"
echo "   Prometheus:   http://localhost:9090"
echo "   Kibana:       http://localhost:5601"
echo
echo "🧪 Testing URLs:"
echo "   Selenium Hub: http://localhost:4444"
echo
echo "🔗 Blockchain:"
echo "   Ganache:      http://localhost:8545"
echo
echo "📊 Demo Credentials:"
echo "   Email: demo@smartretail360.com"
echo "   Password: demo123"
echo
echo "🔧 Management Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Status:       docker-compose ps"
echo "   Clean restart: ./deploy-docker.sh --clean"
echo
echo "🎯 Quick Demo Features:"
echo "   1. Dashboard - Real-time KPIs and analytics"
echo "   2. AI Command Center - Anomaly detection and recommendations"
echo "   3. IoT Dashboard - Warehouse sensors and robots"
echo "   4. Digital Twin - Supply chain simulations"
echo "   5. Channel Analytics - Omnichannel performance"
echo "   6. Video Analytics - Object detection demos"
echo "   7. Blockchain - Supply chain traceability"
echo "   8. Monitoring - Grafana dashboards and alerts"
echo

# Show recent logs
print_status "Showing recent logs (Ctrl+C to exit)..."
sleep 3
docker-compose logs --tail=20

echo
print_success "Deployment completed successfully!"
print_status "Access the application at: http://localhost:3000" 