#!/bin/bash

# 🚀 SmartRetail360 One-Command Deployment
# This script deploys the entire application with minimal user interaction

set -e

echo "🚀 SmartRetail360 - One-Command Deployment"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the SmartRetail360 project root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

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

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating environment configuration..."
    cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://smartretail360_user:smartretail360_password@postgres:5432/smartretail360

# JWT Secret
JWT_SECRET=smartretail360-jwt-secret-key-2024

# Google Maps API (optional - for mapping features)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Redis
REDIS_URL=redis://redis:6379

# ML Service
ML_SERVICE_URL=http://ml-service:8000

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:3001/ws
EOF
    print_success "Environment configuration created!"
fi

# Deploy with Docker Compose
print_status "Starting SmartRetail360 deployment..."

# Pull latest images and start services
docker-compose up -d --build

print_success "Deployment completed successfully!"
echo
echo "🎉 SmartRetail360 is now running!"
echo
echo "📱 Application URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:3001"
echo "   ML Service:   http://localhost:8000"
echo "   API Docs:     http://localhost:3001/api-docs"
echo
echo "📊 Monitoring:"
echo "   Grafana:      http://localhost:3002 (admin/admin)"
echo "   Prometheus:   http://localhost:9090"
echo
echo "🔧 Management Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Status:       docker-compose ps"
echo
echo "🎯 Quick Demo Features:"
echo "   1. Dashboard - Real-time KPIs and analytics"
echo "   2. AI Command Center - Anomaly detection and recommendations"
echo "   3. IoT Dashboard - Warehouse sensors and robots"
echo "   4. Digital Twin - Supply chain simulations"
echo "   5. Channel Analytics - Omnichannel performance"
echo "   6. Video Analytics - Object detection demos"
echo
print_status "Services are starting up. Please wait 1-2 minutes for all services to be ready."
print_status "You can view logs with: docker-compose logs -f"

# Show logs for a few seconds to demonstrate
echo
print_status "Showing recent logs (Ctrl+C to exit)..."
sleep 3
docker-compose logs --tail=20 