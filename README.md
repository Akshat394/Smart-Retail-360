# 🚀 SmartRetail360 – AI-Powered Supply Chain Platform

![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)

> **SmartRetail360** is a next-generation supply chain orchestration platform, blending real-time analytics, AI-powered demand forecasting, route optimization, and digital twin simulation into a single, beautiful dashboard.

---

## ✨ Key Features

- **📊 Real-time Dashboard:** Live KPI monitoring with instant WebSocket updates
- **🗺️ Route Optimization:** AI-powered, eco-friendly, and fastest route planning with Dijkstra's algorithm and real Indian city data
- **📈 Analytics & Forecasting:** ML-powered demand prediction (ARIMA, LSTM, Ensemble)
- **🧑‍💼 Driver Management:** Full CRUD for delivery teams, live status, and assignment
- **🛣️ Vehicle Tracking:** Interactive Google Maps with live vehicle locations, traffic alerts, and route polylines
- **🧠 Digital Twin:** Scenario simulation for supply chain stress-testing
- **🔒 Role-based Access Control:** Multi-user system with granular permissions (Admin, Manager, Operations, Analyst, Planner, Viewer)
- **⚡ Real-time Alerts:** Traffic, route, and system health alerts with actionable insights
- **🌱 Carbon Optimization:** Minimize emissions with eco-routing and analytics

---

## 🖥️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite ⚡
- Tailwind CSS + Radix UI
- Framer Motion (animations)
- Google Maps (via @vis.gl/react-google-maps)

**Backend:**
- Node.js 20 + Express.js
- TypeScript (ESM)
- PostgreSQL (Neon serverless)
- Drizzle ORM (type-safe SQL)
- WebSocket (real-time updates)
- Session Auth (bcrypt)

**DevOps:**
- Modern monorepo structure
- Hot reload for dev, optimized chunked builds for prod

---

## 🚦 Live Demo Features

- **Live KPI Dashboard:** Forecast accuracy, on-time delivery, carbon footprint, inventory turnover, and more
- **Route Optimization:** Select any Indian city, see optimized route from New Delhi HQ, live traffic alerts, and carbon savings
- **Vehicle Map:** Real-time vehicle locations, traffic alerts, and route overlays on Google Maps
- **Driver Management:** Add, edit, assign, and monitor drivers
- **Analytics:** Demand forecasting, anomaly detection, and model performance comparison
- **Digital Twin:** Simulate supply chain scenarios and see instant impact

---

## 🏁 Quickstart

### 1. Prerequisites
- Node.js 20+
- PostgreSQL (Neon or local)
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/Akshat394/Smart-Retail-360.git
cd Smart-Retail-360
npm install
```

### 3. Environment Setup
Create a `.env` file in the root:
```env
DATABASE_URL=your_postgresql_connection_string
```

### 4. Database Migration
```bash
npm run db:push
```

### 5. Start Development
```bash
npm run dev
```
App runs at: [http://localhost:5000](http://localhost:5000)

### 6. Production Build
```bash
npm run build
npm start
```

---

## 🗂️ Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API service layer
├── server/                 # Express backend
│   ├── auth.ts             # Auth middleware
│   ├── routes.ts           # API routes
│   ├── storage.ts          # DB operations
│   └── db.ts               # DB connection
├── shared/                 # Shared types & schemas
│   └── schema.ts           # DB schema
└── package.json
```

---

## 🔗 API Endpoints (Highlights)
- `POST /api/auth/login` – User login
- `GET /api/drivers` – List drivers
- `POST /api/drivers` – Create driver
- `GET /api/routes` – List routes
- `GET /api/system-health` – Real-time metrics
- `GET /api/traffic-alerts` – Live traffic alerts
- `GET /api/route-analytics` – Route analytics

---

## 🔒 Security & Best Practices
- Session-based authentication with secure tokens
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- SQL injection protection (Drizzle ORM)
- Input validation (Zod)

---

## 👥 Team & Roles
- **Akshat Trivedi** – System Administrator
- **Arushi Gupta** – Executive/Manager, Supply Chain Planner
- **Abhishek Srivastava** – Operations Manager
- **Tanveer Hussain Khan** – Data Analyst/Forecasting Specialist

---

## 📣 Support
For technical support or questions, contact the development team or open an issue on [GitHub](https://github.com/Akshat394/Smart-Retail-360).

---

## 📝 License
Private project – All rights reserved