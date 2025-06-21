import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { pool } from "./db";
import { startDemoDataGenerator } from "./demo-data";
import { authenticate, authorize, ROLES, type AuthenticatedRequest } from "./auth";
import { loginUserSchema, insertUserSchema, insertDriverSchema, insertRouteSchema } from "@shared/schema";

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
      res.json(metrics || {
        forecastAccuracy: 87.4,
        onTimeDelivery: 94.2,
        carbonFootprint: 2.8,
        inventoryTurnover: 12.3,
        activeOrders: 1847,
        routesOptimized: 342,
        anomaliesDetected: 3,
        costSavings: 284750
      });
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
