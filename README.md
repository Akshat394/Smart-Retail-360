# SmartRetail360 - Supply Chain AI Platform

A comprehensive supply chain orchestration platform that combines real-time analytics, demand forecasting, route optimization, and digital twin simulation capabilities.

## Features

- **Real-time Dashboard**: Live KPI monitoring with WebSocket updates
- **Route Optimization**: AI-powered logistics with multiple optimization modes
- **Analytics & Forecasting**: ML-powered demand prediction with ARIMA, LSTM, and ensemble models
- **Digital Twin**: Scenario simulation for supply chain testing
- **Driver Management**: Complete CRUD operations for delivery team management
- **Role-based Access Control**: Multi-user system with granular permissions

## User Roles

- **Admin**: Full system access and user management
- **Manager**: Management features and analytics access
- **Operations**: Driver and route management capabilities
- **Analyst**: Analytics and forecasting tools
- **Planner**: Supply chain planning and analytics
- **Viewer**: Dashboard view only

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS + Radix UI components
- Framer Motion for animations
- TanStack React Query for state management

### Backend
- Node.js 20 with Express.js
- TypeScript with ES modules
- PostgreSQL with Drizzle ORM
- WebSocket for real-time updates
- Session-based authentication with bcrypt

### Database
- PostgreSQL (Neon serverless)
- Drizzle ORM for type-safe queries
- Real-time notifications via LISTEN/NOTIFY

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smartretail360
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy and configure your database URL
DATABASE_URL=your_postgresql_connection_string
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Production User Accounts

The following team members have access to the system:

- **Akshat Trivedi** - System Administrator
- **Arushi Gupta** - Executive/Manager  
- **Abhishek Srivastava** - Operations Manager
- **Tanveer Hussain Khan** - Data Analyst/Forecasting Specialist
- **Arushi Gupta** - Supply Chain Planner

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API service layer
├── server/                 # Express backend
│   ├── auth.ts            # Authentication middleware
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── db.ts              # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema definitions
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Admin-only user creation

### Drivers
- `GET /api/drivers` - List all drivers
- `POST /api/drivers` - Create new driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Routes
- `GET /api/routes` - List all routes
- `POST /api/routes` - Create new route
- `PUT /api/routes/:id` - Update route

### System
- `GET /api/system-health` - Real-time metrics
- `GET /api/inventory` - Inventory status
- `GET /api/events` - Recent system events

## Real-time Features

The application uses WebSocket connections for:
- Live dashboard metrics updates
- Real-time driver status changes
- Route optimization notifications
- System health monitoring

## Security

- Session-based authentication with secure tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- SQL injection protection via Drizzle ORM
- Input validation with Zod schemas

## Development

### Database Management
```bash
# Push schema changes
npm run db:push

# Generate migrations (if needed)
npm run db:generate
```

### Building for Production
```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

## License

Private project - All rights reserved

## Support

For technical support or questions about the platform, contact the development team.