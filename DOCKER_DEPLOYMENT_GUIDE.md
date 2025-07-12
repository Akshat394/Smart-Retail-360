# 🚀 SmartRetail360 Docker Deployment Guide

This guide provides a complete roadmap for deploying the SmartRetail360 application using Docker containers.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Detailed Deployment Steps](#detailed-deployment-steps)
5. [Service Configuration](#service-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

## 🔧 Prerequisites

### System Requirements
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)
- **8GB RAM** minimum (16GB recommended)
- **20GB free disk space**
- **Windows 10/11** or **macOS 10.15+** or **Ubuntu 18.04+**

### Software Installation
1. **Install Docker Desktop**
   - Download from: https://docker.com/
   - Follow installation instructions for your OS
   - Ensure Docker is running

2. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

## 🏗️ Architecture Overview

The SmartRetail360 application consists of the following services:

### Core Services
- **Frontend** (React + TypeScript) - Port 3000
- **Backend API** (Node.js + Express) - Port 3001
- **ML Service** (Python + FastAPI) - Port 8000
- **Database** (PostgreSQL) - Port 5432
- **Cache** (Redis) - Port 6379

### Infrastructure Services
- **Nginx** (Reverse Proxy) - Port 80
- **MQTT Broker** (IoT Communication) - Port 1883
- **Blockchain** (Ganache) - Port 8545

### Monitoring & Logging
- **Prometheus** (Metrics) - Port 9090
- **Grafana** (Dashboards) - Port 3002
- **Elasticsearch** (Log Storage) - Port 9200
- **Kibana** (Log Visualization) - Port 5601
- **Filebeat** (Log Collection)

### Testing
- **Selenium Hub** (Automated Testing) - Port 4444

## ⚡ Quick Start

### Option 1: One-Command Deployment (Recommended)

**Windows:**
```cmd
deploy-docker.bat
```

**Linux/macOS:**
```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

### Option 2: Manual Deployment

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Smart-Retail-360

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps
```

## 📝 Detailed Deployment Steps

### Step 1: Environment Setup

1. **Create Environment File**
   ```bash
   # The deployment script will create this automatically
   # Or create manually:
   cp .env.example .env
   ```

2. **Configure Environment Variables**
   ```bash
   # Edit .env file with your settings
   nano .env
   ```

### Step 2: Directory Structure

The deployment script creates the following directory structure:
```
Smart-Retail-360/
├── nginx/
│   ├── logs/
│   └── ssl/
├── mqtt/
│   ├── config/
│   ├── data/
│   └── log/
├── monitoring/
│   ├── grafana/
│   │   ├── dashboards/
│   │   └── datasources/
│   └── prometheus.yml
└── logs/
```

### Step 3: Service Deployment

1. **Build Images**
   ```bash
   docker-compose build --parallel
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Monitor Startup**
   ```bash
   docker-compose logs -f
   ```

### Step 4: Database Initialization

1. **Run Migrations**
   ```bash
   docker-compose exec backend npm run db:push
   ```

2. **Initialize Sample Data**
   ```bash
   docker-compose exec postgres psql -U smartretail360_user -d smartretail360 -c "
   INSERT INTO users (email, password_hash, first_name, last_name, role) 
   VALUES ('demo@smartretail360.com', crypt('demo123', gen_salt('bf')), 'Demo', 'User', 'admin')
   ON CONFLICT (email) DO NOTHING;
   "
   ```

## ⚙️ Service Configuration

### Frontend Configuration
- **Framework**: React + TypeScript + Vite
- **Port**: 3000
- **Build**: Multi-stage Docker build with Nginx
- **Environment Variables**:
  - `VITE_API_URL`: Backend API URL
  - `VITE_ML_SERVICE_URL`: ML Service URL
  - `VITE_WS_URL`: WebSocket URL

### Backend Configuration
- **Framework**: Node.js + Express + TypeScript
- **Port**: 3001
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis
- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `JWT_SECRET`: JWT signing secret
  - `REDIS_URL`: Redis connection string

### ML Service Configuration
- **Framework**: Python + FastAPI
- **Port**: 8000
- **Models**: YOLOv8, ARIMA, LSTM
- **Environment Variables**:
  - `MODEL_PATH`: Path to ML models
  - `REDIS_URL`: Redis for caching

### Database Configuration
- **Engine**: PostgreSQL 15
- **Port**: 5432
- **Initialization**: `init.sql` script
- **Extensions**: UUID, PGCrypto
- **Sample Data**: Users, Products, Orders

## 📊 Monitoring & Logging

### Prometheus Metrics
- **URL**: http://localhost:9090
- **Configuration**: `monitoring/prometheus.yml`
- **Targets**: All services with health checks
- **Retention**: 200 hours

### Grafana Dashboards
- **URL**: http://localhost:3002
- **Credentials**: admin/admin
- **Dashboards**: SmartRetail360 overview
- **Data Sources**: Prometheus

### ELK Stack
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **Filebeat**: Container log collection

### Health Checks
All services include health check endpoints:
- Frontend: `http://localhost:3000/health`
- Backend: `http://localhost:3001/api/system-health`
- ML Service: `http://localhost:8000/health`

## 🔧 Management Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Individual Service Management
```bash
# Start specific service
docker-compose up -d backend

# View logs for specific service
docker-compose logs -f frontend

# Execute commands in container
docker-compose exec backend npm run db:push
```

### Data Management
```bash
# Backup database
docker-compose exec postgres pg_dump -U smartretail360_user smartretail360 > backup.sql

# Restore database
docker-compose exec -T postgres psql -U smartretail360_user smartretail360 < backup.sql

# View database logs
docker-compose logs postgres
```

### Monitoring Commands
```bash
# Check service health
curl http://localhost:3001/api/system-health

# View Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana status
curl http://localhost:3002/api/health
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   
   # Stop conflicting services
   sudo systemctl stop nginx  # if nginx is running
   ```

2. **Docker Resource Issues**
   ```bash
   # Increase Docker resources in Docker Desktop
   # Settings > Resources > Memory: 8GB, CPUs: 4
   ```

3. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Restart database
   docker-compose restart postgres
   ```

4. **Build Failures**
   ```bash
   # Clean and rebuild
   docker-compose down
   docker system prune -f
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Debug Commands
```bash
# View all container logs
docker-compose logs

# Check container status
docker-compose ps

# Inspect container
docker-compose exec backend sh

# Check network connectivity
docker-compose exec backend ping postgres
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check disk space
docker system df

# Clean up unused resources
docker system prune -a
```

## 🚀 Production Deployment

### Security Considerations

1. **Environment Variables**
   ```bash
   # Change default passwords
   JWT_SECRET=your-super-secure-jwt-secret
   POSTGRES_PASSWORD=your-secure-db-password
   GRAFANA_ADMIN_PASSWORD=your-secure-admin-password
   ```

2. **SSL/TLS Configuration**
   ```bash
   # Add SSL certificates to nginx/ssl/
   # Update nginx configuration for HTTPS
   ```

3. **Network Security**
   ```bash
   # Use Docker networks for service isolation
   # Configure firewall rules
   # Enable Docker security scanning
   ```

### Scaling Considerations

1. **Horizontal Scaling**
   ```bash
   # Scale backend services
   docker-compose up -d --scale backend=3
   
   # Scale ML services
   docker-compose up -d --scale ml-service=2
   ```

2. **Load Balancing**
   ```bash
   # Configure nginx for load balancing
   # Add multiple backend instances
   ```

3. **Database Scaling**
   ```bash
   # Consider external database service
   # Implement read replicas
   # Use connection pooling
   ```

### Backup Strategy

1. **Database Backups**
   ```bash
   # Automated backup script
   #!/bin/bash
   docker-compose exec postgres pg_dump -U smartretail360_user smartretail360 > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Configuration Backups**
   ```bash
   # Backup configuration files
   tar -czf config_backup_$(date +%Y%m%d).tar.gz .env docker-compose.yml nginx/ monitoring/
   ```

3. **Volume Backups**
   ```bash
   # Backup Docker volumes
   docker run --rm -v smartretail360_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /data .
   ```

## 📞 Support

### Getting Help
1. Check the logs: `docker-compose logs -f`
2. Verify prerequisites: Docker, Docker Compose
3. Check system resources: RAM, CPU, Disk
4. Review configuration files
5. Test individual services

### Useful Resources
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

**🎉 Congratulations!** Your SmartRetail360 application is now deployed and ready to use.

**Access your application at:** http://localhost:3000 