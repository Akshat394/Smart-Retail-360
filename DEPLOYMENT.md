# 🚀 SmartRetail360 Deployment Guide

This guide provides comprehensive deployment options for the SmartRetail360 application across different platforms and environments.

## 📋 Prerequisites

### System Requirements
- **Node.js 20+** for backend and frontend
- **Python 3.8+** for ML service
- **PostgreSQL 15+** for database
- **Redis 7+** for caching (optional)
- **Docker & Docker Compose** (for containerized deployment)

### Environment Variables
Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/smartretail360

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

---

## 🐳 Option 1: Docker Deployment (Recommended)

### Quick Start with Docker Compose

1. **Clone and Setup**
```bash
git clone <your-repo-url>
cd Smart-Retail-360
```

2. **Start All Services**
```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

3. **Access Applications**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **Grafana Monitoring**: http://localhost:3002
- **Prometheus**: http://localhost:9090

### Individual Service Deployment

#### Backend Service
```bash
# Build backend image
docker build -t smartretail360-backend ./server

# Run backend container
docker run -d \
  --name smartretail360-backend \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  smartretail360-backend
```

#### Frontend Service
```bash
# Build frontend image
docker build -t smartretail360-frontend ./client

# Run frontend container
docker run -d \
  --name smartretail360-frontend \
  -p 3000:3000 \
  -e VITE_API_URL=http://localhost:3001/api \
  smartretail360-frontend
```

#### ML Service
```bash
# Build ML service image
docker build -t smartretail360-ml ./ml_service

# Run ML service container
docker run -d \
  --name smartretail360-ml \
  -p 8000:8000 \
  -v $(pwd)/ml_service/models:/app/models \
  smartretail360-ml
```

---

## ☁️ Option 2: Cloud Platform Deployment

### A. Render.com Deployment

1. **Connect Repository**
   - Fork/clone the repository to your GitHub account
   - Connect your GitHub repo to Render.com

2. **Deploy Backend Service**
   ```yaml
   # render.yaml (already configured)
   services:
     - type: web
       name: smart-retail-backend
       env: node
       plan: free
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: DATABASE_URL
           sync: false
   ```

3. **Deploy Frontend Service**
   ```yaml
   services:
     - type: static
       name: smart-retail-frontend
       buildCommand: npm run build
       staticPublishPath: dist
       rootDir: client
       envVars:
         - key: VITE_API_URL
           value: https://your-backend-url.onrender.com/api
   ```

4. **Set Environment Variables in Render Dashboard**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Your JWT secret key
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key

### B. Railway.app Deployment

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Deploy Services**
```bash
# Login to Railway
railway login

# Deploy backend
cd server
railway init
railway up

# Deploy frontend
cd ../client
railway init
railway up

# Deploy ML service
cd ../ml_service
railway init
railway up
```

3. **Configure Environment Variables**
```bash
# Set backend variables
railway variables set DATABASE_URL=your-db-url
railway variables set JWT_SECRET=your-secret

# Set frontend variables
railway variables set VITE_API_URL=https://your-backend-url.railway.app/api
```

### C. Heroku Deployment

1. **Install Heroku CLI**
```bash
# macOS
brew install heroku/brew/heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

2. **Deploy Backend**
```bash
# Create Heroku app
heroku create smartretail360-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Deploy
git subtree push --prefix=server heroku main
```

3. **Deploy Frontend**
```bash
# Create frontend app
heroku create smartretail360-frontend

# Build and deploy
cd client
npm run build
git add dist
git commit -m "Build for production"
git subtree push --prefix=dist heroku main
```

4. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
heroku config:set GOOGLE_MAPS_API_KEY=your-api-key
```

### D. Vercel Deployment

1. **Deploy Frontend**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client
vercel --prod
```

2. **Deploy Backend API**
```bash
# Deploy backend as serverless functions
cd server
vercel --prod
```

3. **Configure Environment Variables**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add GOOGLE_MAPS_API_KEY
```

---

## 🖥️ Option 3: Manual Deployment

### A. Local Development Setup

1. **Install Dependencies**
```bash
# Root dependencies
npm install

# Frontend dependencies
cd client && npm install && cd ..

# Backend dependencies (already installed in root)
# ML service dependencies
cd ml_service && pip install -r requirements.txt && cd ..
```

2. **Database Setup**
```bash
# Create PostgreSQL database
createdb smartretail360

# Run migrations
npm run db:push
```

3. **Start Services**
```bash
# Start all services concurrently
npm run start:all

# Or start individually:
# Terminal 1: Backend
npm run start:backend

# Terminal 2: ML Service
npm run start:ml

# Terminal 3: Frontend
npm run start:frontend
```

### B. Production Server Setup

1. **Server Requirements**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm python3 python3-pip postgresql postgresql-contrib nginx redis-server

# CentOS/RHEL
sudo yum install nodejs npm python3 python3-pip postgresql postgresql-server nginx redis
```

2. **Application Setup**
```bash
# Clone repository
git clone <your-repo-url>
cd Smart-Retail-360

# Install dependencies
npm install
cd client && npm install && cd ..
cd ml_service && pip install -r requirements.txt && cd ..

# Build for production
npm run build
```

3. **Process Management with PM2**
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server/index.ts --name "smartretail360-backend" --interpreter tsx

# Start ML service
pm2 start ml_service/main.py --name "smartretail360-ml" --interpreter python3

# Start frontend (if serving from Node.js)
pm2 start npm --name "smartretail360-frontend" -- run start:frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

4. **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/smartretail360
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/Smart-Retail-360/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # ML Service
    location /ml {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

5. **Enable Nginx Site**
```bash
sudo ln -s /etc/nginx/sites-available/smartretail360 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔧 Option 4: Kubernetes Deployment

### A. Create Kubernetes Manifests

1. **Namespace**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: smartretail360
```

2. **ConfigMap**
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: smartretail360-config
  namespace: smartretail360
data:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/smartretail360"
  NODE_ENV: "production"
```

3. **Secret**
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: smartretail360-secret
  namespace: smartretail360
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  GOOGLE_MAPS_API_KEY: <base64-encoded-api-key>
```

4. **Backend Deployment**
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartretail360-backend
  namespace: smartretail360
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smartretail360-backend
  template:
    metadata:
      labels:
        app: smartretail360-backend
    spec:
      containers:
      - name: backend
        image: smartretail360-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: smartretail360-config
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: smartretail360-secret
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

5. **Frontend Deployment**
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartretail360-frontend
  namespace: smartretail360
spec:
  replicas: 2
  selector:
    matchLabels:
      app: smartretail360-frontend
  template:
    metadata:
      labels:
        app: smartretail360-frontend
    spec:
      containers:
      - name: frontend
        image: smartretail360-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: VITE_API_URL
          value: "http://smartretail360-backend:3001/api"
```

6. **Services**
```yaml
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: smartretail360-backend-service
  namespace: smartretail360
spec:
  selector:
    app: smartretail360-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: smartretail360-frontend-service
  namespace: smartretail360
spec:
  selector:
    app: smartretail360-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### B. Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml

# Check deployment status
kubectl get pods -n smartretail360
kubectl get services -n smartretail360
```

---

## 🔍 Monitoring & Health Checks

### A. Application Health Endpoints
```bash
# Backend health check
curl http://localhost:3001/api/system-health

# ML service health check
curl http://localhost:8000/health

# Frontend health check
curl http://localhost:3000
```

### B. Docker Health Checks
```bash
# Check container health
docker ps
docker logs smartretail360-backend
docker logs smartretail360-frontend
docker logs smartretail360-ml
```

### C. Kubernetes Health Checks
```bash
# Check pod status
kubectl get pods -n smartretail360

# Check logs
kubectl logs -f deployment/smartretail360-backend -n smartretail360

# Check service endpoints
kubectl get endpoints -n smartretail360
```

---

## 🔒 Security Considerations

### A. Environment Variables
- Never commit `.env` files to version control
- Use secrets management in production
- Rotate JWT secrets regularly

### B. Database Security
```sql
-- Create dedicated database user
CREATE USER smartretail360_user WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE smartretail360 TO smartretail360_user;
GRANT USAGE ON SCHEMA public TO smartretail360_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartretail360_user;
```

### C. SSL/TLS Configuration
```nginx
# Nginx SSL configuration
server {
    listen 443 ssl;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

---

## 🚀 Performance Optimization

### A. Frontend Optimization
```bash
# Build with optimizations
npm run build

# Enable gzip compression in Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### B. Backend Optimization
```javascript
// Enable compression
app.use(compression());

// Enable caching
app.use(express.static('public', { maxAge: '1d' }));
```

### C. Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_delivery_route_id ON deliveries(route_id);
```

---

## 📊 Troubleshooting

### Common Issues

1. **Database Connection Issues**
```bash
# Check database connectivity
psql -h localhost -U username -d smartretail360

# Check environment variables
echo $DATABASE_URL
```

2. **Port Conflicts**
```bash
# Check port usage
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :8000
```

3. **Memory Issues**
```bash
# Check memory usage
docker stats
kubectl top pods -n smartretail360
```

4. **Log Analysis**
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ml-service
```

---

## 📞 Support

For deployment issues or questions:
- **GitHub Issues**: [SmartRetail360 Repository](https://github.com/Akshat394/Smart-Retail-360)
- **Email**: [team@smartretail360.com](mailto:team@smartretail360.com)
- **Documentation**: [Full API Documentation](https://docs.smartretail360.com)

---

*This deployment guide covers all major deployment scenarios for SmartRetail360. Choose the option that best fits your infrastructure and requirements.* 