# SmartRetail360 Environment Setup Guide

## 📋 Overview

This guide helps you set up all the required environment variables for the SmartRetail360 system. The application uses multiple `.env` files for different services.

## 🗂️ Environment Files Structure

```
SmartRetail360/
├── .env                    # Main application environment
├── client/.env            # Frontend environment
├── blockchain/.env        # Blockchain environment
├── ml_service/.env        # ML service environment
└── edge_device_sim/.env   # IoT device simulator environment
```

## 🔧 Setup Instructions

### 1. Main Application (.env)

**Location:** Root directory
**Purpose:** Backend server and core application settings

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `OPENWEATHER_API_KEY` - OpenWeather API key
- `ERP_API_KEY` - ERP system API key
- `LOGISTICS_API_KEY` - Logistics service API key

### 2. Frontend Environment (client/.env)

**Location:** `client/` directory
**Purpose:** Frontend application settings

```bash
# Copy the template
cp client/.env.example client/.env

# Edit with your values
nano client/.env
```

**Required Variables:**
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_ML_SERVICE_URL` - ML service URL
- `VITE_WS_URL` - WebSocket URL

### 3. Blockchain Environment (blockchain/.env)

**Location:** `blockchain/` directory
**Purpose:** Smart contract deployment and verification

```bash
# Copy the template
cp blockchain/.env.example blockchain/.env

# Edit with your values
nano blockchain/.env
```

**Required Variables:**
- `POLYGON_MUMBAI_RPC_URL` - Polygon Mumbai RPC endpoint
- `DEPLOYER_PRIVATE_KEY` - Private key for deployment
- `POLYGONSCAN_API_KEY` - Polygonscan API key

### 4. ML Service Environment (ml_service/.env)

**Location:** `ml_service/` directory
**Purpose:** Machine learning service configuration

```bash
# Copy the template
cp ml_service/.env.example ml_service/.env

# Edit with your values
nano ml_service/.env
```

**Required Variables:**
- `DATABASE_URL` - Database connection
- `OPENWEATHER_API_KEY` - Weather API key
- `GOOGLE_MAPS_API_KEY` - Maps API key

### 5. Edge Device Simulator (edge_device_sim/.env)

**Location:** `edge_device_sim/` directory
**Purpose:** IoT device simulation

```bash
# Copy the template
cp edge_device_sim/.env.example edge_device_sim/.env

# Edit with your values
nano edge_device_sim/.env
```

**Required Variables:**
- `MQTT_BROKER_URL` - MQTT broker URL
- `API_BASE_URL` - Backend API URL
- `API_KEY` - API authentication key

## 🔑 API Keys Required

### Essential (Must Have)
1. **Google Maps API Key**
   - Get from: [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Maps JavaScript API, Directions API, Geocoding API

2. **Database URL**
   - PostgreSQL connection string
   - Format: `postgresql://username:password@host:port/database`

3. **ML Service URL**
   - Default: `http://localhost:8000`
   - For production: Your ML service deployment URL

### Optional (Enhanced Features)
1. **OpenWeather API Key**
   - Get from: [OpenWeather](https://openweathermap.org/api)
   - Used for weather-based routing

2. **ERP API Key**
   - Your ERP system API key
   - Used for external ERP integration

3. **Logistics API Key**
   - Third-party logistics service API key
   - Used for external logistics integration

4. **VAPID Public Key**
   - Generate for push notifications
   - Used for browser notifications

5. **Polygon Mumbai RPC URL**
   - Get from: [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
   - Used for blockchain features

6. **Polygonscan API Key**
   - Get from: [Polygonscan](https://polygonscan.com/)
   - Used for contract verification

## 🚀 Quick Start

### 1. Set up Google Maps API Key
```bash
# Get your API key from Google Cloud Console
# Add domain restrictions for security
```

### 2. Set up Database
```bash
# For local development
DATABASE_URL=postgresql://username:password@localhost:5432/smartretail360

# For production (example with Neon)
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require
```

### 3. Update API Keys
```bash
# Edit each .env file and replace placeholder values
# Example:
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 4. Test Configuration
```bash
# Start the application
npm run dev

# Check if all services are running
curl http://localhost:3001/api/health
```

## 🔒 Security Best Practices

### 1. Never Commit .env Files
```bash
# Ensure .env files are in .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
```

### 2. Use Different Keys for Development/Production
```bash
# Development
GOOGLE_MAPS_API_KEY=dev_key_here

# Production
GOOGLE_MAPS_API_KEY=prod_key_here
```

### 3. Rotate API Keys Regularly
- Set up key rotation schedule
- Monitor API key usage
- Use environment-specific keys

### 4. Restrict API Key Permissions
- Google Maps: Add domain restrictions
- Database: Use read-only users where possible
- External APIs: Use least privilege principle

## 🐛 Troubleshooting

### Common Issues

1. **API Key Not Working**
   ```bash
   # Check if key is properly set
   echo $GOOGLE_MAPS_API_KEY
   
   # Verify in application
   console.log(process.env.GOOGLE_MAPS_API_KEY)
   ```

2. **Database Connection Failed**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Frontend Can't Connect to Backend**
   ```bash
   # Check VITE_API_URL
   echo $VITE_API_URL
   
   # Test backend endpoint
   curl $VITE_API_URL/health
   ```

### Environment Variable Debugging

```bash
# Check all environment variables
env | grep -E "(API|URL|KEY)"

# Test specific service
npm run test:env
```

## 📞 Support

If you encounter issues with environment setup:

1. Check the API_KEYS_SUMMARY.txt file
2. Verify all required variables are set
3. Test each service individually
4. Check logs for specific error messages

## 🔄 Environment Updates

When updating environment variables:

1. **Stop all services**
2. **Update .env files**
3. **Restart services**
4. **Test functionality**

```bash
# Restart all services
npm run restart:all
``` 