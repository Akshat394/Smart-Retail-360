# Sustainability Dashboard Dynamic Integration Guide

## Overview

The sustainability dashboard has been enhanced with real-time updates that respond to changes across the entire application. This guide outlines the integration points and provides case-based examples for optimal implementation.

## Integration Architecture

### 1. Primary Integration: Blockchain System (Recommended)

**Why Blockchain is Ideal:**
- Immutable record of sustainability actions
- Real-time token minting/burning affects metrics
- Transparent supply chain traceability
- Green tokens provide gamification incentives

**Integration Points:**

#### A. Green Token Minting
```typescript
// When tokens are minted for sustainable actions
POST /api/blockchain/green-tokens/mint
{
  "owner": "company",
  "amount": 100,
  "carbonOffset": 100
}

// Triggers WebSocket broadcast:
{
  "type": "blockchain_sustainability_update",
  "data": {
    "totalCarbonOffset": 1250,
    "totalGreenTokens": 990,
    "carbonProjects": 12,
    "sustainabilityScore": 78
  }
}
```

#### B. Carbon Project Verification
```typescript
// When carbon projects are verified
POST /api/blockchain/carbon-projects/:projectId/verify

// Updates sustainability metrics and broadcasts changes
```

#### C. Product Traceability
```typescript
// When products are traced through supply chain
GET /api/blockchain/trace/:productId

// Calculates carbon footprint and updates metrics
```

### 2. Secondary Integration: Order Management System

**Integration Points:**

#### A. Green Delivery Orders
```typescript
// When green delivery orders are created
POST /api/clickcollect
{
  "greenDelivery": true,
  "co2Emission": 2.1,
  "energyUsage": 5.5
}

// Triggers sustainability update:
{
  "type": "sustainability_update",
  "data": {
    "totalOrders": 1501,
    "greenOrders": 451,
    "greenDeliveryRate": "30.0"
  }
}
```

#### B. Order Status Changes
```typescript
// When order status changes affect sustainability
PUT /api/clickcollect/:id
{
  "status": "Delivered",
  "greenDelivery": true
}
```

### 3. Tertiary Integration: IoT & Robotics

**Integration Points:**

#### A. Warehouse Energy Monitoring
```typescript
// IoT sensors monitor warehouse energy usage
GET /api/iot/live

// Updates sustainability metrics when energy consumption changes
```

#### B. Robot Efficiency
```typescript
// Robot efficiency affects overall sustainability score
WebSocket: robot_health_update
{
  "type": "robot_health_update",
  "data": {
    "efficiency": 87.5,
    "energyUsage": 12.3
  }
}
```

## Case-Based Examples

### Case 1: Customer Places Green Delivery Order

**Scenario:** Customer selects green delivery option during checkout

**Integration Flow:**
1. **Order Creation** → `POST /api/clickcollect` with `greenDelivery: true`
2. **Sustainability Calculation** → System calculates CO₂ savings
3. **Green Token Minting** → Automatic token minting for sustainable choice
4. **Real-time Update** → Dashboard updates immediately via WebSocket
5. **Notification** → Success notification shows environmental impact

**Code Example:**
```typescript
// Frontend: Order creation
const createGreenOrder = async (orderData) => {
  const order = await apiService.createOrder({
    ...orderData,
    greenDelivery: true,
    co2Emission: calculateCO2(orderData.distance),
    energyUsage: calculateEnergy(orderData.weight)
  });
  
  // Sustainability dashboard automatically updates via WebSocket
  // Green tokens are minted automatically
  // Customer sees real-time impact
};
```

### Case 2: Carbon Project Verification

**Scenario:** Solar farm project gets verified on blockchain

**Integration Flow:**
1. **Project Submission** → Carbon project details submitted
2. **Verification Process** → Third-party verification
3. **Token Minting** → Large token batch minted for verified project
4. **Dashboard Update** → All sustainability metrics update in real-time
5. **Leaderboard Update** → Project owner moves up leaderboard

**Code Example:**
```typescript
// Backend: Project verification
const verifyCarbonProject = async (projectId) => {
  const project = await blockchainService.verifyProject(projectId);
  
  // Mint tokens for verified project
  await blockchainService.mintGreenTokens(
    project.owner,
    project.carbonOffset,
    project.carbonOffset
  );
  
  // Broadcast update to all connected clients
  broadcastSustainabilityUpdate();
};
```

### Case 3: Autonomous Delivery Completion

**Scenario:** Electric autonomous vehicle completes delivery

**Integration Flow:**
1. **Delivery Tracking** → Real-time location updates
2. **Completion Event** → Delivery marked as complete
3. **Efficiency Calculation** → System calculates energy efficiency
4. **Token Reward** → Tokens minted for efficient delivery
5. **Dashboard Update** → Sustainability metrics update

**Code Example:**
```typescript
// Backend: Delivery completion
const completeDelivery = async (deliveryId) => {
  const delivery = await getDelivery(deliveryId);
  
  // Calculate efficiency
  const efficiency = calculateEfficiency(delivery);
  
  // Mint tokens for efficient delivery
  if (efficiency > 85) {
    await blockchainService.mintGreenTokens(
      'company',
      Math.floor(efficiency / 10),
      delivery.carbonOffset
    );
  }
  
  // Update sustainability dashboard
  broadcastSustainabilityUpdate();
};
```

### Case 4: Supplier Sustainability Score Update

**Scenario:** Supplier improves their sustainability practices

**Integration Flow:**
1. **Score Assessment** → Third-party assessment completed
2. **Score Update** → New sustainability score recorded
3. **Impact Calculation** → System calculates supply chain impact
4. **Dashboard Update** → Supplier scorecard updates
5. **Recommendation** → AI suggests optimization opportunities

**Code Example:**
```typescript
// Backend: Supplier score update
const updateSupplierScore = async (supplierId, newScore) => {
  await updateSupplier(supplierId, { sustainabilityScore: newScore });
  
  // Recalculate overall sustainability metrics
  const metrics = await calculateSupplyChainMetrics();
  
  // Broadcast update
  clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'supplier_sustainability_update',
      data: metrics,
      timestamp: new Date().toISOString()
    }));
  });
};
```

## WebSocket Message Types

### 1. Sustainability Updates
```typescript
{
  "type": "sustainability_update",
  "data": {
    "totalOrders": 1500,
    "greenOrders": 450,
    "greenDeliveryRate": "30.0",
    "co2Saved": "1.2 tons",
    "totalCO2": "4.2 tons"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Blockchain Sustainability Updates
```typescript
{
  "type": "blockchain_sustainability_update",
  "data": {
    "totalCarbonOffset": 1250,
    "totalGreenTokens": 890,
    "carbonProjects": 12,
    "sustainabilityScore": 78
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Order Updates
```typescript
{
  "type": "clickcollect_update",
  "data": {
    "id": 12345,
    "greenDelivery": true,
    "co2Emission": 2.1,
    "status": "In Transit"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Implementation Best Practices

### 1. Real-time Updates
- Use WebSocket connections for immediate updates
- Implement reconnection logic for reliability
- Show connection status to users

### 2. Data Consistency
- Ensure blockchain and order data stay synchronized
- Implement fallback mechanisms for offline scenarios
- Use optimistic updates for better UX

### 3. Performance Optimization
- Batch updates when possible
- Use debouncing for frequent updates
- Implement efficient data structures

### 4. User Experience
- Show loading states during updates
- Provide clear feedback for sustainability actions
- Use animations for metric changes

## Testing Scenarios

### 1. Green Order Creation
```typescript
// Test creating a green delivery order
const testGreenOrder = async () => {
  const order = await createOrder({
    productName: "Organic Vegetables",
    greenDelivery: true,
    customerName: "Test Customer"
  });
  
  // Verify sustainability dashboard updates
  await waitFor(() => {
    expect(screen.getByText("31.0%")).toBeInTheDocument();
  });
};
```

### 2. Token Minting
```typescript
// Test minting green tokens
const testTokenMinting = async () => {
  await mintTokens("company", 100, 100);
  
  // Verify blockchain metrics update
  await waitFor(() => {
    expect(screen.getByText("1350kg")).toBeInTheDocument();
  });
};
```

### 3. Carbon Project Verification
```typescript
// Test carbon project verification
const testProjectVerification = async () => {
  await verifyProject("project-123");
  
  // Verify sustainability score increases
  await waitFor(() => {
    expect(screen.getByText("79")).toBeInTheDocument();
  });
};
```

## Monitoring and Analytics

### 1. Key Metrics to Track
- Real-time update frequency
- WebSocket connection stability
- User engagement with sustainability features
- Token minting/burning rates

### 2. Alerting
- Set up alerts for sustainability metric anomalies
- Monitor blockchain transaction success rates
- Track order-to-sustainability conversion rates

### 3. Dashboard Analytics
- Track which integration points are most effective
- Monitor user behavior with sustainability features
- Analyze impact of real-time updates on user engagement

## Conclusion

The sustainability dashboard now provides comprehensive real-time updates through multiple integration points. The blockchain system serves as the primary integration, providing immutable records and gamification incentives. The order management system provides secondary updates, while IoT and robotics systems offer tertiary data points.

This multi-layered approach ensures that any sustainability-related action across the application immediately reflects in the dashboard, providing users with a comprehensive view of their environmental impact in real-time. 