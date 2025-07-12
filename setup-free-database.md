# 🗄️ Free Database Setup Guide

This guide helps you set up free databases for your SmartRetail360 deployment.

## 🎯 Recommended: Neon.tech (PostgreSQL)

### Step 1: Create Neon Database
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Click "Create Project"
4. Choose a project name (e.g., "smart-retail-360")
5. Select your region (closest to your deployment)
6. Click "Create Project"

### Step 2: Get Connection String
1. In your Neon dashboard, click on your project
2. Go to "Connection Details"
3. Copy the connection string that looks like:
   ```
   postgresql://username:password@hostname/database
   ```

### Step 3: Add to Render.com
1. Go to your Render.com dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** Your Neon connection string

## 🔄 Alternative: Supabase (PostgreSQL)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Click "New Project"
4. Choose organization and project name
5. Set database password
6. Choose region
7. Click "Create new project"

### Step 2: Get Connection String
1. Go to Settings → Database
2. Copy the connection string
3. Replace `[YOUR-PASSWORD]` with your database password

### Step 3: Add to Render.com
Same as Neon.tech step 3.

## 🚀 Alternative: PlanetScale (MySQL)

### Step 1: Create PlanetScale Database
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up with GitHub
3. Click "New Database"
4. Choose a name (e.g., "smart-retail-360")
5. Select region
6. Click "Create Database"

### Step 2: Get Connection String
1. Go to "Connect" tab
2. Copy the connection string
3. Note: You'll need to update your code to use MySQL instead of PostgreSQL

### Step 3: Add to Render.com
Same as above.

## 🔧 Database Schema Setup

After setting up your database, you'll need to run migrations:

### For PostgreSQL (Neon/Supabase):
```sql
-- Run this in your database SQL editor
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add more tables as needed for your application
```

### For MySQL (PlanetScale):
```sql
-- Run this in your database SQL editor
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🧪 Test Database Connection

After setting up, test your connection:

### Using curl (if your backend is deployed):
```bash
curl https://your-backend-url.onrender.com/api/system-health
```

### Expected Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔍 Troubleshooting

### Common Issues:

1. **Connection Timeout:**
   - Check if your database allows connections from your deployment platform
   - Verify the connection string format

2. **Authentication Failed:**
   - Double-check username and password
   - Ensure the database user has proper permissions

3. **SSL Required:**
   - Add `?sslmode=require` to PostgreSQL connection strings
   - For MySQL, add `?ssl=true`

4. **Database Not Found:**
   - Verify the database name in your connection string
   - Create the database if it doesn't exist

## 📊 Free Tier Limits

### Neon.tech:
- **Storage:** 3GB
- **Compute:** Shared (limited)
- **Connections:** 100 concurrent
- **Backups:** 7 days retention

### Supabase:
- **Storage:** 500MB database
- **File Storage:** 50MB
- **Bandwidth:** 2GB/month
- **Auth:** 50,000 users

### PlanetScale:
- **Storage:** 1GB
- **Reads:** 1 billion/month
- **Writes:** 10 million/month
- **Connections:** 5 concurrent

## 🎯 Next Steps

After setting up your database:

1. ✅ Database created and connected
2. ✅ Environment variables configured
3. ✅ Schema created
4. ✅ Connection tested
5. 🚀 Deploy your application!

Your SmartRetail360 app should now have a working database for free! 🎉 