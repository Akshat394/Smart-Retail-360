import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { pool } from "./db";
import { startDemoDataGenerator } from "./demo-data";
import { authenticate, authorize, ROLES, type AuthenticatedRequest } from "./auth";
import { loginUserSchema, insertUserSchema, insertDriverSchema, insertRouteSchema, type IndianCity } from "@shared/schema";
import { dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data';
import { SimulationEngine, type SimulationParams } from './simulationEngine';

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
  app.post('/api/simulation/run', authenticate, authorize([ROLES.ADMIN, ROLES.MANAGER, ROLES.PLANNER]), async (req, res) => {
    try {
      const simulationParams = req.body as SimulationParams;
      
      // Basic validation
      if (!simulationParams.scenario || !simulationParams.parameters) {
        return res.status(400).json({ error: 'Missing simulation scenario or parameters' });
      }

      const engine = new SimulationEngine();
      const report = await engine.run(simulationParams);
      
      res.json(report);
    } catch (error) {
      console.error('Simulation run error:', error);
      // Check if the error is an instance of Error to safely access the message property
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during simulation.';
      res.status(500).json({ error: 'Failed to run simulation', details: errorMessage });
    }
  });

  const httpServer = createServer(app);

  // WebSocket Server Setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients = new Set<WebSocket>();

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
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'data_update',
              data: payload,
              timestamp: new Date().toISOString()
            }));
          }
        });
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
