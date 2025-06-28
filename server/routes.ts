import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { pool } from "./db";
import { startDemoDataGenerator } from "./demo-data";
import { authenticate, authorize, ROLES, type AuthenticatedRequest } from "./auth";
import { loginUserSchema, insertUserSchema, insertDriverSchema, insertRouteSchema, type IndianCity, type SimulationParams, insertSupplierSchema, insertClickCollectOrderSchema, clickCollectOrders, inventory as inventoryTable } from "@shared/schema";
import { dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data';
import { runSimulation } from './simulationEngine';
import { detectMetricAnomalies } from './anomalyDetection';
import { getMLPrediction, getMLExplanation } from './mlService';
import { optimizeRoute } from './services/routeOptimizer';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import fetch from 'node-fetch';

// Helper: city-based alert type inference
function inferCityAlertType(city: string | undefined) {
  if (!city) return 'traffic_jam';
  const cityName = city.toLowerCase();
  if (["mumbai", "chennai", "kolkata"].includes(cityName)) {
    // Monsoon/flood prone
    if (Math.random() < 0.4) return 'flood';
    if (Math.random() < 0.7) return 'weather';
  }
  if (["bangalore", "hyderabad", "pune"].includes(cityName)) {
    if (Math.random() < 0.5) return 'construction';
  }
  if (["delhi", "new delhi", "ghaziabad"].includes(cityName)) {
    if (Math.random() < 0.5) return 'fog';
  }
  if (["kolkata", "jaipur", "lucknow"].includes(cityName)) {
    if (Math.random() < 0.3) return 'event';
  }
  if (["mumbai", "bangalore", "delhi", "chennai", "hyderabad"].includes(cityName)) {
    if (Math.random() < 0.6) return 'traffic_jam';
  }
  // Default
  return Math.random() < 0.2 ? 'police' : 'traffic_jam';
}

// Move these to module scope
function randomRobot() {
  const robots = ['R1', 'R2', 'R3'];
  return robots[Math.floor(Math.random() * robots.length)];
}

function randomStatus() {
  return Math.random() < 0.95 ? 'Completed' : 'Failed';
}

// Ensure db and clients are defined at module scope for use in AI Action endpoints
const clients = new Set<WebSocket>();

// In-memory demo recommendations for simulation
let demoRecommendations: any[] = [];
let demoTimeout: NodeJS.Timeout | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Public authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginUserSchema.parse(req.body);
      const result = await storage.authenticateUser(credentials);
      
      if (!result) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { user, sessionToken } = result;
      const { password, ...safeUser } = user;
      
      res.json({ 
        user: safeUser, 
        token: sessionToken,
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/register', authenticate, authorize([ROLES.ADMIN]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...safeUser } = user;
      
      res.status(201).json({ 
        user: safeUser,
        message: 'User created successfully' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res) => {
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });

  // Protected API Routes
  app.get('/api/system-health', authenticate, async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics();
      if (metrics) {
        res.json(metrics);
      } else {
        res.json({
          forecastAccuracy: 87.4,
          onTimeDelivery: 94.2,
          carbonFootprint: 2.8,
          inventoryTurnover: 12.3,
          activeOrders: 1847,
          routesOptimized: 342,
          anomaliesDetected: 3,
          costSavings: 284750
        });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  });

  // Driver management routes
  app.get('/api/drivers', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  });

  app.post('/api/drivers', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(driverData);
      res.status(201).json(driver);
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(400).json({ error: 'Failed to create driver' });
    }
  });

  app.put('/api/drivers/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const driver = await storage.updateDriver(id, updates);
      
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      // Broadcast location update if location is present
      if (updates.location) {
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'vehicle_location_update',
              data: {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                vehicleId: driver.vehicleId,
                location: driver.location,
                status: driver.status
              },
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
      res.json(driver);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update driver' });
    }
  });

  app.delete('/api/drivers/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDriver(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      
      res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete driver' });
    }
  });

  // Route management routes
  app.get('/api/routes', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      const routes = await storage.getAllRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  });

  app.post('/api/routes', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const routeData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      console.error('Create route error:', error);
      res.status(400).json({ error: 'Failed to create route' });
    }
  });

  app.put('/api/routes/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const route = await storage.updateRoute(id, updates);
      
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      res.json(route);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update route' });
    }
  });

  app.get('/api/inventory', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  app.get('/api/events', authenticate, async (req, res) => {
    try {
      const events = await storage.getRecentEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.post('/api/metrics', authenticate, authorize([ROLES.ADMIN, ROLES.ANALYST]), async (req, res) => {
    try {
      const metrics = await storage.insertMetrics(req.body);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to insert metrics' });
    }
  });

  // Vehicle location endpoint for real-time map
  app.get('/api/vehicles/locations', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      // Only return id, name, email, vehicleId, and location
      const vehicles = drivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        email: driver.email,
        vehicleId: driver.vehicleId,
        location: driver.location,
        status: driver.status
      }));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vehicle locations' });
    }
  });

  // Route optimization endpoint (mock/demo)
  app.get('/api/routes/:id/optimized', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    const { id } = req.params;
    // Find the route by routeId
    const allRoutes = await storage.getAllRoutes();
    const route = allRoutes.find(r => r.routeId === id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    // Use Dijkstra to find the shortest path from New Delhi to destination
    const start = 'New Delhi';
    const end = route.destination;
    const dijkstra = dijkstraShortestPath(INDIAN_CITY_GRAPH, start, end);
    // Map city names to coordinates
    const cityCoordMap = Object.fromEntries([
      ...INDIAN_CITIES.map(c => [c.name, { lat: c.lat, lng: c.lng }]),
      ['New Delhi', { lat: 28.6139, lng: 77.2090 }]
    ]);
    const polyline = dijkstra.path.map(city => cityCoordMap[city]);
    // Carbon emission: 0.02 kg/km * distance (example factor)
    const carbonEmission = +(dijkstra.distance * 0.02).toFixed(2);
    // Get real traffic alerts
    let affectedAlerts: string[] = [];
    try {
      const alertsRes = await storage.getAllDrivers ? await fetch('http://localhost:5000/api/traffic-alerts', { headers: { 'Authorization': req.headers['authorization'] as string } }) : null;
      const alerts = alertsRes && alertsRes.ok ? await alertsRes.json() : [];
      // Check if any alert location is close to any polyline point (within ~10km)
      for (const alert of alerts) {
        if (polyline.some(p => Math.abs(p.lat - alert.location.lat) < 0.1 && Math.abs(p.lng - alert.location.lng) < 0.1)) {
          affectedAlerts.push(alert.id);
        }
      }
    } catch (e) {
      affectedAlerts = ['ALT-001', 'ALT-003']; // fallback demo
    }
    res.json({ routeId: id, polyline, affectedAlerts, shortestDistance: dijkstra.distance, carbonEmission });
  });

  // Route Analytics endpoint
  app.get('/api/route-analytics', authenticate, async (req, res) => {
    try {
      // Get all routes completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allRoutes = await storage.getAllRoutes();
      const completedRoutes = allRoutes.filter(r => r.status === 'completed' && r.updatedAt && new Date(r.updatedAt) >= today);
      const totalRoutes = allRoutes.length;
      const completedCount = completedRoutes.length;
      // Average optimization (as %)
      const avgOptimization = allRoutes.length > 0 ? (allRoutes.reduce((sum, r) => sum + (r.optimizationSavings || 0), 0) / allRoutes.length) * 100 : 0;
      // Fuel saved (sum of optimizationSavings * fuelCost)
      const fuelSaved = allRoutes.reduce((sum, r) => sum + ((r.fuelCost || 0) * (r.optimizationSavings || 0)), 0);
      // CO2 reduced (sum of optimizationSavings * co2Emission)
      const co2Reduced = allRoutes.reduce((sum, r) => sum + ((r.co2Emission || 0) * (r.optimizationSavings || 0)), 0);
      // Time saved (sum of optimizationSavings * estimatedTime)
      const timeSaved = allRoutes.reduce((sum, r) => sum + ((r.estimatedTime || 0) * (r.optimizationSavings || 0)), 0) / 60; // hours
      res.json({
        routesCompleted: `${completedCount}/${totalRoutes}`,
        avgOptimization: `${avgOptimization.toFixed(2)}%`,
        fuelSaved: `₹${fuelSaved.toFixed(2)}`,
        co2Reduced: `${co2Reduced.toFixed(2)} kg`,
        timeSaved: `${timeSaved.toFixed(2)} hours`
      });
    } catch (error) {
      // Fallback demo values
      res.json({
        routesCompleted: '23/28',
        avgOptimization: '22%',
        fuelSaved: '₹184.50',
        co2Reduced: '89.2 kg',
        timeSaved: '4.2 hours'
      });
    }
  });

  // Traffic Alerts endpoint
  app.get('/api/traffic-alerts', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      // Get all active routes and drivers
      const allRoutes = await storage.getAllRoutes();
      const allDrivers = await storage.getAllDrivers();
      const alerts = [];
      const now = new Date();

      // Route-based alerts
      for (const route of allRoutes) {
        if (route.status === 'active' && route.estimatedTime && route.updatedAt) {
          const updated = new Date(route.updatedAt);
          // If route has been active longer than estimated time, trigger delay alert
          if ((now.getTime() - updated.getTime()) / 60000 > route.estimatedTime) {
            // Infer alert type by city
            const alertType = inferCityAlertType(route.destination);
            let impact = 'Delay';
            let delay = `${((now.getTime() - updated.getTime()) / 60000 - route.estimatedTime).toFixed(1)} min`;
            if (alertType === 'flood') { impact = 'Flooded road'; delay = '30+ min'; }
            if (alertType === 'weather') { impact = 'Heavy rain'; delay = '20+ min'; }
            if (alertType === 'fog') { impact = 'Low visibility'; delay = '10+ min'; }
            if (alertType === 'event') { impact = 'Event/Parade'; delay = '15+ min'; }
            if (alertType === 'construction') { impact = 'Roadwork'; delay = '15+ min'; }
            if (alertType === 'traffic_jam') { impact = 'Heavy traffic'; delay = '10+ min'; }
            if (alertType === 'police') { impact = 'Police checkpoint'; delay = '5+ min'; }
            alerts.push({
              id: `delay-${route.routeId}`,
              type: alertType,
              location: route.coordinates,
              impact,
              delay,
              affectedRoutes: [route.routeId]
            });
          }
        }
      }
      // Driver-based alerts
      for (const driver of allDrivers) {
        if (driver.status !== 'available' && driver.status !== 'assigned' && driver.location) {
          // Infer alert type by city (if possible)
          let city = null;
          // Try to find the city name by matching coordinates (roughly)
          for (const c of INDIAN_CITIES) {
            if (Math.abs(c.lat - driver.location.lat) < 0.2 && Math.abs(c.lng - driver.location.lng) < 0.2) {
              city = c.name;
              break;
            }
          }
          const alertType = city ? inferCityAlertType(city) : 'breakdown';
          let impact = 'Driver anomaly';
          let delay = 'N/A';
          if (alertType === 'breakdown') { impact = 'Vehicle breakdown'; delay = 'Unknown'; }
          if (alertType === 'flood') { impact = 'Flooded road'; delay = '30+ min'; }
          if (alertType === 'weather') { impact = 'Severe weather'; delay = '20+ min'; }
          if (alertType === 'fog') { impact = 'Low visibility'; delay = '10+ min'; }
          if (alertType === 'event') { impact = 'Event/Parade'; delay = '15+ min'; }
          if (alertType === 'construction') { impact = 'Roadwork'; delay = '15+ min'; }
          if (alertType === 'traffic_jam') { impact = 'Heavy traffic'; delay = '10+ min'; }
          if (alertType === 'police') { impact = 'Police checkpoint'; delay = '5+ min'; }
          alerts.push({
            id: `anomaly-${driver.id}`,
            type: alertType,
            location: driver.location,
            impact,
            delay,
            affectedRoutes: allRoutes.filter(r => r.driverId === driver.id).map(r => r.routeId)
          });
        }
      }
      // Fallback: If no real alerts, return a demo alert
      if (alerts.length === 0) {
        alerts.push({
          id: 'demo-traffic-1',
          type: 'construction',
          location: { lat: 28.6304, lng: 77.2177 },
          impact: 'Roadwork',
          delay: '15 min',
          affectedRoutes: allRoutes.length > 0 ? [allRoutes[0].routeId] : []
        });
      }
      res.json(alerts);
    } catch (error) {
      // Fallback demo alert
      res.json([
        {
          id: 'demo-traffic-1',
          type: 'construction',
          location: { lat: 28.6304, lng: 77.2177 },
          impact: 'Roadwork',
          delay: '15 min',
          affectedRoutes: []
        }
      ]);
    }
  });

  // Digital Twin Simulation Endpoint
  app.post('/api/simulation/run', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.PLANNER]), async (req, res) => {
    try {
      // Basic validation
      const params: SimulationParams = req.body as SimulationParams;
      if (!params || !params.scenario || !params.parameters) {
        return res.status(400).json({ error: 'Invalid simulation parameters' });
      }
      
      const report = await runSimulation(params);

      res.json(report);
    } catch (error) {
      console.error('Simulation run error:', error);
      res.status(500).json({ error: 'Failed to run simulation', details: (error as Error).message });
    }
  });

  // Supplier management routes
  app.get('/api/suppliers', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  });

  app.get('/api/suppliers/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS, ROLES.PLANNER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  });

  app.post('/api/suppliers', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create supplier' });
    }
  });

  app.put('/api/suppliers/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const supplier = await storage.updateSupplier(id, updates);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update supplier' });
    }
  });

  app.delete('/api/suppliers/:id', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSupplier(id);
      if (!success) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  });

  // Anomaly detection endpoint
  app.get('/api/anomalies', async (req, res) => {
    try {
      const metrics = await storage.getRecentMetrics?.(20) || [];
      const anomalies = detectMetricAnomalies(metrics);
      res.json(anomalies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  });

  // ML Prediction endpoint
  app.post('/api/ml-predict', async (req, res) => {
    try {
      const { data, params } = req.body;
      const result = await getMLPrediction(data, params);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'ML service error' });
    }
  });

  // ML Explanation endpoint
  app.post('/api/ml-explain', async (req, res) => {
    try {
      const { data, params } = req.body;
      const result = await getMLExplanation(data, params);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'ML explanation service error' });
    }
  });

  app.post('/api/route-optimize', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONS]), async (req, res) => {
    try {
      const { stops } = req.body; // Array of addresses or lat/lng
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Maps API key not set" });
      const result = await optimizeRoute(stops, apiKey);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Route optimization failed", details: (error as Error).message });
    }
  });

  // Click-and-Collect Orders API
  app.post('/api/clickcollect', authenticate, async (req, res) => {
    try {
      const orderData = insertClickCollectOrderSchema.parse(req.body);
      // Find all inventory for this product with available stock
      const allInventory = await storage.getAllInventory();
      const candidates = allInventory.filter(inv => inv.productName === orderData.productName && inv.quantity >= orderData.quantity);
      if (candidates.length === 0) {
        return res.status(400).json({ error: 'No location has enough stock for this product.' });
      }
      // For demo: pick the first candidate (could use proximity logic if lat/lng available)
      const chosen = candidates[0];
      // Reduce inventory
      await storage.insertInventory({
        productName: chosen.productName,
        quantity: chosen.quantity - orderData.quantity,
        location: chosen.location,
      });
      // Create order
      const newOrder = await storage.createClickCollectOrder({
        ...orderData,
        productId: chosen.id,
        location: chosen.location,
        status: 'Pending',
        channel: orderData.channel || 'online',
        greenDelivery: orderData.greenDelivery || false
      });
      // Broadcast to WebSocket clients
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'clickcollect_update',
            data: newOrder,
            timestamp: new Date().toISOString()
          }));
        }
      });
      res.status(201).json(newOrder);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create click-and-collect order' });
    }
  });

  app.get('/api/clickcollect', authenticate, async (req, res) => {
    try {
      const { channel } = req.query;
      const orders = await storage.getAllClickCollectOrders(typeof channel === 'string' ? channel : undefined);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch click-and-collect orders' });
    }
  });

  app.put('/api/clickcollect/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedOrder = await storage.updateClickCollectOrder(id, updates);
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      // Broadcast to WebSocket clients
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'clickcollect_update',
            data: updatedOrder,
            timestamp: new Date().toISOString()
          }));
        }
      });
      // Trigger notification on status change
      if (updates.status && updatedOrder.customerName) {
        let message = '';
        let type = '';
        if (updates.status === 'Ready') {
          message = `Your order for ${updatedOrder.productName} is ready for pickup!`;
          type = 'OrderReady';
        } else if (updates.status === 'PickedUp') {
          message = `Your order for ${updatedOrder.productName} has been picked up.`;
          type = 'OrderPickedUp';
        } else if (updates.status === 'Cancelled') {
          message = `Your order for ${updatedOrder.productName} was cancelled.`;
          type = 'OrderCancelled';
        }
        if (message && type) {
          await storage.createNotification({
            orderId: updatedOrder.id,
            customerName: updatedOrder.customerName,
            message,
            type,
            read: false
          });
        }
      }
      res.json(updatedOrder);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update click-and-collect order' });
    }
  });

  // --- Warehouse Automation API ---
  let warehouseSensors = {
    temperature: 22 + Math.random() * 3, // Celsius
    humidity: 40 + Math.random() * 10, // %
    robots: [
      { id: 'R1', status: 'Idle', health: 100, maintenanceDue: false, uptime: 0 },
      { id: 'R2', status: 'Idle', health: 100, maintenanceDue: false, uptime: 0 },
      { id: 'R3', status: 'Idle', health: 100, maintenanceDue: false, uptime: 0 }
    ],
    lastUpdate: new Date().toISOString()
  };

  app.get('/api/warehouse/tasks', authenticate, async (req, res) => {
    try {
      const tasks = await storage.getAllWarehouseTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch warehouse tasks' });
    }
  });

  app.post('/api/warehouse/tasks', authenticate, async (req, res) => {
    try {
      const task = await storage.createWarehouseTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create warehouse task' });
    }
  });

  app.put('/api/warehouse/tasks/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateWarehouseTask(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update warehouse task' });
    }
  });

  app.delete('/api/warehouse/tasks/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteWarehouseTask(id);
      if (!ok) return res.status(404).json({ error: 'Task not found' });
      res.json({ message: 'Task deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete warehouse task' });
    }
  });

  app.get('/api/warehouse/sensors', authenticate, async (req, res) => {
    res.json(warehouseSensors);
  });

  app.get('/api/warehouse/robot-analytics', authenticate, async (req, res) => {
    // Simulate analytics
    const robots = warehouseSensors.robots;
    const avgUptime = (robots.reduce((sum, r) => sum + r.uptime, 0) / robots.length).toFixed(1);
    const maintenance = robots.filter(r => r.maintenanceDue).map(r => r.id);
    const bottleneck = Math.random() < 0.2 ? 'Zone B' : null;
    res.json({
      avgUptime,
      maintenanceDue: maintenance,
      bottleneck,
      robotHealth: robots.map(r => ({ id: r.id, health: r.health, maintenanceDue: r.maintenanceDue }))
    });
  });

  // --- Warehouse Automation Simulation Loop ---
  setInterval(async () => {
    // 1. Advance warehouse tasks
    const tasks = await storage.getAllWarehouseTasks();
    for (const task of tasks) {
      if (task.status === 'Pending') {
        // Start task
        await storage.updateWarehouseTask(task.id, {
          status: 'InProgress',
          assignedRobot: randomRobot(),
          startedAt: new Date()
        });
      } else if (task.status === 'InProgress') {
        // 50% chance to complete each cycle
        if (Math.random() < 0.5) {
          await storage.updateWarehouseTask(task.id, {
            status: randomStatus(),
            completedAt: new Date()
          });
        }
      }
    }
    // 2. Update sensors
    warehouseSensors.temperature += (Math.random() - 0.5) * 0.5;
    warehouseSensors.humidity += (Math.random() - 0.5) * 1.5;
    warehouseSensors.temperature = Math.max(18, Math.min(warehouseSensors.temperature, 30));
    warehouseSensors.humidity = Math.max(30, Math.min(warehouseSensors.humidity, 70));
    warehouseSensors.robots.forEach(r => {
      // Simulate robot activity, health, and maintenance
      r.status = Math.random() < 0.7 ? 'Idle' : 'Active';
      r.uptime += r.status === 'Active' ? 1 : 0;
      if (Math.random() < 0.05) r.health -= Math.floor(Math.random() * 5);
      if (r.health < 70 && !r.maintenanceDue) r.maintenanceDue = true;
      if (r.health < 40) r.status = 'Needs Maintenance';
      if (r.health < 0) r.health = 0;
      if (r.maintenanceDue && Math.random() < 0.1) { r.health = 100; r.maintenanceDue = false; }
    });
    warehouseSensors.lastUpdate = new Date().toISOString();
    // 3. Broadcast updates
    const updatedTasks = await storage.getAllWarehouseTasks();
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'warehouse_update',
          data: { tasks: updatedTasks, sensors: warehouseSensors },
          timestamp: new Date().toISOString()
        }));
        // Broadcast robot health
        client.send(JSON.stringify({
          type: 'robot_health_update',
          data: warehouseSensors.robots,
          timestamp: new Date().toISOString()
        }));
      }
    });
    // 4. Trigger alerts for anomalies
    if (warehouseSensors.temperature > 28 || warehouseSensors.temperature < 19) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'warehouse_alert',
            data: { message: `Temperature anomaly: ${warehouseSensors.temperature.toFixed(1)}°C` },
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
    if (warehouseSensors.humidity > 65 || warehouseSensors.humidity < 35) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'warehouse_alert',
            data: { message: `Humidity anomaly: ${warehouseSensors.humidity.toFixed(1)}%` },
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
  }, 7000);

  // --- Warehouse Layout Optimization API ---
  let warehouseLayout = [
    { zone: 'A', products: ['Laptop', 'Smartphone'], capacity: 100 },
    { zone: 'B', products: ['T-Shirt', 'Desk Chair'], capacity: 80 },
    { zone: 'C', products: ['Apples'], capacity: 120 },
    { zone: 'D', products: [], capacity: 60 }
  ];

  app.get('/api/warehouse/layout', authenticate, async (req, res) => {
    res.json(warehouseLayout);
  });

  app.post('/api/warehouse/layout/optimize', authenticate, async (req, res) => {
    // Mock optimization: shuffle products for better balance
    const allProducts = warehouseLayout.flatMap(z => z.products);
    const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
    const newLayout = warehouseLayout.map((zone, i) => ({
      ...zone,
      products: shuffled.slice(i * 2, (i + 1) * 2)
    }));
    res.json({ before: warehouseLayout, after: newLayout });
    warehouseLayout = newLayout;
  });

  // --- Delivery Modes API ---
  app.get('/api/delivery-modes', authenticate, async (req, res) => {
    res.json([
      { mode: 'truck', label: 'Truck', speed: 60, costPerKm: 0.15, co2PerKm: 180 },
      { mode: 'mini_truck', label: 'Mini Truck', speed: 50, costPerKm: 0.12, co2PerKm: 120 },
      { mode: 'autonomous_vehicle', label: 'Autonomous Vehicle', speed: 75, costPerKm: 0.10, co2PerKm: 100 },
      { mode: 'drone', label: 'Drone', speed: 120, costPerKm: 0.30, co2PerKm: 30, maxDistance: 30, maxPayload: 5 }
    ]);
  });

  // --- Micro-Fulfillment Centers API ---
  app.get('/api/mfc', authenticate, async (req, res) => {
    try {
      const centers = await storage.getAllMicroFulfillmentCenters();
      res.json(centers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch micro-fulfillment centers' });
    }
  });

  app.post('/api/mfc', authenticate, async (req, res) => {
    try {
      const center = await storage.createMicroFulfillmentCenter(req.body);
      res.status(201).json(center);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create micro-fulfillment center' });
    }
  });

  app.put('/api/mfc/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateMicroFulfillmentCenter(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Center not found' });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update micro-fulfillment center' });
    }
  });

  app.delete('/api/mfc/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteMicroFulfillmentCenter(id);
      if (!ok) return res.status(404).json({ error: 'Center not found' });
      res.json({ message: 'Center deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete micro-fulfillment center' });
    }
  });

  // Route order to nearest center with stock
  app.post('/api/mfc/route-order', authenticate, async (req, res) => {
    try {
      const { productName, quantity, lat, lng } = req.body;
      const centers = await storage.getAllMicroFulfillmentCenters();
      // Filter centers with enough stock
      const candidates = centers.filter(c => c.stock && c.stock[productName] >= quantity);
      if (candidates.length === 0) {
        return res.status(400).json({ error: 'No center has enough stock for this product.' });
      }
      // Find nearest center
      const getDist = (a: any, b: any) => Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
      const nearest = candidates.reduce((prev, curr) => getDist(curr, { lat, lng }) < getDist(prev, { lat, lng }) ? curr : prev);
      // Update stock
      const newStock = { ...(nearest.stock ?? {}), [productName]: (nearest.stock?.[productName] ?? 0) - quantity };
      await storage.updateMicroFulfillmentCenter(nearest.id, { stock: newStock });
      res.json({ assignedCenter: nearest, updatedStock: newStock });
    } catch (error) {
      res.status(400).json({ error: 'Failed to route order to micro-fulfillment center' });
    }
  });

  // --- Omnichannel Order Simulation (Demo Only) ---
  if (process.env.NODE_ENV === 'development') {
    const demoChannels = ['online', 'in-store', 'mobile', 'partner'];
    const demoProducts = [
      { name: 'Laptop', customer: 'Amit Kumar', contact: '9876543210' },
      { name: 'T-Shirt', customer: 'Priya Singh', contact: '9123456780' },
      { name: 'Apples', customer: 'Ravi Patel', contact: '9988776655' },
      { name: 'Desk Chair', customer: 'Sunita Sharma', contact: '9001122334' },
      { name: 'Smartphone', customer: 'Vikram Rao', contact: '9112233445' }
    ];
    setInterval(async () => {
      try {
        // Pick a random product and channel
        const product = demoProducts[Math.floor(Math.random() * demoProducts.length)];
        const channel = demoChannels[Math.floor(Math.random() * demoChannels.length)];
        // Find inventory for this product
        const allInventory = await storage.getAllInventory();
        const candidates = allInventory.filter(inv => inv.productName === product.name && inv.quantity > 0);
        if (candidates.length === 0) return;
        const chosen = candidates[0];
        // Create a random order quantity (1-3)
        const quantity = Math.min(chosen.quantity, Math.floor(Math.random() * 3) + 1);
        // Reduce inventory
        await storage.insertInventory({
          productName: chosen.productName,
          quantity: chosen.quantity - quantity,
          location: chosen.location,
        });
        // Create order
        const newOrder = await storage.createClickCollectOrder({
          productId: chosen.id,
          productName: chosen.productName,
          quantity,
          customerName: product.customer,
          customerContact: product.contact,
          location: chosen.location,
          status: 'Pending',
          channel,
        });
        // Broadcast to WebSocket clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'clickcollect_update',
              data: newOrder,
              timestamp: new Date().toISOString()
            }));
          }
        });
      } catch (e) {
        // Ignore errors in demo loop
      }
    }, 15000); // Every 15 seconds
  }

  // --- Notification API ---
  app.post('/api/notifications', authenticate, async (req, res) => {
    try {
      const notif = await storage.createNotification(req.body);
      res.status(201).json(notif);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create notification' });
    }
  });

  app.get('/api/notifications', authenticate, async (req, res) => {
    try {
      const { customerName } = req.query;
      if (!customerName || typeof customerName !== 'string') {
        return res.status(400).json({ error: 'customerName is required' });
      }
      const notifs = await storage.getNotificationsByCustomer(customerName);
      res.json(notifs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notif = await storage.markNotificationRead(id);
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      res.json(notif);
    } catch (error) {
      res.status(400).json({ error: 'Failed to mark notification as read' });
    }
  });

  // --- Sustainability Metrics API ---
  app.get('/api/sustainability-metrics', authenticate, async (req, res) => {
    try {
      // Aggregate sustainability metrics from orders
      const orders = await storage.getAllClickCollectOrders();
      const totalOrders = orders.length;
      const greenOrders = orders.filter(o => o.greenDelivery).length;
      const co2Saved = orders.reduce((sum, o) => sum + (o.greenDelivery ? 1.2 : 0), 0); // Example: 1.2kg saved per green delivery
      res.json({
        totalOrders,
        greenOrders,
        co2Saved: co2Saved.toFixed(2),
        greenDeliveryRate: totalOrders > 0 ? ((greenOrders / totalOrders) * 100).toFixed(1) : '0.0'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sustainability metrics' });
    }
  });

  // --- Advanced Sustainability Analytics Endpoints ---
  app.get('/api/green-leaderboard', authenticate, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      // Sort by greenScore descending, return top 10
      const leaderboard = customers.sort((a, b) => b.greenScore - a.greenScore).slice(0, 10);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch green leaderboard' });
    }
  });

  app.get('/api/green-score/:customerName', authenticate, async (req, res) => {
    try {
      const { customerName } = req.params;
      const customer = await storage.getCustomerByName(customerName);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json({ greenScore: customer.greenScore });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch green score' });
    }
  });

  app.post('/api/carbon-offset', authenticate, async (req, res) => {
    try {
      const { customerName, amount } = req.body;
      const customer = await storage.getCustomerByName(customerName);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      // Simulate: increment greenScore by amount
      const updated = await storage.updateCustomer(customer.id, { greenScore: customer.greenScore + (amount || 1) });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform carbon offset' });
    }
  });

  // --- Hyper-Local Fulfillment: Autonomous/Drone Delivery Simulation ---
  /**
   * @typedef {Object} AutonomousDelivery
   * @property {number} id
   * @property {number} orderId
   * @property {string} mode
   * @property {string} status
   * @property {{lat: number, lng: number}} start
   * @property {{lat: number, lng: number}} end
   * @property {{lat: number, lng: number}} current
   * @property {number} eta
   * @property {number} co2
   * @property {number} speed
   * @property {number} cost
   * @property {string} assignedAt
   * @property {string} updatedAt
   */
  /** @type {Array<{
   * id: number;
   * orderId: number;
   * mode: string;
   * status: string;
   * start: { lat: number; lng: number };
   * end: { lat: number; lng: number };
   * current: { lat: number; lng: number };
   * eta: number;
   * co2: number;
   * speed: number;
   * cost: number;
   * assignedAt: string;
   * updatedAt: string;
   * }>} */
  let autonomousDeliveries: Array<{
    id: number;
    orderId: number;
    mode: string;
    status: string;
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    current: { lat: number; lng: number };
    eta: number;
    co2: number;
    speed: number;
    cost: number;
    assignedAt: string;
    updatedAt: string;
  }> = [];
  let deliveryIdCounter = 1;

  app.get('/api/autonomous-deliveries', authenticate, async (req, res) => {
    res.json(autonomousDeliveries);
  });

  app.post('/api/autonomous-deliveries/assign', authenticate, async (req, res) => {
    try {
      let { orderId, mode } = req.body; // mode: 'drone' | 'autonomous_vehicle' | 'mini_truck' | 'truck'
      const validModes = ['drone', 'autonomous_vehicle', 'mini_truck', 'truck'];
      if (!orderId) {
        return res.status(400).json({ error: 'Invalid orderId' });
      }
      if (!mode || !validModes.includes(mode)) {
        // Randomize mode if not provided or invalid
        mode = validModes[Math.floor(Math.random() * validModes.length)];
      }
      // Find the order
      const order = await storage.getClickCollectOrder(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      // Simulate delivery assignment
      const start = { lat: 28.6139, lng: 77.2090 }; // New Delhi (demo)
      const end = { lat: 28.7041 + Math.random() * 0.1, lng: 77.1025 + Math.random() * 0.1 }; // Random near Delhi
      const distance = Math.sqrt((start.lat - end.lat) ** 2 + (start.lng - end.lng) ** 2) * 111; // rough km
      let speed, cost, co2;
      if (mode === 'drone') {
        speed = 120;
        cost = +(distance * 0.3).toFixed(2);
        co2 = +(distance * 0.03).toFixed(2);
      } else if (mode === 'autonomous_vehicle') {
        speed = 75;
        cost = +(distance * 0.1).toFixed(2);
        co2 = +(distance * 0.1).toFixed(2);
      } else if (mode === 'mini_truck') {
        speed = 50;
        cost = +(distance * 0.12).toFixed(2);
        co2 = +(distance * 0.12).toFixed(2);
      } else {
        speed = 60;
        cost = +(distance * 0.15).toFixed(2);
        co2 = +(distance * 0.18).toFixed(2);
      }
      const eta = Math.round((distance / speed) * 60); // minutes
      const delivery = {
        id: deliveryIdCounter++,
        orderId,
        mode,
        status: 'En Route',
        start,
        end,
        current: { ...start },
        eta,
        co2,
        speed,
        cost,
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      autonomousDeliveries.push(delivery);
      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1 + Math.random() * 0.2;
        if (progress >= 1) progress = 1;
        delivery.current.lat = start.lat + (end.lat - start.lat) * progress;
        delivery.current.lng = start.lng + (end.lng - start.lng) * progress;
        delivery.eta = Math.max(0, Math.round(eta * (1 - progress)));
        delivery.updatedAt = new Date().toISOString();
        if (progress >= 1) {
          delivery.status = 'Delivered';
          clearInterval(interval);
          setTimeout(() => {
            autonomousDeliveries = (autonomousDeliveries.filter(d => d.id !== delivery.id) as typeof autonomousDeliveries);
          }, 5000);
        }
        // Broadcast update
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'autonomous_delivery_update',
              data: delivery,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }, 2000);
      res.status(201).json(delivery);
    } catch (error) {
      res.status(400).json({ error: 'Failed to assign autonomous delivery' });
    }
  });

  // --- Advanced Sustainability Analytics: Company-Wide Leaderboard ---
  app.get('/api/green-leaderboard/products', authenticate, async (req, res) => {
    try {
      const orders = await storage.getAllClickCollectOrders();
      // Aggregate green deliveries by product
      const productMap = new Map();
      for (const o of orders) {
        if (o.greenDelivery) {
          productMap.set(o.productName, (productMap.get(o.productName) || 0) + 1);
        }
      }
      const leaderboard = Array.from(productMap.entries())
        .map(([product, count]) => ({ product, greenDeliveries: count }))
        .sort((a, b) => b.greenDeliveries - a.greenDeliveries)
        .slice(0, 10);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch product green leaderboard' });
    }
  });

  app.get('/api/green-leaderboard/locations', authenticate, async (req, res) => {
    try {
      const orders = await storage.getAllClickCollectOrders();
      // Aggregate green deliveries by location
      const locationMap = new Map();
      for (const o of orders) {
        if (o.greenDelivery) {
          locationMap.set(o.location, (locationMap.get(o.location) || 0) + 1);
        }
      }
      const leaderboard = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, greenDeliveries: count }))
        .sort((a, b) => b.greenDeliveries - a.greenDeliveries)
        .slice(0, 10);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch location green leaderboard' });
    }
  });

  app.get('/api/green-leaderboard/company', authenticate, async (req, res) => {
    try {
      const orders = await storage.getAllClickCollectOrders();
      const customers = await storage.getAllCustomers();
      // Company-wide metrics
      const totalOrders = orders.length;
      const greenOrders = orders.filter(o => o.greenDelivery).length;
      const co2Saved = orders.reduce((sum, o) => sum + (o.greenDelivery ? 1.2 : 0), 0);
      // Top customer
      const topCustomer = customers.sort((a, b) => b.greenScore - a.greenScore)[0];
      // Top product
      const productMap = new Map();
      for (const o of orders) {
        if (o.greenDelivery) {
          productMap.set(o.productName, (productMap.get(o.productName) || 0) + 1);
        }
      }
      const topProduct = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      // Top location
      const locationMap = new Map();
      for (const o of orders) {
        if (o.greenDelivery) {
          locationMap.set(o.location, (locationMap.get(o.location) || 0) + 1);
        }
      }
      const topLocation = Array.from(locationMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      res.json({
        totalOrders,
        greenOrders,
        co2Saved: co2Saved.toFixed(2),
        greenDeliveryRate: totalOrders > 0 ? ((greenOrders / totalOrders) * 100).toFixed(1) : '0.0',
        topCustomer: topCustomer ? { name: topCustomer.name, greenScore: topCustomer.greenScore } : null,
        topProduct,
        topLocation
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch company-wide sustainability metrics' });
    }
  });

  // AI Recommendations endpoint
  app.get('/api/ai-recommendations', async (req, res) => {
    try {
      // 1. Get recent anomalies
      const metrics = await storage.getRecentMetrics?.(20) || [];
      const anomalies = detectMetricAnomalies(metrics).map(a => ({
        type: 'anomaly',
        message: `Anomaly detected in ${a.metric}: ${a.value} (${a.reason})`,
        actions: [],
        data: a
      }));

      // 2. Get low stock inventory
      const inventory = await storage.getAllInventory?.() || [];
      const lowStock = inventory.filter(item => item.quantity < 20).map(item => ({
        type: 'low_stock',
        message: `Low stock: ${item.productName} in ${item.location} (${item.quantity} left)`,
        actions: [
          { label: 'Transfer Stock', action: 'transfer', productId: item.id, location: item.location },
          { label: 'Create Purchase Order', action: 'purchase_order', productId: item.id }
        ],
        data: item
      }));

      // 3. Simulate demand spike recommendations (use productName)
      const demandSpikes = [];
      for (const item of lowStock) {
        if (item.data.productName && item.data.productName.toLowerCase().includes('soda')) { // Example: trigger for 'Soda'
          demandSpikes.push({
            type: 'demand_spike',
            message: `Demand spike predicted for ${item.data.productName} in ${item.data.location}. Consider restocking.`,
            actions: [
              { label: 'Approve Restock', action: 'restock', productId: item.data.id, location: item.data.location }
            ],
            data: item.data
          });
        }
      }

      // Combine all recommendations (demo + live)
      const recommendations = [
        ...demoRecommendations,
        ...anomalies,
        ...lowStock,
        ...demandSpikes
      ];
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate AI recommendations' });
    }
  });

  // AI Action: Transfer Stock
  app.post('/api/ai-action/transfer', async (req, res) => {
    try {
      const { productId, location, quantity = 50 } = req.body;
      // Simulate transfer: increase quantity by 50
      await db.update(inventoryTable)
        .set({ quantity: sql`${inventoryTable.quantity} + ${quantity}` })
        .where(eq(inventoryTable.id, productId));
      res.json({ success: true, message: `Transferred ${quantity} units to ${location}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to transfer stock' });
    }
  });

  // AI Action: Create Purchase Order
  app.post('/api/ai-action/purchase_order', async (req, res) => {
    try {
      const { productId } = req.body;
      // Simulate: just log the action for now
      console.log(`Purchase order created for product ${productId}`);
      res.json({ success: true, message: 'Purchase order created' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  });

  // AI Action: Approve Restock
  app.post('/api/ai-action/restock', async (req, res) => {
    try {
      const { productId, location, quantity = 100 } = req.body;
      // Simulate restock: increase quantity by 100
      await db.update(inventoryTable)
        .set({ quantity: sql`${inventoryTable.quantity} + ${quantity}` })
        .where(eq(inventoryTable.id, productId));
      res.json({ success: true, message: `Restocked ${quantity} units at ${location}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to restock' });
    }
  });

  // In-memory demo recommendations for simulation
  let demoRecommendations: any[] = [];
  let demoTimeout: NodeJS.Timeout | null = null;

  app.post('/api/ai-recommendations/simulate', async (req, res) => {
    // Add a few demo recommendations
    demoRecommendations = [
      {
        type: 'anomaly',
        message: 'Anomaly detected: Sudden drop in on-time delivery rate in Mumbai',
        actions: [],
        data: { metric: 'onTimeDelivery', value: 72.1, reason: 'Unexpected traffic event' }
      },
      {
        type: 'low_stock',
        message: 'Low stock: Great Value Milk in Warehouse 2 (8 left)',
        actions: [
          { label: 'Transfer Stock', action: 'transfer', productId: 1, location: 'Warehouse 2' },
          { label: 'Create Purchase Order', action: 'purchase_order', productId: 1 }
        ],
        data: { id: 1, productName: 'Great Value Milk', location: 'Warehouse 2', quantity: 8 }
      },
      {
        type: 'demand_spike',
        message: "Demand spike predicted for Sam's Choice Soda in Warehouse 3. Consider restocking.",
        actions: [
          { label: 'Approve Restock', action: 'restock', productId: 2, location: 'Warehouse 3' }
        ],
        data: { id: 2, productName: "Sam's Choice Soda", location: 'Warehouse 3', quantity: 12 }
      }
    ];
    // Clear after 5 minutes
    if (demoTimeout) clearTimeout(demoTimeout);
    demoTimeout = setTimeout(() => { demoRecommendations = []; }, 5 * 60 * 1000);
    res.json({ success: true, message: 'Demo recommendations injected' });
  });

  // Geocoding endpoint for frontend
  app.get('/api/geocode', authenticate, async (req, res) => {
    try {
      let { address } = req.query;
      if (!address) return res.status(400).json({ error: 'Missing address' });
      if (Array.isArray(address)) address = address[0];
      if (typeof address !== 'string') return res.status(400).json({ error: 'Invalid address' });
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Google Maps API key not set' });
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status !== 'OK' || !data.results.length) {
        return res.status(404).json({ error: 'Address not found' });
      }
      const { lat, lng } = data.results[0].geometry.location;
      res.json({ lat, lng });
    } catch (error) {
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket Server Setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // PostgreSQL LISTEN setup for real-time notifications
  const notificationClient = await pool.connect();
  
  await notificationClient.query('LISTEN data_updates');
  
  notificationClient.on('notification', (msg) => {
    if (msg.channel === 'data_updates') {
      try {
        const payload = JSON.parse(msg.payload || '{}');
        console.log('Database notification received:', payload);
        // Broadcast to all connected WebSocket clients
        if (payload.type === 'inventory_update') {
          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'inventory_update',
                data: payload.data,
                timestamp: new Date().toISOString()
              }));
            }
          });
        } else {
          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'data_update',
                data: payload,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    }
  });

  // Start demo data generator for testing
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      startDemoDataGenerator();
    }, 2000);
  }

  return httpServer;
}
