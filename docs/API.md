# SmartRetail360 API Documentation

## Overview

The SmartRetail360 API provides comprehensive endpoints for managing supply chain operations, real-time analytics, blockchain traceability, and edge computing integration.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/register
Register new user (Admin only).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "manager"
}
```

#### GET /auth/me
Get current user information.

### System Health

#### GET /system-health
Get system health metrics.

**Response:**
```json
{
  "forecastAccuracy": 87.4,
  "onTimeDelivery": 94.2,
  "carbonFootprint": 2.8,
  "inventoryTurnover": 12.3,
  "activeOrders": 1847,
  "routesOptimized": 342,
  "anomaliesDetected": 3,
  "costSavings": 284750
}
```

### Driver Management

#### GET /drivers
Get all drivers.

#### POST /drivers
Create new driver.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Driver",
  "email": "john.driver@company.com",
  "phone": "+1234567890",
  "licenseNumber": "DL123456789",
  "vehicleType": "truck",
  "experience": 5
}
```

#### PUT /drivers/:id
Update driver information.

#### DELETE /drivers/:id
Delete driver.

### Route Management

#### GET /routes
Get all routes.

#### POST /routes
Create new route.

**Request Body:**
```json
{
  "name": "Route A",
  "startLocation": "Warehouse A",
  "endLocation": "Store B",
  "driverId": 1,
  "vehicleId": "TRUCK-001",
  "estimatedDuration": 120,
  "distance": 45.5
}
```

#### PUT /routes/:id
Update route.

#### GET /routes/:id/optimized
Get optimized route with real-time traffic data.

### Inventory Management

#### GET /inventory
Get inventory levels.

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Product A",
      "sku": "SKU-001",
      "quantity": 150,
      "minThreshold": 50,
      "maxThreshold": 200,
      "location": "Warehouse A",
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Real-time Analytics

#### GET /real-time/kpi
Get real-time KPI metrics.

#### GET /real-time/robot-health
Get robot health status.

#### GET /route-analytics
Get route performance analytics.

#### GET /traffic-alerts
Get real-time traffic alerts.

### Machine Learning

#### POST /ml-predict
Get ML predictions.

**Request Body:**
```json
{
  "data": [1.2, 2.3, 3.4, 4.5, 5.6],
  "params": {
    "n_periods": 14
  }
}
```

#### POST /ml-explain
Get ML model explanations.

#### POST /ml/demand-forecast
Get demand forecasting predictions.

#### POST /ml/warehouse-vision
Get warehouse vision analysis.

#### POST /ml/route-optimization-rl
Get reinforcement learning route optimization.

#### POST /ml/sentiment-analysis
Get sentiment analysis results.

### Blockchain

#### POST /blockchain/trace
Create product trace.

#### GET /blockchain/trace/:productId
Get product traceability data.

#### POST /blockchain/green-tokens/mint
Mint green tokens.

#### POST /blockchain/green-tokens/burn
Burn green tokens.

#### GET /blockchain/green-tokens/balance/:owner
Get green token balance.

#### POST /blockchain/smart-contract
Create smart contract.

#### POST /blockchain/smart-contract/:contractId/execute
Execute smart contract.

#### GET /blockchain/authenticity/:productId
Verify product authenticity.

#### GET /blockchain/stats
Get blockchain statistics.

### Edge Computing

#### GET /edge/devices
Get all edge devices status.

#### GET /edge/devices/:deviceId
Get specific device status.

#### POST /edge/emergency-coordination
Trigger emergency coordination.

### Warehouse Management

#### GET /warehouse/tasks
Get warehouse tasks.

#### POST /warehouse/tasks
Create warehouse task.

#### PUT /warehouse/tasks/:id
Update warehouse task.

#### DELETE /warehouse/tasks/:id
Delete warehouse task.

#### GET /warehouse/sensors
Get warehouse sensor data.

#### GET /warehouse/robot-analytics
Get robot analytics.

#### GET /warehouse/layout
Get warehouse layout.

#### POST /warehouse/layout/optimize
Optimize warehouse layout.

#### GET /warehouse/3d-layout
Get 3D warehouse layout.

#### POST /warehouse/ar-paths
Get AR navigation paths.

### Sustainability

#### GET /sustainability-metrics
Get sustainability metrics.

#### GET /green-leaderboard
Get green leaderboard.

#### GET /green-score/:customerName
Get customer green score.

#### POST /carbon-offset
Create carbon offset.

#### GET /green-leaderboard/products
Get product green leaderboard.

#### GET /green-leaderboard/locations
Get location green leaderboard.

#### GET /green-leaderboard/company
Get company green leaderboard.

### Autonomous Deliveries

#### GET /autonomous-deliveries
Get autonomous delivery status.

#### POST /autonomous-deliveries/assign
Assign autonomous delivery.

### AI Recommendations

#### GET /ai-recommendations
Get AI recommendations.

#### POST /ai-action/transfer
Execute AI transfer action.

#### POST /ai-action/purchase_order
Execute AI purchase order action.

#### POST /ai-action/restock
Execute AI restock action.

#### POST /ai-recommendations/simulate
Simulate AI recommendations.

### Security

#### POST /security/encrypt
Encrypt data.

#### POST /security/decrypt
Decrypt data.

#### POST /security/2fa/setup
Setup 2FA.

#### POST /security/2fa/verify
Verify 2FA.

#### POST /security/2fa/backup
Generate 2FA backup codes.

#### POST /security/2fa/enable
Enable 2FA.

### Compliance

#### GET /gdpr/export/:userId
Export user data (GDPR).

#### DELETE /gdpr/delete/:userId
Delete user data (GDPR).

#### PUT /gdpr/rectify/:userId
Rectify user data (GDPR).

#### GET /audit-logs
Get audit logs.

### Notifications

#### POST /push-subscriptions
Subscribe to push notifications.

#### DELETE /push-subscriptions
Unsubscribe from push notifications.

#### POST /notifications/send
Send notification.

#### GET /notification-history
Get notification history.

#### PUT /notification-preferences
Update notification preferences.

### External Integrations

#### GET /erp/products
Get ERP products.

#### POST /erp/purchase-orders
Create ERP purchase order.

#### POST /erp/sync-inventory
Sync inventory with ERP.

### Geocoding

#### GET /geocode
Geocode address.

**Query Parameters:**
- `address`: Address to geocode

**Response:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "formatted_address": "New York, NY, USA"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

API requests are rate limited to:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

## WebSocket Events

### Real-time Updates

Connect to WebSocket endpoint for real-time updates:

```
ws://localhost:3001/ws
```

**Events:**
- `driver_location_update`: Driver location updates
- `order_status_change`: Order status changes
- `inventory_alert`: Inventory alerts
- `system_health_update`: System health updates
- `traffic_alert`: Traffic alerts

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
import { SmartRetailAPI } from '@smartretail360/api-client';

const api = new SmartRetailAPI({
  baseURL: 'http://localhost:3001/api',
  token: 'your-jwt-token'
});

// Get system health
const health = await api.getSystemHealth();

// Create driver
const driver = await api.createDriver({
  firstName: 'John',
  lastName: 'Driver',
  email: 'john@example.com'
});
```

### Python
```python
from smartretail360 import SmartRetailAPI

api = SmartRetailAPI(
    base_url='http://localhost:3001/api',
    token='your-jwt-token'
)

# Get system health
health = api.get_system_health()

# Create driver
driver = api.create_driver({
    'firstName': 'John',
    'lastName': 'Driver',
    'email': 'john@example.com'
})
```

## Support

For API support and questions:
- Email: api-support@smartretail360.com
- Documentation: https://docs.smartretail360.com/api
- GitHub Issues: https://github.com/smartretail360/api/issues 