# 🚀 SmartRetail360 Quick Deploy Guide

## ⚡ Fastest Way to Deploy

### Option 1: Docker (Recommended - 5 minutes)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Smart-Retail-360

# 2. Make deployment script executable (Linux/Mac)
chmod +x deploy.sh

# 3. Deploy with Docker
./deploy.sh docker
# OR on Windows:
deploy.bat docker
```

**That's it!** Your application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **Grafana Monitoring**: http://localhost:3002

### Option 2: Local Development (10 minutes)

```bash
# 1. Setup environment
./deploy.sh setup
# OR on Windows:
deploy.bat setup

# 2. Start local development
./deploy.sh local
# OR on Windows:
deploy.bat local
```

### Option 3: Cloud Deployment (15 minutes)

#### Render.com (Free Tier)
```bash
# 1. Fork the repository to your GitHub account
# 2. Connect to Render.com
# 3. Deploy using the existing render.yaml configuration
```

#### Railway.app (Free Tier)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Deploy
./deploy.sh railway
```

## 🔧 Prerequisites

### Required Software
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Python 3.8+** - [Download](https://python.org/)
- **Docker Desktop** - [Download](https://docker.com/)
- **PostgreSQL 15+** (for local development)

### Quick Install Scripts

#### Windows (PowerShell)
```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install nodejs python docker-desktop postgresql
```

#### macOS (Homebrew)
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node python docker postgresql
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install dependencies
sudo apt install nodejs npm python3 python3-pip docker.io docker-compose postgresql postgresql-contrib
```

## 🌐 Environment Variables

Create a `.env` file in the root directory:

```bash
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
```

## 🚀 Deployment Commands

### Using the Deployment Script

```bash
# Show all available commands
./deploy.sh help
# OR on Windows:
deploy.bat help

# Setup environment and install dependencies
./deploy.sh setup

# Deploy with Docker
./deploy.sh docker

# Start local development
./deploy.sh local

# Stop all services
./deploy.sh stop

# Check service status
./deploy.sh status

# Show logs
./deploy.sh logs
```

### Manual Commands

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd ml_service && pip install -r requirements.txt && cd ..

# Build application
npm run build

# Start all services
npm run start:all

# Or start individually:
npm run start:backend  # Terminal 1
npm run start:ml       # Terminal 2  
npm run start:frontend # Terminal 3
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Check what's using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :8000

# Kill processes using those ports
sudo kill -9 <PID>
```

2. **Database Connection Issues**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
```

3. **Docker Issues**
```bash
# Check if Docker is running
docker info

# Start Docker if not running
sudo systemctl start docker
```

4. **Permission Issues**
```bash
# Make script executable
chmod +x deploy.sh

# Run with sudo if needed
sudo ./deploy.sh docker
```

### Health Checks

```bash
# Check if services are running
curl http://localhost:3001/api/system-health  # Backend
curl http://localhost:8000/health             # ML Service
curl http://localhost:3000                    # Frontend

# Check Docker containers
docker ps

# Check logs
docker-compose logs -f
```

## 📊 Monitoring

### Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **API Documentation**: http://localhost:3001/api-docs
- **Grafana Monitoring**: http://localhost:3002
- **Prometheus**: http://localhost:9090

### Default Credentials
- **Grafana**: admin/admin
- **Database**: smartretail360_user/smartretail360_password

## 🆘 Need Help?

1. **Check the full deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **View application logs**: `./deploy.sh logs`
3. **Check service status**: `./deploy.sh status`
4. **GitHub Issues**: [SmartRetail360 Repository](https://github.com/Akshat394/Smart-Retail-360)

## 🎯 Quick Demo

After deployment, you can:

1. **Explore the Dashboard** - View real-time KPIs and analytics
2. **Test AI Command Center** - Try anomaly detection and AI recommendations
3. **Check IoT Dashboard** - Monitor warehouse sensors and robots
4. **Run Digital Twin Simulations** - Test supply chain scenarios
5. **View Channel Analytics** - Explore omnichannel performance
6. **Test Video Analytics** - Watch demo videos with object detection

---

*This quick deploy guide gets you up and running in minutes. For production deployments, see the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide.* 