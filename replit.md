# SmartRetail360 - Supply Chain AI Platform

## Overview

SmartRetail360 is a comprehensive supply chain orchestration platform that combines real-time analytics, demand forecasting, route optimization, and digital twin simulation capabilities. The application leverages modern web technologies with a full-stack architecture designed for scalability and real-time data processing.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: React hooks with custom real-time data hooks
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Recharts for data visualization
- **Data Fetching**: TanStack React Query for efficient API state management

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple
- **Development**: Hot reload with Vite middleware integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL for structured data
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Management**: Drizzle Kit for migrations
- **In-Memory Storage**: MemStorage class for development/testing
- **Real-time Data**: Custom hooks simulating WebSocket connections

## Key Components

### Core Modules
1. **Dashboard**: Real-time KPI monitoring with live data updates
2. **Route Optimization**: Advanced routing algorithms with multiple optimization modes
3. **Analytics/Forecasting**: ML-powered demand prediction with ARIMA, LSTM, and ensemble models
4. **Digital Twin**: Scenario simulation for supply chain testing
5. **Settings**: System configuration and model management

### Shared Components
- **Schema**: Centralized database schema definitions in `/shared/schema.ts`
- **Type Safety**: Full TypeScript coverage with Zod validation
- **UI Components**: Reusable Radix UI components with consistent styling

### Infrastructure Components
- **API Service**: RESTful API client with error handling
- **Real-time Hooks**: Custom hooks for live data simulation
- **Storage Interface**: Abstracted storage layer supporting multiple implementations

## Data Flow

1. **Client Requests**: React components make API calls through centralized service layer
2. **Server Processing**: Express routes handle requests and interact with storage layer
3. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
4. **Real-time Updates**: Custom hooks simulate live data streams for dashboard updates
5. **State Management**: React Query manages API state with caching and synchronization

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React ecosystem with TypeScript support
- **Styling**: Tailwind CSS with custom design system
- **Animation**: Framer Motion for interactive animations
- **Data Visualization**: Recharts for analytics charts
- **Form Handling**: React Hook Form with Zod resolvers

### Backend Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Store**: PostgreSQL-based session management
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds

### Development Tools
- **Build System**: Vite with React plugin and error overlay
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Package Management**: npm with lockfile for dependency consistency

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Hot Reload**: Vite development server with Express middleware
- **Port Configuration**: Application runs on port 5000 with external port 80

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Autoscale deployment target with npm build/start scripts
- **Environment**: Production mode with NODE_ENV configuration

### Build Process
1. Frontend assets compiled with Vite
2. Server code bundled with esbuild
3. Static files served from dist/public
4. Database migrations applied via Drizzle Kit

## Changelog

```
Changelog:
- June 21, 2025. Initial setup
- June 21, 2025. Database integration completed - PostgreSQL database added with Drizzle ORM
- June 21, 2025. Real-time functionality implemented - WebSocket server with PostgreSQL LISTEN/NOTIFY
- June 21, 2025. Authentication system implemented - Multi-role user management with session-based auth
- June 21, 2025. Production user accounts added - Real team member credentials configured with role-based access
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## Production User Accounts

The following team members have been configured with access to the system:

- **Akshat Trivedi** (akshattrivedi394@gmail.com) - System Administrator
- **Arushi Gupta** (arushigupta1818@gmail.com) - Executive/Manager  
- **Abhishek Srivastava** (abhisheksriv6387@gmail.com) - Operations Manager
- **Tanveer Hussain Khan** (tanveerhk.it@gmail.com) - Data Analyst/Forecasting Specialist
- **Arushi Gupta** (arushigupta1212@gmail.com) - Supply Chain Planner

Each user has role-specific permissions for their assigned responsibilities in the supply chain management system.