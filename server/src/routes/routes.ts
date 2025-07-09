import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "../utils/storage";
import { pool } from "../utils/db";
import { startDemoDataGenerator, INDIAN_CITY_GRAPH, INDIAN_CITIES } from "../utils/demo-data";
import { authenticate, authorize, ROLES, type AuthenticatedRequest } from "./auth";
import { loginUserSchema, insertUserSchema, insertDriverSchema, insertRouteSchema, type IndianCity, type SimulationParams, insertSupplierSchema, insertClickCollectOrderSchema, clickCollectOrders, inventory as inventoryTable } from "@shared/schema";
import { dijkstraShortestPath } from '../utils/storage';
import { runSimulation } from '../utils/simulationEngine';
import { detectMetricAnomalies } from '../utils/anomalyDetection';
import { getMLExplanation, getMLRouteRecommendation, getMLStockOptimization } from '../utils/mlService';
import { optimizeRoute } from '../services/routeOptimizer';
import { eq, sql } from 'drizzle-orm';
import { db } from '../utils/db';
import fetch from 'node-fetch';
import { realTimeAnalytics } from '../services/realTimeAnalytics';
import { securityService } from '../services/security';
import { externalIntegrations } from '../services/externalIntegrations';
import { blockchainService } from '../../../blockchain/traceability';
import axios from 'axios';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as erpSimulator from '../../integrations/erp/simulator';
import { iotReadings } from '../../../shared/schema';
import openapiRouter from './openapi';
import { generateApiKey, validateApiKey, enforceApiKeyRateLimit, getApiKeyInfo, incrementApiKeyUsage } from '../utils/apiKeyManager';
import { updateInventory, deleteInventory } from '../utils/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOCKCHAIN_STATE_FILE = path.join(__dirname, '../../mock_blockchain_state.json');

const EDGE_API_BASE = 'http://localhost:8001';

// Edge computing API base URL for FastAPI service

// Channel definitions for omnichannel analytics
const CHANNELS = [
  { value: 'online', label: 'Online', color: '#007bff' },
  { value: 'in-store', label: 'In-Store', color: '#28a745' },
  { value: 'mobile', label: 'Mobile', color: '#ffc107' },
  { value: 'partner', label: 'Partner', color: '#6f42c1' },
];

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

// --- IN-MEMORY MOCK BLOCKCHAIN STATE ---
const mockGreenTokens = new Map(); // owner -> { balance, totalMinted, totalBurned, carbonOffset, transactions: [] }
const mockContracts: any[] = [];
const mockExecutions: any[] = [];
const mockTraces = new Map(); // productId -> [trace events]

function saveBlockchainState() {
  const state = {
    greenTokens: Array.from(mockGreenTokens.entries()),
    contracts: mockContracts,
    executions: mockExecutions,
    traces: Array.from(mockTraces.entries())
  };
  fs.writeFileSync(BLOCKCHAIN_STATE_FILE, JSON.stringify(state, null, 2));
}

function loadBlockchainState() {
  if (fs.existsSync(BLOCKCHAIN_STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(BLOCKCHAIN_STATE_FILE, 'utf-8'));
    mockGreenTokens.clear();
    for (const [owner, data] of state.greenTokens) mockGreenTokens.set(owner, data);
    mockContracts.length = 0; mockContracts.push(...state.contracts);
    mockExecutions.length = 0; mockExecutions.push(...state.executions);
    mockTraces.clear();
    for (const [pid, arr] of state.traces) mockTraces.set(pid, arr);
  }
}

// Load state on server start
loadBlockchainState();

function generateBlockHash(...args: any[]) {
  return crypto.createHash('sha256').update(args.join('-') + Date.now()).digest('hex').slice(0, 32);
}

// Utility to estimate sustainability metrics
function estimateSustainabilityMetrics(order: any) {
  // For demo: use random or simple calculations
  const distance = order.distance || 10; // fallback if not present
  const co2 = +(distance * 0.18).toFixed(2); // 0.18 kg/km
  const energy = +(co2 * 0.5).toFixed(2); // kWh
  const efficiency = +(100 - (co2 + energy) / 50 * 100).toFixed(2); // out of 100
  return { co2Emission: co2, energyUsage: energy, deliveryEfficiencyScore: efficiency };
}

// --- WebSocket Server for Inventory Updates ---
const inventoryClients = new Set<any>();
let wssInventory: any;

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
      const result = await getMLExplanation(data, params);
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

  // ML Route Recommendation endpoint
  app.post('/api/recommend/route', async (req, res) => {
    try {
      const { graph, start, end } = req.body;
      const result = await getMLRouteRecommendation(graph, start, end);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'ML route recommendation error' });
    }
  });

  // ML Stock Optimization endpoint
  app.post('/api/optimize/stock', async (req, res) => {
    try {
      const { supply, demand, cost_matrix } = req.body;
      const result = await getMLStockOptimization(supply, demand, cost_matrix);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'ML stock optimization error' });
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
      // Calculate sustainability metrics
      const sustainability = estimateSustainabilityMetrics(orderData);
      // Create order
      const newOrder = await storage.createClickCollectOrder({
        ...orderData,
        productId: chosen.id,
        location: chosen.location,
        status: 'Pending',
        channel: orderData.channel || 'online',
        greenDelivery: orderData.greenDelivery || false,
        ...sustainability
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

  // NEW: Omnichannel Analytics API
  app.get('/api/omnichannel/analytics', async (req, res) => {
    try {
      const { period = '7d', channel } = req.query;
      
      // Generate mock data for demo
      const mockOrders = generateMockOrders(period as string);
      const orders = channel ? mockOrders.filter((order: any) => order.channel === channel) : mockOrders;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const filteredOrders = orders.filter((order: any) => new Date(order.createdAt) >= startDate);
      
      // Channel performance metrics
      const channelMetrics = CHANNELS.filter(c => c.value).map(ch => {
        const channelOrders = filteredOrders.filter(order => order.channel === ch.value);
        const totalOrders = channelOrders.length;
        const completedOrders = channelOrders.filter(order => order.status === 'PickedUp').length;
        const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const totalValue = channelOrders.reduce((sum, order) => sum + (order.quantity * 100), 0);
        const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
        const carbonFootprint = channelOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0);
        
        return {
          channel: ch.value,
          label: ch.label,
          color: ch.color,
          totalOrders,
          completedOrders,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          carbonFootprint: Math.round(carbonFootprint * 100) / 100,
          greenDeliveryCount: channelOrders.filter(order => order.greenDelivery).length
        };
      });

      // Customer journey analytics
      const customerJourney = {
        totalCustomers: new Set(filteredOrders.map(order => order.customerName)).size,
        repeatCustomers: calculateRepeatCustomers(filteredOrders),
        averageOrdersPerCustomer: filteredOrders.length / new Set(filteredOrders.map(order => order.customerName)).size,
        channelSwitching: calculateChannelSwitching(filteredOrders),
        peakHours: calculatePeakHours(filteredOrders),
        topProducts: calculateTopProducts(filteredOrders),
        sustainabilityMetrics: {
          totalGreenDeliveries: filteredOrders.filter(order => order.greenDelivery).length,
          totalCarbonFootprint: filteredOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0),
          averageEfficiencyScore: calculateAverageEfficiencyScore(filteredOrders)
        }
      };

      res.json({
        period,
        channelMetrics,
        customerJourney,
        summary: {
          totalOrders: filteredOrders.length,
          totalValue: filteredOrders.reduce((sum, order) => sum + (order.quantity * 100), 0),
          averageOrderValue: filteredOrders.length > 0 ? 
            filteredOrders.reduce((sum, order) => sum + (order.quantity * 100), 0) / filteredOrders.length : 0,
          overallConversionRate: filteredOrders.length > 0 ? 
            (filteredOrders.filter(order => order.status === 'PickedUp').length / filteredOrders.length) * 100 : 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch omnichannel analytics' });
    }
  });

  // NEW: Customer Journey Tracking API
  app.get('/api/omnichannel/customer/:customerName/journey', async (req, res) => {
    try {
      const { customerName } = req.params;
      const orders = await storage.getAllClickCollectOrders();
      const customerOrders = orders.filter(order => order.customerName === customerName);
      
      if (customerOrders.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Analyze customer journey
      const journey = {
        customerName,
        totalOrders: customerOrders.length,
        firstOrder: customerOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0],
        lastOrder: customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
        preferredChannel: calculatePreferredChannel(customerOrders),
        totalSpent: customerOrders.reduce((sum, order) => sum + (order.quantity * 100), 0),
        averageOrderValue: customerOrders.reduce((sum, order) => sum + (order.quantity * 100), 0) / customerOrders.length,
        sustainabilityScore: calculateCustomerSustainabilityScore(customerOrders),
        orderHistory: customerOrders.map(order => ({
          id: order.id,
          productName: order.productName,
          quantity: order.quantity,
          channel: order.channel,
          status: order.status,
          createdAt: order.createdAt,
          greenDelivery: order.greenDelivery,
          co2Emission: order.co2Emission
        }))
      };

      res.json(journey);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customer journey' });
    }
  });

  // NEW: Channel Performance Comparison API
  app.get('/api/omnichannel/channels/performance', async (req, res) => {
    try {
      const { compare = 'conversion' } = req.query;
      const orders = generateMockOrders('30d'); // Use 30 days of mock data
      
      const channelPerformance = CHANNELS.filter(c => c.value).map(channel => {
        const channelOrders = orders.filter(order => order.channel === channel.value);
        const totalOrders = channelOrders.length;
        const completedOrders = channelOrders.filter(order => order.status === 'PickedUp').length;
        const cancelledOrders = channelOrders.filter(order => order.status === 'Cancelled').length;
        
        // Calculate processing times
        const processingTimes = channelOrders
          .filter(order => order.updatedAt)
          .map(order => {
            const created = new Date(order.createdAt).getTime();
            const updated = new Date(order.updatedAt!).getTime();
            return (updated - created) / (1000 * 60 * 60); // hours
          });
        
        const avgProcessingTime = processingTimes.length > 0 ? 
          processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

        return {
          channel: channel.value,
          label: channel.label,
          color: channel.color,
          metrics: {
            totalOrders,
            completedOrders,
            cancelledOrders,
            conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
            cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
            averageProcessingTime: Math.round(avgProcessingTime * 100) / 100,
            averageOrderValue: totalOrders > 0 ? 
              channelOrders.reduce((sum, order) => sum + (order.quantity * 100), 0) / totalOrders : 0,
            greenDeliveryRate: totalOrders > 0 ? 
              (channelOrders.filter(order => order.greenDelivery).length / totalOrders) * 100 : 0,
            carbonFootprint: channelOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0)
          }
        };
      });

      // Sort by comparison metric
      channelPerformance.sort((a, b) => {
        switch (compare) {
          case 'conversion':
            return b.metrics.conversionRate - a.metrics.conversionRate;
          case 'volume':
            return b.metrics.totalOrders - a.metrics.totalOrders;
          case 'value':
            return b.metrics.averageOrderValue - a.metrics.averageOrderValue;
          case 'sustainability':
            return b.metrics.greenDeliveryRate - a.metrics.greenDeliveryRate;
          default:
            return b.metrics.conversionRate - a.metrics.conversionRate;
        }
      });

      res.json({
        comparison: compare,
        channels: channelPerformance,
        summary: {
          bestChannel: channelPerformance[0],
          totalOrders: orders.length,
          overallConversionRate: orders.length > 0 ? 
            (orders.filter(order => order.status === 'PickedUp').length / orders.length) * 100 : 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch channel performance' });
    }
  });

  // NEW: Sustainability Report API
  app.get('/api/omnichannel/sustainability', async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      const orders = generateMockOrders(period as string);
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const filteredOrders = orders.filter(order => new Date(order.createdAt) >= startDate);
      
      const sustainabilityReport = {
        period,
        overview: {
          totalOrders: filteredOrders.length,
          greenDeliveries: filteredOrders.filter(order => order.greenDelivery).length,
          greenDeliveryRate: filteredOrders.length > 0 ? 
            (filteredOrders.filter(order => order.greenDelivery).length / filteredOrders.length) * 100 : 0,
          totalCarbonFootprint: filteredOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0),
          averageCarbonPerOrder: filteredOrders.length > 0 ? 
            filteredOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0) / filteredOrders.length : 0,
          totalEnergyUsage: filteredOrders.reduce((sum, order) => sum + (order.energyUsage || 0), 0),
          averageEfficiencyScore: calculateAverageEfficiencyScore(filteredOrders)
        },
        byChannel: CHANNELS.filter(c => c.value).map(channel => {
          const channelOrders = filteredOrders.filter(order => order.channel === channel.value);
          return {
            channel: channel.value,
            label: channel.label,
            totalOrders: channelOrders.length,
            greenDeliveries: channelOrders.filter(order => order.greenDelivery).length,
            greenDeliveryRate: channelOrders.length > 0 ? 
              (channelOrders.filter(order => order.greenDelivery).length / channelOrders.length) * 100 : 0,
            carbonFootprint: channelOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0),
            energyUsage: channelOrders.reduce((sum, order) => sum + (order.energyUsage || 0), 0)
          };
        }),
        trends: {
          dailyCarbonFootprint: calculateDailyTrends(filteredOrders, 'co2Emission'),
          dailyGreenDeliveryRate: calculateDailyTrends(filteredOrders, 'greenDelivery'),
          topSustainableProducts: calculateSustainableProducts(filteredOrders)
        },
        recommendations: generateSustainabilityRecommendations(filteredOrders)
      };

      res.json(sustainabilityReport);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sustainability report' });
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
      const totalCO2 = orders.reduce((sum, o) => sum + (o.co2Emission || 0), 0);
      const totalEnergy = orders.reduce((sum, o) => sum + (o.energyUsage || 0), 0);
      const avgEfficiency = totalOrders > 0 ? (orders.reduce((sum, o) => sum + (o.deliveryEfficiencyScore || 0), 0) / totalOrders).toFixed(2) : '0.0';
      // Breakdown by zone
      const byZone: Record<string, { co2: number; energy: number; count: number }> = {};
      for (const o of orders) {
        const zone = o.location || 'unknown';
        if (!byZone[zone]) byZone[zone] = { co2: 0, energy: 0, count: 0 };
        byZone[zone].co2 += o.co2Emission || 0;
        byZone[zone].energy += o.energyUsage || 0;
        byZone[zone].count += 1;
      }
      // Breakdown by delivery mode
      const byMode: Record<string, { co2: number; energy: number; count: number }> = {};
      for (const o of orders) {
        const mode = (o as any).deliveryMode || 'unknown';
        if (!byMode[mode]) byMode[mode] = { co2: 0, energy: 0, count: 0 };
        byMode[mode].co2 += o.co2Emission || 0;
        byMode[mode].energy += o.energyUsage || 0;
        byMode[mode].count += 1;
      }
      // Breakdown by month
      const byMonth: Record<string, { co2: number; energy: number; count: number }> = {};
      for (const o of orders) {
        const month = o.createdAt ? new Date(o.createdAt).toISOString().slice(0,7) : 'unknown';
        if (!byMonth[month]) byMonth[month] = { co2: 0, energy: 0, count: 0 };
        byMonth[month].co2 += o.co2Emission || 0;
        byMonth[month].energy += o.energyUsage || 0;
        byMonth[month].count += 1;
      }
      res.json({
        totalOrders,
        greenOrders,
        co2Saved: co2Saved.toFixed(2),
        totalCO2: totalCO2.toFixed(2),
        totalEnergy: totalEnergy.toFixed(2),
        avgEfficiency,
        byZone,
        byMode,
        byMonth,
        greenDeliveryRate: totalOrders > 0 ? ((greenOrders / totalOrders) * 100).toFixed(1) : '0.0'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sustainability metrics' });
    }
  });

  // --- Sustainability Metrics Export API ---
  app.get('/api/sustainability-metrics/export', authenticate, async (req, res) => {
    try {
      const orders = await storage.getAllClickCollectOrders();
      const rows = orders.map(o => ({
        id: o.id,
        productName: o.productName,
        quantity: o.quantity,
        location: o.location,
        deliveryMode: (o as any).deliveryMode || 'unknown',
        co2Emission: o.co2Emission,
        energyUsage: o.energyUsage,
        deliveryEfficiencyScore: o.deliveryEfficiencyScore,
        createdAt: o.createdAt,
        greenDelivery: o.greenDelivery
      }));
      const csv = [
        'id,productName,quantity,location,deliveryMode,co2Emission,energyUsage,deliveryEfficiencyScore,createdAt,greenDelivery',
        ...rows.map(r => Object.values(r).join(','))
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sustainability_metrics.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export sustainability metrics' });
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
      // Sustainability metrics
      const energy = +(co2 * 0.5).toFixed(2);
      const efficiency = +(100 - (co2 + energy) / 50 * 100).toFixed(2);
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
        energy,
        efficiency,
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

  // Enhanced Real-Time Analytics Endpoints
  app.get('/api/real-time/kpi', authenticate, async (req, res) => {
    try {
      const kpiData = await realTimeAnalytics.generateKPIMetrics();
      res.json(kpiData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch KPI data' });
    }
  });

  app.get('/api/real-time/robot-health', authenticate, async (req, res) => {
    try {
      // const robotHealth = realTimeAnalytics.getRobotHealthData(); // Removed: method does not exist
      res.json({ robotHealth: 'Robot health data not available' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch robot health data' });
    }
  });

  // Advanced ML Model Endpoints
  app.post('/api/ml/demand-forecast', authenticate, async (req, res) => {
    try {
      const { historicalData, productId } = req.body;
      const forecast = await getMLExplanation(historicalData, { model: 'transformer', productId });
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate demand forecast' });
    }
  });

  app.post('/api/ml/warehouse-vision', authenticate, async (req, res) => {
    try {
      const { imageData } = req.body;
      const analysis = await getMLExplanation(imageData, { model: 'yolo' });
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze warehouse vision' });
    }
  });

  app.post('/api/ml/route-optimization-rl', authenticate, async (req, res) => {
    try {
      const { graph, start, end } = req.body;
      const optimization = await getMLRouteRecommendation(graph, start, end);
      res.json(optimization);
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize route with RL' });
    }
  });

  app.post('/api/ml/sentiment-analysis', authenticate, async (req, res) => {
    try {
      const { feedbackText } = req.body;
      const sentiment = await getMLExplanation(feedbackText, { model: 'nlp' });
      res.json(sentiment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze sentiment' });
    }
  });

  // Blockchain Traceability Endpoints
  app.post('/api/blockchain/trace', authenticate, async (req, res) => {
    try {
      const { productId, location, supplier, batchNumber, metadata } = req.body;
      const trace = await blockchainService.createProductTrace(productId, location, supplier, batchNumber, metadata);
      res.json(trace);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create product trace' });
    }
  });

  app.get('/api/blockchain/trace/:productId', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const traces = await blockchainService.getProductTraceability(productId);
      res.json(traces);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get product traceability' });
    }
  });

  app.post('/api/blockchain/green-tokens/mint', authenticate, async (req, res) => {
    try {
      const { owner, amount, carbonOffset } = req.body;
      const token = await blockchainService.mintGreenTokens(owner, amount, carbonOffset);
      res.json(token);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mint green tokens' });
    }
  });

  app.post('/api/blockchain/green-tokens/burn', authenticate, async (req, res) => {
    try {
      const { owner, amount } = req.body;
      const success = await blockchainService.burnGreenTokens(owner, amount);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to burn green tokens' });
    }
  });

  app.get('/api/blockchain/green-tokens/balance/:owner', authenticate, async (req, res) => {
    try {
      const { owner } = req.params;
      const balance = await blockchainService.getGreenTokenBalance(owner);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get green token balance' });
    }
  });

  app.post('/api/blockchain/smart-contract', authenticate, async (req, res) => {
    try {
      const { supplierId, productId, amount, conditions } = req.body;
      const blockHash = generateBlockHash(supplierId, productId, amount, 'contract');
      const contract = {
        id: (mockContracts.length + 1).toString(),
        name: `Contract #${mockContracts.length + 1}`,
        description: 'Auto-generated contract',
        status: 'active',
        type: 'automation',
        lastExecuted: null,
        executionCount: 0,
        conditions,
        actions: ['Auto-action'],
        supplierId,
        productId,
        amount,
        blockHash
      };
      mockContracts.push(contract);
      saveBlockchainState();
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create smart contract' });
    }
  });

  app.post('/api/blockchain/smart-contract/:contractId/execute', authenticate, async (req, res) => {
    try {
      const { contractId } = req.params;
      const { deliveryConfirmation } = req.body;
      const success = await blockchainService.executeSmartContract(contractId, deliveryConfirmation);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute smart contract' });
    }
  });

  app.get('/api/blockchain/authenticity/:productId', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const isAuthentic = await blockchainService.verifyProductAuthenticity(productId);
      res.json({ isAuthentic });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify product authenticity' });
    }
  });

  app.get('/api/blockchain/stats', authenticate, async (req, res) => {
    try {
      const stats = await blockchainService.getBlockchainStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get blockchain stats' });
    }
  });

  // Sustainability Analytics Endpoints
  app.get('/api/blockchain/sustainability/metrics', authenticate, async (req, res) => {
    try {
      const metrics = await blockchainService.getSustainabilityMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sustainability metrics' });
    }
  });

  app.get('/api/blockchain/sustainability/trends', authenticate, async (req, res) => {
    try {
      const metrics = await blockchainService.getSustainabilityMetrics();
      res.json({ trends: metrics.sustainabilityTrends });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sustainability trends' });
    }
  });

  app.get('/api/blockchain/sustainability/carbon-footprint/:productId', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const traces = await blockchainService.getProductTraceability(productId);
      const totalFootprint = traces.reduce((sum, trace) => sum + (trace.carbonFootprint || 0), 0);
      res.json({ productId, totalFootprint, traces: traces.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get carbon footprint' });
    }
  });

  // Carbon Projects Endpoints
  app.post('/api/blockchain/carbon-projects', authenticate, async (req, res) => {
    try {
      const { name, description, location, carbonOffset, verificationDocument } = req.body;
      const project = await blockchainService.createCarbonProject(
        name, description, location, carbonOffset, verificationDocument
      );
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create carbon project' });
    }
  });

  app.get('/api/blockchain/carbon-projects', authenticate, async (req, res) => {
    try {
      const projects = await blockchainService.getCarbonProjects();
      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get carbon projects' });
    }
  });

  app.post('/api/blockchain/carbon-projects/:projectId/verify', authenticate, async (req, res) => {
    try {
      const { projectId } = req.params;
      const success = await blockchainService.verifyCarbonProject(projectId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify carbon project' });
    }
  });

  // Enhanced Green Token Endpoints
  app.get('/api/blockchain/green-tokens/transactions/:owner', authenticate, async (req, res) => {
    try {
      const { owner } = req.params;
      const tokens = blockchainService['greenTokens'].get(owner) || [];
      res.json({ transactions: tokens });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get token transactions' });
    }
  });

  app.get('/api/blockchain/green-tokens/leaderboard', authenticate, async (req, res) => {
    try {
      const greenTokens = blockchainService['greenTokens'];
      const leaderboard = Array.from(greenTokens.entries())
        .map(([owner, tokens]) => ({
          owner,
          balance: tokens.reduce((sum, token) => sum + token.amount, 0),
          carbonOffset: tokens.reduce((sum, token) => sum + token.carbonOffset, 0)
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
      res.json({ leaderboard });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  });

  // Edge Computing Endpoints
  app.get('/api/edge/devices', authenticate, async (req, res) => {
    try {
      const { data } = await axios.get(`${EDGE_API_BASE}/devices`);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get edge devices' });
    }
  });

  app.get('/api/edge/devices/:deviceId', authenticate, async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { data } = await axios.get(`${EDGE_API_BASE}/devices/${deviceId}`);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get device status' });
    }
  });

  app.post('/api/edge/emergency-coordination', authenticate, async (req, res) => {
    try {
      const { clusterId, emergencyType, details } = req.body;
      const { data } = await axios.post(`${EDGE_API_BASE}/emergency-coordination`, {
        clusterId,
        emergencyType,
        details
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to trigger emergency coordination' });
    }
  });

  // Enhanced Edge Computing Endpoints
  app.get('/api/edge/analytics', authenticate, async (req, res) => {
    try {
      const { data } = await axios.get(`${EDGE_API_BASE}/analytics`);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get edge analytics' });
    }
  });

  app.get('/api/edge/clusters', authenticate, async (req, res) => {
    try {
      // Get a list of clusters from FastAPI service
      const clusters = [];
      for (const clusterId of ['cluster-warehouse-a', 'cluster-warehouse-b', 'cluster-loading-dock']) {
        try {
          const { data: clusterStatus } = await axios.get(`${EDGE_API_BASE}/clusters/${clusterId}`);
          if (clusterStatus && !clusterStatus.error) {
            clusters.push(clusterStatus);
          }
        } catch {}
      }
      res.json({ clusters });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get clusters' });
    }
  });

  app.get('/api/edge/clusters/:clusterId', authenticate, async (req, res) => {
    try {
      const { clusterId } = req.params;
      const { data: clusterStatus } = await axios.get(`${EDGE_API_BASE}/clusters/${clusterId}`);
      res.json(clusterStatus);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cluster status' });
    }
  });

  app.get('/api/edge/emergencies', authenticate, async (req, res) => {
    try {
      const { data } = await axios.get(`${EDGE_API_BASE}/emergencies`);
      res.json({ emergencies: data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get emergency events' });
    }
  });

  app.post('/api/edge/devices', authenticate, async (req, res) => {
    try {
      const { deviceId, deviceType, location } = req.body;
      const { data } = await axios.post(`${EDGE_API_BASE}/devices`, { deviceId, deviceType, location });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create device' });
    }
  });

  app.get('/api/edge/devices/:deviceId/ml-models', authenticate, async (req, res) => {
    try {
      // For demo, just return an empty object or mock data
      res.json({ ml_models: {} });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get device ML models' });
    }
  });

  // AR/VR Endpoints
  app.get('/api/warehouse/3d-layout', authenticate, async (req, res) => {
    try {
      // Mock warehouse layout data
      const layout = [
        { zone: 'A', products: ['Laptop', 'Smartphone'], capacity: 100, position: { x: -30, y: 0, z: -30 }, dimensions: { width: 20, height: 8, depth: 20 } },
        { zone: 'B', products: ['T-Shirt', 'Desk Chair'], capacity: 80, position: { x: 0, y: 0, z: -30 }, dimensions: { width: 20, height: 8, depth: 20 } },
        { zone: 'C', products: ['Apples'], capacity: 120, position: { x: 30, y: 0, z: -30 }, dimensions: { width: 20, height: 8, depth: 20 } },
        { zone: 'D', products: [], capacity: 60, position: { x: 0, y: 0, z: 0 }, dimensions: { width: 20, height: 8, depth: 20 } }
      ];
      res.json(layout);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get 3D warehouse layout' });
    }
  });

  app.post('/api/warehouse/ar-paths', authenticate, async (req, res) => {
    try {
      const { robotId, path, color, status } = req.body;
      // In real implementation, this would store AR paths
      res.json({ success: true, pathId: `path-${Date.now()}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create AR path' });
    }
  });

  // Security & Compliance Endpoints
  app.post('/api/security/encrypt', authenticate, async (req, res) => {
    try {
      const { data, userId } = req.body;
      const encryptedData = await securityService.encryptSensitiveData(data, userId);
      res.json({ encryptedData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to encrypt data' });
    }
  });

  app.post('/api/security/decrypt', authenticate, async (req, res) => {
    try {
      const { encryptedData, userId } = req.body;
      const decryptedData = await securityService.decryptSensitiveData(encryptedData, userId);
      res.json({ decryptedData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to decrypt data' });
    }
  });

  app.post('/api/security/2fa/setup', authenticate, async (req, res) => {
    try {
      const { userId } = req.body;
      const setup = await securityService.setupTOTP(userId);
      res.json(setup);
    } catch (error) {
      res.status(500).json({ error: 'Failed to setup 2FA' });
    }
  });

  app.post('/api/security/2fa/verify', authenticate, async (req, res) => {
    try {
      const { userId, token } = req.body;
      const isValid = await securityService.verifyTOTP(userId, token);
      res.json({ isValid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify 2FA' });
    }
  });

  app.post('/api/security/2fa/backup', authenticate, async (req, res) => {
    try {
      const { userId, backupCode } = req.body;
      const isValid = await securityService.verifyBackupCode(userId, backupCode);
      res.json({ isValid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify backup code' });
    }
  });

  app.post('/api/security/2fa/enable', authenticate, async (req, res) => {
    try {
      const { userId } = req.body;
      const success = await securityService.enableTOTP(userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable 2FA' });
    }
  });

  // GDPR Compliance Endpoints
  app.get('/api/gdpr/export/:userId', authenticate, async (req, res) => {
    try {
      const { userId } = req.params;
      const userData = await securityService.exportUserData(parseInt(userId));
      res.json(userData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export user data' });
    }
  });

  app.delete('/api/gdpr/delete/:userId', authenticate, async (req, res) => {
    try {
      const { userId } = req.params;
      const success = await securityService.deleteUserData(parseInt(userId));
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user data' });
    }
  });

  app.put('/api/gdpr/rectify/:userId', authenticate, async (req, res) => {
    try {
      const { userId } = req.params;
      const { corrections } = req.body;
      const success = await securityService.rectifyUserData(parseInt(userId), corrections);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to rectify user data' });
    }
  });

  app.get('/api/audit-logs', authenticate, async (req, res) => {
    try {
      const { userId, action, startDate, endDate, limit } = req.query;
      const logs = await securityService.getAuditLogs(
        userId ? parseInt(userId as string) : undefined,
        action as string,
        startDate as string,
        endDate as string,
        limit ? parseInt(limit as string) : 100
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });

  // PWA & Push Notification Endpoints
  app.post('/api/push-subscriptions', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint, keys } = req.body;
      // Mock implementation - in real app, this would store in database
      console.log('Push subscription created for user:', req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create push subscription' });
    }
  });

  app.delete('/api/push-subscriptions', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint } = req.body;
      // Mock implementation - in real app, this would remove from database
      console.log('Push subscription deleted for user:', req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete push subscription' });
    }
  });

  app.post('/api/notifications/send', authenticate, async (req, res) => {
    try {
      const { type, title, body, data, userIds } = req.body;
      // Send push notifications to specified users
      // This would integrate with the push notification service
      res.json({ success: true, sentTo: userIds.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send notifications' });
    }
  });

  app.get('/api/notification-history', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.query;
      // Mock implementation - in real app, this would fetch from database
      const history = [
        {
          id: 1,
          userId: userId ? parseInt(userId as string) : req.user!.id,
          title: 'Order Ready',
          body: 'Your order is ready for pickup',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notification history' });
    }
  });

  app.put('/api/notification-preferences', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const preferences = req.body;
      // Mock implementation - in real app, this would update database
      console.log('Notification preferences updated for user:', req.user!.id, preferences);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // External System Integration Endpoints
  app.get('/api/erp/products', authenticate, async (req, res) => {
    try {
      const products = await externalIntegrations.getERPProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ERP products' });
    }
  });

  app.post('/api/erp/purchase-orders', authenticate, async (req, res) => {
    try {
      const purchaseOrder = await externalIntegrations.createERPPurchaseOrder(req.body);
      res.json(purchaseOrder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create ERP purchase order' });
    }
  });

  app.post('/api/erp/sync-inventory', authenticate, async (req, res) => {
    try {
      await externalIntegrations.syncInventoryWithERP();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync inventory with ERP' });
    }
  });

  app.get('/api/weather/:location', authenticate, async (req, res) => {
    try {
      const { location } = req.params;
      const weatherData = await externalIntegrations.getWeatherData(location);
      res.json(weatherData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  app.post('/api/weather/routes', authenticate, async (req, res) => {
    try {
      const { origin, destination } = req.body;
      const weatherAwareRoute = await externalIntegrations.getWeatherAwareRoutes(origin, destination);
      res.json(weatherAwareRoute);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get weather-aware routes' });
    }
  });

  app.post('/api/logistics/shipments', authenticate, async (req, res) => {
    try {
      const trackingNumber = await externalIntegrations.createLogisticsShipment(req.body);
      res.json({ trackingNumber });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create logistics shipment' });
    }
  });

  app.get('/api/logistics/tracking/:trackingNumber', authenticate, async (req, res) => {
    try {
      const { trackingNumber } = req.params;
      const trackingData = await externalIntegrations.getLogisticsTracking(trackingNumber);
      res.json(trackingData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logistics tracking' });
    }
  });

  app.post('/api/logistics/update-order/:orderId', authenticate, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { trackingData } = req.body;
      await externalIntegrations.updateOrderWithLogisticsStatus(parseInt(orderId), trackingData);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update order with logistics status' });
    }
  });

  app.post('/api/wms/sync', authenticate, async (req, res) => {
    try {
      await externalIntegrations.syncWMSChanges();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync WMS changes' });
    }
  });

  // Pub-Sub Messaging Endpoints
  app.post('/api/pubsub/publish', authenticate, async (req, res) => {
    try {
      const { topic, payload } = req.body;
      externalIntegrations.publishMessage(topic, payload);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to publish message' });
    }
  });

  app.get('/api/pubsub/subscribe/:topic', authenticate, async (req, res) => {
    try {
      const { topic } = req.params;
      // In real implementation, this would set up WebSocket subscription
      res.json({ success: true, topic });
    } catch (error) {
      res.status(500).json({ error: 'Failed to subscribe to topic' });
    }
  });

  // --- IoT Data Endpoints ---
  app.get('/api/iot/live', async (req, res) => {
    try {
      // Get latest record for each zone
      const zones = ['A', 'B', 'C'];
      const results = await Promise.all(zones.map(async zone => {
        const { rows } = await pool.query('SELECT * FROM iot_readings WHERE zone = $1 ORDER BY timestamp DESC LIMIT 1', [zone]);
        return rows[0];
      }));
      res.json(results.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch latest IoT data' });
    }
  });

  app.get('/api/iot/history', async (req, res) => {
    try {
      const { zone, limit = 10 } = req.query;
      if (!zone) return res.status(400).json({ error: 'zone is required' });
      const { rows } = await pool.query('SELECT * FROM iot_readings WHERE zone = $1 ORDER BY timestamp DESC LIMIT $2', [zone, limit]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch IoT history' });
    }
  });

  // --- Delivery Mode Recommendation Proxy ---
  app.post('/api/recommend/delivery-mode', async (req, res) => {
    try {
      const { distance, priority, package_size } = req.body;
      if (typeof distance !== 'number' || !['low','normal','high'].includes(priority) || !['small','medium','large'].includes(package_size)) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000/recommend_delivery_mode';
      const response = await axios.post(mlUrl, { distance, priority, package_size });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get delivery mode recommendation' });
    }
  });

  // --- CO2 Tracking Endpoint ---
  app.get('/api/delivery/co2', async (req, res) => {
    try {
      // Mock data for demonstration
      const data = [
        { deliveryId: 1, route: 'Delhi → Mumbai', zone: 'A', co2: 12.5 },
        { deliveryId: 2, route: 'Mumbai → Chennai', zone: 'B', co2: 8.2 },
        { deliveryId: 3, route: 'Bengaluru → Kolkata', zone: 'C', co2: 5.7 },
        { deliveryId: 4, route: 'Delhi → Kolkata', zone: 'A', co2: 15.1 },
        { deliveryId: 5, route: 'Chennai → Delhi', zone: 'B', co2: 7.9 },
      ];
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch CO2 data' });
    }
  });

  app.post('/api/erp/sync-orders', authenticate, async (req, res) => {
    try {
      const orders = await erpSimulator.syncOrdersWithERP();
      res.json({ success: true, orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync orders with ERP' });
    }
  });

  app.get('/api/erp/sync-logs', authenticate, async (req, res) => {
    try {
      const logs = erpSimulator.getERPSyncLogs();
      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ERP sync logs' });
    }
  });

  // --- Green Option Recommendation Endpoint for Chatbot/UX ---
  app.post('/api/recommend/green-option', async (req, res) => {
    try {
      const { origin, destination, packageSize, priority } = req.body;
      // Try ML service first
      let mlResult = null;
      try {
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000/recommend_delivery_mode';
        const mlRes = await axios.post(mlUrl, { distance: 10, priority, package_size: packageSize }); // TODO: calculate real distance
        mlResult = mlRes.data;
      } catch (e) {
        // ML service not available, fallback to rule-based
      }
      // Fallback: simple rule
      let recommendation = '';
      let mode = '';
      let co2 = 0;
      if (mlResult && mlResult.mode) {
        mode = mlResult.mode;
        co2 = mlResult.co2;
        recommendation = `Recommended delivery mode: ${mode} (est. CO₂: ${co2} kg)`;
      } else {
        // If origin and destination are close, suggest pickup
        if (origin && destination && Math.abs(origin.lat - destination.lat) < 0.01 && Math.abs(origin.lng - destination.lng) < 0.01) {
          mode = 'pickup';
          co2 = 0.1;
          recommendation = 'Pickup is recommended for lowest carbon footprint.';
        } else {
          mode = 'drone';
          co2 = 0.3;
          recommendation = 'Drone delivery is recommended for lowest CO₂ emissions.';
        }
      }
      res.json({ mode, co2, recommendation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to recommend green option' });
    }
  });

  // --- Chatbot Webhook Endpoint (Dialogflow/Rasa) ---
  app.post('/api/chatbot/webhook', async (req, res) => {
    try {
      const body = req.body;
      let intent = '';
      let params: any = {};
      if (body.queryResult) {
        intent = body.queryResult.intent.displayName;
        params = body.queryResult.parameters || {};
      } else if (body.intent) {
        intent = body.intent.name;
        params = body.entities || {};
      }
      let fulfillmentText = '';
      // --- Order Status Intent ---
      if (/order.*status|track.*order/i.test(intent)) {
        const orderId = params.orderId || params.order_id || params['order id'];
        if (!orderId) {
          fulfillmentText = 'Please provide your order ID.';
        } else {
          const order = await storage.getClickCollectOrder(Number(orderId));
          if (!order) {
            fulfillmentText = `Sorry, I could not find an order with ID ${orderId}.`;
          } else {
            fulfillmentText = `Order #${order.id} (${order.productName}) is currently '${order.status}'. Last updated: ${order.updatedAt}.`;
          }
        }
      }
      // --- Green Option Recommendation Intent ---
      else if (/green.*option|eco.*delivery|sustainable.*option/i.test(intent)) {
        const origin = params.origin;
        const destination = params.destination;
        const packageSize = params.packageSize;
        const priority = params.priority;
        const recRes = await axios.post('http://localhost:3000/api/recommend/green-option', { origin, destination, packageSize, priority });
        const { recommendation } = recRes.data;
        fulfillmentText = recommendation;
      }
      // --- Fallback ---
      else {
        fulfillmentText = "I'm sorry, I didn't understand your request. Please ask about order status or green delivery options.";
      }
      if (body.queryResult) {
        res.json({ fulfillmentText });
      } else {
        res.json({ text: fulfillmentText });
      }
    } catch (error) {
      res.status(500).json({ fulfillmentText: 'Sorry, there was an error processing your request.' });
    }
  });

  // --- Click-and-Collect Order Status Endpoint for Chatbot/Tracking ---
  app.get('/api/orders/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID' });
      const order = await storage.getClickCollectOrder(id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      // Only include properties that exist on the order object
      const {
        id: orderId,
        status,
        productName,
        quantity,
        customerName,
        location,
        updatedAt,
        greenDelivery,
        co2Emission,
        energyUsage
      } = order;
      res.json({
        id: orderId,
        status,
        productName,
        quantity,
        customerName,
        location,
        updatedAt,
        greenDelivery,
        co2Emission,
        energyUsage
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order status' });
    }
  });

  app.use(openapiRouter);

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
  await notificationClient.query('LISTEN notification_channel');
  notificationClient.on('notification', (msg) => {
    const payload = JSON.parse(msg.payload || '{}');
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: payload,
          timestamp: new Date().toISOString()
        }));
      }
    });
  });

  return httpServer;
}

// Mock data generation for omnichannel analytics
function generateMockOrders(period: string): any[] {
  const now = new Date();
  let daysBack: number;
  
  switch (period) {
    case '24h':
      daysBack = 1;
      break;
    case '7d':
      daysBack = 7;
      break;
    case '30d':
      daysBack = 30;
      break;
    default:
      daysBack = 7;
  }

  const mockCustomers = [
    'Amit Kumar', 'Priya Singh', 'Ravi Patel', 'Sunita Sharma', 'Vikram Rao',
    'Neha Verma', 'Arjun Mehta', 'Kavita Joshi', 'Suresh Reddy', 'Meera Nair',
    'Deepak Shah', 'Anjali Gupta', 'Rahul Yadav', 'Pooja Desai', 'Manish Jain',
    'Kiran Malhotra', 'Rajesh Khanna', 'Smita Patel', 'Vivek Sharma', 'Anita Reddy'
  ];

  const mockProducts = [
    'Laptop', 'Smartphone', 'T-Shirt', 'Jeans', 'Shoes', 'Headphones', 
    'Watch', 'Backpack', 'Water Bottle', 'Books', 'Groceries', 'Electronics',
    'Clothing', 'Accessories', 'Home & Garden', 'Sports Equipment', 'Toys',
    'Beauty Products', 'Health & Wellness', 'Automotive'
  ];

  const mockLocations = [
    'Mumbai Central', 'Delhi NCR', 'Bangalore Tech Park', 'Chennai Marina',
    'Kolkata Salt Lake', 'Hyderabad Hitech City', 'Pune Hinjewadi',
    'Ahmedabad Satellite', 'Jaipur Pink City', 'Lucknow Gomti Nagar'
  ];

  const channels = ['online', 'in-store', 'mobile', 'partner'];
  const statuses = ['Pending', 'Ready', 'PickedUp', 'Cancelled'];

  const orders = [];
  const totalOrders = Math.floor(Math.random() * 200) + 100; // 100-300 orders

  for (let i = 0; i < totalOrders; i++) {
    const daysAgo = Math.floor(Math.random() * daysBack);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 48 * 60 * 60 * 1000); // 0-48 hours later
    
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const greenDelivery = Math.random() < 0.3; // 30% green delivery
    const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 items
    
    // Generate sustainability metrics
    const co2Emission = greenDelivery ? 
      (Math.random() * 2 + 0.5) : // 0.5-2.5 kg for green delivery
      (Math.random() * 4 + 2); // 2-6 kg for regular delivery
    
    const energyUsage = co2Emission * (0.3 + Math.random() * 0.4); // 0.3-0.7 ratio
    const deliveryEfficiencyScore = greenDelivery ? 
      (85 + Math.random() * 15) : // 85-100 for green delivery
      (60 + Math.random() * 25); // 60-85 for regular delivery

    orders.push({
      id: 1000 + i,
      productName: mockProducts[Math.floor(Math.random() * mockProducts.length)],
      customerName: mockCustomers[Math.floor(Math.random() * mockCustomers.length)],
      customerContact: `+91-98${Math.floor(10000000 + Math.random() * 90000000)}`,
      quantity,
      location: mockLocations[Math.floor(Math.random() * mockLocations.length)],
      status,
      channel,
      greenDelivery,
      co2Emission: Math.round(co2Emission * 100) / 100,
      energyUsage: Math.round(energyUsage * 100) / 100,
      deliveryEfficiencyScore: Math.round(deliveryEfficiencyScore * 100) / 100,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });
  }

  return orders;
}

// Helper functions for omnichannel analytics
function calculateRepeatCustomers(orders: any[]): number {
  const customerOrderCounts: { [key: string]: number } = {};
  orders.forEach(order => {
    customerOrderCounts[order.customerName] = (customerOrderCounts[order.customerName] || 0) + 1;
  });
  return Object.values(customerOrderCounts).filter(count => count > 1).length;
}

function calculateChannelSwitching(orders: any[]): { [key: string]: number } {
  const customerChannels: { [key: string]: Set<string> } = {};
  orders.forEach(order => {
    if (!customerChannels[order.customerName]) {
      customerChannels[order.customerName] = new Set();
    }
    customerChannels[order.customerName].add(order.channel);
  });
  
  const switching: { [key: string]: number } = {};
  Object.values(customerChannels).forEach(channels => {
    const channelCount = channels.size;
    if (channelCount > 1) {
      switching[`${channelCount} channels`] = (switching[`${channelCount} channels`] || 0) + 1;
    }
  });
  return switching;
}

function calculatePeakHours(orders: any[]): string[] {
  const hourCounts: { [key: number]: number } = {};
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const sortedHours = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00-${parseInt(hour) + 1}:00`);
  
  return sortedHours;
}

function calculateTopProducts(orders: any[]): { name: string; count: number }[] {
  const productCounts: { [key: string]: number } = {};
  orders.forEach(order => {
    productCounts[order.productName] = (productCounts[order.productName] || 0) + 1;
  });
  
  return Object.entries(productCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calculateAverageEfficiencyScore(orders: any[]): number {
  const efficiencyScores = orders
    .filter(order => order.deliveryEfficiencyScore)
    .map(order => order.deliveryEfficiencyScore);
  
  if (efficiencyScores.length === 0) return 0;
  return efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length;
}

function calculatePreferredChannel(orders: any[]): string {
  const channelCounts: { [key: string]: number } = {};
  orders.forEach(order => {
    channelCounts[order.channel] = (channelCounts[order.channel] || 0) + 1;
  });
  
  return Object.entries(channelCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
}

function calculateCustomerSustainabilityScore(orders: any[]): number {
  const greenDeliveries = orders.filter(order => order.greenDelivery).length;
  const totalCarbon = orders.reduce((sum, order) => sum + (order.co2Emission || 0), 0);
  const avgCarbon = totalCarbon / orders.length;
  
  // Score based on green delivery rate and carbon efficiency
  const greenScore = (greenDeliveries / orders.length) * 50;
  const carbonScore = Math.max(0, 50 - (avgCarbon * 10)); // Lower carbon = higher score
  
  return Math.round((greenScore + carbonScore) * 100) / 100;
}

function calculateDailyTrends(orders: any[], metric: string): { date: string; value: number }[] {
  const dailyData: { [key: string]: number[] } = {};
  
  orders.forEach(order => {
    const date = new Date(order.createdAt).toISOString().split('T')[0];
    if (!dailyData[date]) dailyData[date] = [];
    
    if (metric === 'greenDelivery') {
      dailyData[date].push(order.greenDelivery ? 1 : 0);
    } else {
      dailyData[date].push(order[metric] || 0);
    }
  });
  
  return Object.entries(dailyData)
    .map(([date, values]) => ({
      date,
      value: values.reduce((sum, val) => sum + val, 0) / values.length
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSustainableProducts(orders: any[]): { name: string; greenRate: number; avgCarbon: number }[] {
  const productData: { [key: string]: { greenCount: number; totalCount: number; carbonSum: number } } = {};
  
  orders.forEach(order => {
    if (!productData[order.productName]) {
      productData[order.productName] = { greenCount: 0, totalCount: 0, carbonSum: 0 };
    }
    
    productData[order.productName].totalCount++;
    if (order.greenDelivery) {
      productData[order.productName].greenCount++;
    }
    productData[order.productName].carbonSum += order.co2Emission || 0;
  });
  
  return Object.entries(productData)
    .map(([name, data]) => ({
      name,
      greenRate: (data.greenCount / data.totalCount) * 100,
      avgCarbon: data.carbonSum / data.totalCount
    }))
    .sort((a, b) => b.greenRate - a.greenRate)
    .slice(0, 10);
}

function generateSustainabilityRecommendations(orders: any[]): string[] {
  const recommendations: string[] = [];
  
  const greenDeliveryRate = orders.filter(order => order.greenDelivery).length / orders.length;
  const avgCarbon = orders.reduce((sum, order) => sum + (order.co2Emission || 0), 0) / orders.length;
  
  if (greenDeliveryRate < 0.3) {
    recommendations.push('Consider incentivizing green delivery options to increase adoption');
  }
  
  if (avgCarbon > 5) {
    recommendations.push('Optimize delivery routes to reduce carbon footprint per order');
  }
  
  const channelGreenRates: { [key: string]: number } = {};
  orders.forEach(order => {
    if (!channelGreenRates[order.channel]) {
      channelGreenRates[order.channel] = { green: 0, total: 0 };
    }
    channelGreenRates[order.channel].total++;
    if (order.greenDelivery) {
      channelGreenRates[order.channel].green++;
    }
  });
  
  Object.entries(channelGreenRates).forEach(([channel, data]) => {
    const rate = data.green / data.total;
    if (rate < 0.2) {
      recommendations.push(`Promote green delivery options more prominently in ${channel} channel`);
    }
  });
  
  return recommendations.slice(0, 5);
}
