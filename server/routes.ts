import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { pool } from "./db";
import { startDemoDataGenerator } from "./demo-data";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  app.get('/api/system-health', async (req, res) => {
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

  app.get('/api/inventory', async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getRecentEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.post('/api/metrics', async (req, res) => {
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
