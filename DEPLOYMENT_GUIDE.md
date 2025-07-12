# 🌐 SmartRetail360 Deployment Guide

## 🚀 **How Others Can Visit Your Application**

### **Option 1: Render.com Deployment (Recommended - FREE)**

#### **Step 1: Deploy Backend & ML Service**
1. **Go to [Render.com](https://render.com)** and sign up
2. **Connect your GitHub repository:** `Akshat394/Smart-Retail-360`
3. **Create a new Blueprint** using the `render.yaml` file
4. **Set environment variables:**
   ```
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   NODE_ENV=production
   ```

#### **Step 2: Deploy Frontend (Static Site)**
1. **Create a new Static Site** on Render.com
2. **Connect the same repository**
3. **Build Command:** `npm install && npm run build:frontend`
4. **Publish Directory:** `dist/public`
5. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   VITE_ML_SERVICE_URL=https://your-ml-service-url.onrender.com
   ```

#### **Step 3: Database Setup**
1. **Create PostgreSQL database** on [Neon.tech](https://neon.tech) (FREE)
2. **Get connection string** and add to Render environment variables
3. **Run migrations:** The app will auto-run migrations on startup

**Result:** Your app will be live at `https://your-frontend-url.onrender.com`

---

### **Option 2: Railway.app Deployment (Alternative - FREE)**

#### **Step 1: Deploy Services**
1. **Go to [Railway.app](https://railway.app)** and sign up
2. **Connect your GitHub repository**
3. **Deploy each service separately:**
   - **Backend:** Deploy `server/` directory
   - **ML Service:** Deploy `ml_service/` directory
   - **Frontend:** Deploy as static site

#### **Step 2: Configure Environment**
```bash
# Backend Environment Variables
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_secret_key
NODE_ENV=production

# Frontend Environment Variables
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_ML_SERVICE_URL=https://your-ml-service-url.railway.app
```

**Result:** Your app will be live at `https://your-frontend-url.railway.app`

---

### **Option 3: Vercel + PlanetScale (Modern Stack - FREE)**

#### **Step 1: Database Setup**
1. **Create database** on [PlanetScale.com](https://planetscale.com)
2. **Get connection string** and configure

#### **Step 2: Deploy Backend**
1. **Go to [Vercel.com](https://vercel.com)**
2. **Import your repository**
3. **Configure as Node.js project**
4. **Set environment variables**

#### **Step 3: Deploy Frontend**
1. **Create new Vercel project**
2. **Configure for React/TypeScript**
3. **Set build settings:**
   - **Build Command:** `npm run build:frontend`
   - **Output Directory:** `dist/public`

**Result:** Your app will be live at `https://your-app.vercel.app`

---

### **Option 4: Docker Deployment (Self-Hosted)**

#### **Quick Start:**
```bash
# Clone the repository
git clone https://github.com/Akshat394/Smart-Retail-360.git
cd Smart-Retail-360

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run with Docker
docker-compose up -d

# Access the application
open http://localhost:3000
```

#### **Production Deployment:**
```bash
# Build production images
docker-compose -f docker-compose.yml build

# Run in production mode
docker-compose -f docker-compose.yml up -d

# Set up reverse proxy (nginx)
# Configure domain and SSL
```

---

### **Option 5: Manual Server Deployment**

#### **Requirements:**
- **VPS or Cloud Server** (DigitalOcean, AWS, etc.)
- **Domain name** (optional but recommended)
- **SSL certificate** (Let's Encrypt)

#### **Deployment Steps:**
```bash
# 1. Install dependencies
sudo apt update
sudo apt install nodejs npm python3 postgresql redis nginx

# 2. Clone repository
git clone https://github.com/Akshat394/Smart-Retail-360.git
cd Smart-Retail-360

# 3. Install dependencies
npm install
cd ml_service && pip install -r requirements.txt

# 4. Set up database
sudo -u postgres createdb smartretail360
sudo -u postgres psql -c "CREATE USER smartretail360_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smartretail360 TO smartretail360_user;"

# 5. Configure environment
cp .env.example .env
# Edit .env with your settings

# 6. Build and start
npm run build:all
npm start

# 7. Set up nginx reverse proxy
# Configure nginx to proxy requests to your app
```

---

## 🔧 **Environment Configuration**

### **Required Environment Variables:**

#### **Backend (.env)**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=production
```

#### **Frontend (.env)**
```bash
# API URLs
VITE_API_URL=https://your-backend-url.com/api
VITE_ML_SERVICE_URL=https://your-ml-service-url.com
VITE_WS_URL=wss://your-backend-url.com/ws

# Optional
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

#### **ML Service (.env)**
```bash
# Model paths
MODEL_PATH=/app/models

# API configuration
HOST=0.0.0.0
PORT=8000
```

---

## 🌍 **Public Access URLs**

Once deployed, your application will be accessible at:

### **Render.com Example:**
- **Frontend:** `https://smartretail360-frontend.onrender.com`
- **Backend API:** `https://smartretail360-backend.onrender.com`
- **ML Service:** `https://smartretail360-ml.onrender.com`

### **Railway.app Example:**
- **Frontend:** `https://smartretail360-frontend.railway.app`
- **Backend API:** `https://smartretail360-backend.railway.app`
- **ML Service:** `https://smartretail360-ml.railway.app`

### **Vercel Example:**
- **Frontend:** `https://smartretail360.vercel.app`
- **Backend API:** `https://smartretail360-api.vercel.app`

---

## 📱 **Mobile Access**

### **Progressive Web App (PWA)**
Your application includes PWA features:
- **Installable** on mobile devices
- **Offline support** for basic functionality
- **Push notifications** for real-time updates

### **Mobile-Optimized Interface**
- **Responsive design** works on all screen sizes
- **Touch-friendly** interface for mobile users
- **Fast loading** with optimized assets

---

## 🔒 **Security Considerations**

### **Production Security:**
- **HTTPS only** - All deployments use SSL
- **Environment variables** - Secrets stored securely
- **CORS configuration** - Proper cross-origin settings
- **Rate limiting** - API protection
- **Input validation** - XSS and injection protection

### **Access Control:**
- **JWT authentication** - Secure user sessions
- **Role-based access** - Admin and user permissions
- **Two-factor authentication** - Enhanced security
- **Session management** - Secure session handling

---

## 📊 **Monitoring & Analytics**

### **Built-in Monitoring:**
- **Real-time dashboards** - Live system metrics
- **Error tracking** - Automatic error reporting
- **Performance monitoring** - Response time tracking
- **User analytics** - Usage patterns and insights

### **External Monitoring:**
- **Uptime monitoring** - Service availability
- **Performance monitoring** - Response times
- **Error tracking** - Sentry integration ready
- **Log aggregation** - Centralized logging

---

## 🚀 **Quick Start for Visitors**

### **For End Users:**
1. **Visit the deployed URL** (e.g., `https://smartretail360.onrender.com`)
2. **Create an account** or use demo credentials
3. **Explore the dashboard** and features
4. **Try different modules** - Analytics, IoT, Blockchain

### **For Developers:**
1. **Clone the repository:** `git clone https://github.com/Akshat394/Smart-Retail-360.git`
2. **Follow setup instructions** in README.md
3. **Run locally:** `npm run start:all`
4. **Contribute:** Submit pull requests

### **For Businesses:**
1. **Contact for deployment** assistance
2. **Custom configuration** for your needs
3. **Integration support** with existing systems
4. **Training and support** for your team

---

## 📞 **Support & Contact**

### **Getting Help:**
- **GitHub Issues:** Report bugs and request features
- **Documentation:** Comprehensive guides and tutorials
- **Community:** Join discussions and share experiences
- **Email Support:** For business inquiries

### **Demo Access:**
- **Live Demo:** Available at deployed URL
- **Demo Credentials:** Provided in documentation
- **Feature Tour:** Guided walkthrough available
- **Video Tutorials:** Step-by-step guides

---

**🎉 Your SmartRetail360 application is ready for the world!**

Choose your preferred deployment method and share the URL with others. The application includes comprehensive documentation, security features, and professional deployment options for any use case. 