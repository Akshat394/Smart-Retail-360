import axios from 'axios';
import { EventEmitter } from 'events';
import { db } from '@server/utils/db';
import { inventory, clickCollectOrders, routes } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as erpSimulator from '../../integrations/erp/simulator';

export interface ERPProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  cost: number;
  price: number;
  minStock: number;
  maxStock: number;
  leadTime: number;
}

export interface ERPPurchaseOrder {
  id: string;
  supplierId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  createdAt: string;
  expectedDelivery: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  visibility: number;
  conditions: string;
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    conditions: string;
    precipitation: number;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    description: string;
    expiresAt: string;
  }>;
}

export interface LogisticsTracking {
  trackingNumber: string;
  carrier: string;
  status: string;
  location: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  events: Array<{
    timestamp: string;
    location: string;
    status: string;
    description: string;
  }>;
}

export interface PubSubMessage {
  topic: string;
  payload: any;
  timestamp: string;
  messageId: string;
  correlationId?: string;
}

const isDemoERP = process.env.NODE_ENV === 'development' || process.env.DEMO_ERP === '1';

class ExternalIntegrationsService extends EventEmitter {
  private weatherApiKey: string;
  private erpBaseUrl: string;
  private logisticsApiKey: string;
  private pubSubSubscribers: Map<string, Array<(message: PubSubMessage) => void>> = new Map();

  constructor() {
    super();
    this.weatherApiKey = process.env.OPENWEATHER_API_KEY || '';
    this.erpBaseUrl = process.env.ERP_BASE_URL || 'https://api.erp-system.com';
    this.logisticsApiKey = process.env.LOGISTICS_API_KEY || '';
    
    this.initializeIntegrations();
  }

  private async initializeIntegrations(): Promise<void> {
    // Initialize pub-sub system
    this.setupPubSubSystem();
    
    // Start periodic sync with external systems
    this.startPeriodicSync();
    
    console.log('External integrations service initialized');
  }

  // ERP System Integration (SAP/Oracle)
  public async getERPProducts(): Promise<ERPProduct[]> {
    try {
      const response = await axios.get(`${this.erpBaseUrl}/products`, {
        headers: {
          'Authorization': `Bearer ${process.env.ERP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        supplier: product.supplier,
        cost: product.cost,
        price: product.price,
        minStock: product.minStock,
        maxStock: product.maxStock,
        leadTime: product.leadTime
      }));
    } catch (error) {
      console.error('Error fetching ERP products:', error);
      // Return mock data for demonstration
      return this.getMockERPProducts();
    }
  }

  public async createERPPurchaseOrder(order: Omit<ERPPurchaseOrder, 'id' | 'status' | 'createdAt'>): Promise<ERPPurchaseOrder> {
    try {
      const response = await axios.post(`${this.erpBaseUrl}/purchase-orders`, order, {
        headers: {
          'Authorization': `Bearer ${process.env.ERP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error creating ERP purchase order:', error);
      // Create mock purchase order
      return {
        id: `PO-${Date.now()}`,
        supplierId: order.supplierId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: 'draft',
        createdAt: new Date().toISOString(),
        expectedDelivery: order.expectedDelivery
      };
    }
  }

  public async syncInventoryWithERP(): Promise<void> {
    if (isDemoERP) {
      await erpSimulator.syncInventoryWithERP();
      return;
    }
    try {
      // Get current inventory from our system
      const currentInventory = await db.select().from(inventory);
      
      // Get ERP products
      const erpProducts = await this.getERPProducts();
      
      // Sync inventory levels
      for (const erpProduct of erpProducts) {
        const localProduct = currentInventory.find(item => item.productName === erpProduct.name);
        
        if (localProduct) {
          // Update local inventory with ERP data
          await db.update(inventory)
            .set({
              quantity: Math.max(localProduct.quantity, erpProduct.minStock),
              lastUpdated: new Date()
            })
            .where(eq(inventory.id, localProduct.id));
        }
      }

      // Publish inventory sync event
      this.publishMessage('inventory.sync', {
        syncedAt: new Date().toISOString(),
        productsSynced: erpProducts.length
      });

      console.log('Inventory synced with ERP system');
    } catch (error) {
      console.error('Error syncing inventory with ERP:', error);
    }
  }

  // Weather API Integration
  public async getWeatherData(location: string): Promise<WeatherData> {
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: location,
          appid: this.weatherApiKey,
          units: 'metric'
        },
        timeout: 5000
      });

      const forecastResponse = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
        params: {
          q: location,
          appid: this.weatherApiKey,
          units: 'metric'
        },
        timeout: 5000
      });

      const weatherData: WeatherData = {
        location: response.data.name,
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        windDirection: response.data.wind.deg,
        precipitation: response.data.rain?.['1h'] || 0,
        visibility: response.data.visibility / 1000, // Convert to km
        conditions: response.data.weather[0].main,
        forecast: forecastResponse.data.list.slice(0, 5).map((item: any) => ({
          date: new Date(item.dt * 1000).toISOString(),
          high: item.main.temp_max,
          low: item.main.temp_min,
          conditions: item.weather[0].main,
          precipitation: item.pop * 100 // Probability of precipitation
        })),
        alerts: [] // Weather alerts would come from a separate endpoint
      };

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getMockWeatherData(location);
    }
  }

  public async getWeatherAwareRoutes(origin: string, destination: string): Promise<any> {
    try {
      const weatherData = await this.getWeatherData(destination);
      
      // Analyze weather impact on routes
      const weatherImpact = this.analyzeWeatherImpact(weatherData);
      
      // Get base route
      const baseRoute = await this.getBaseRoute(origin, destination);
      
      // Apply weather-based modifications
      const weatherAwareRoute = this.applyWeatherModifications(baseRoute, weatherImpact);
      
      return weatherAwareRoute;
    } catch (error) {
      console.error('Error getting weather-aware routes:', error);
      return null;
    }
  }

  private analyzeWeatherImpact(weatherData: WeatherData): any {
    const impact = {
      delayMultiplier: 1.0,
      riskLevel: 'low',
      recommendations: [] as string[]
    };

    // Analyze precipitation
    if (weatherData.precipitation > 10) {
      impact.delayMultiplier = 1.3;
      impact.riskLevel = 'medium';
      impact.recommendations.push('Heavy precipitation expected - consider alternative routes');
    }

    // Analyze wind
    if (weatherData.windSpeed > 20) {
      impact.delayMultiplier *= 1.2;
      impact.riskLevel = impact.riskLevel === 'low' ? 'medium' : 'high';
      impact.recommendations.push('High winds may affect delivery vehicles');
    }

    // Analyze visibility
    if (weatherData.visibility < 5) {
      impact.delayMultiplier *= 1.4;
      impact.riskLevel = 'high';
      impact.recommendations.push('Low visibility - delivery delays expected');
    }

    return impact;
  }

  // 3PL Logistics Integration
  public async createLogisticsShipment(orderData: any): Promise<string> {
    try {
      const response = await axios.post('https://api.logistics-provider.com/shipments', {
        origin: orderData.origin,
        destination: orderData.destination,
        items: orderData.items,
        service: orderData.service || 'standard',
        specialInstructions: orderData.specialInstructions
      }, {
        headers: {
          'Authorization': `Bearer ${this.logisticsApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data.trackingNumber;
    } catch (error) {
      console.error('Error creating logistics shipment:', error);
      return `TRK-${Date.now()}`; // Mock tracking number
    }
  }

  public async getLogisticsTracking(trackingNumber: string): Promise<LogisticsTracking> {
    try {
      const response = await axios.get(`https://api.logistics-provider.com/tracking/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.logisticsApiKey}`
        },
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Error getting logistics tracking:', error);
      return this.getMockLogisticsTracking(trackingNumber);
    }
  }

  public async updateOrderWithLogisticsStatus(orderId: number, trackingData: LogisticsTracking): Promise<void> {
    try {
      // Update order status based on logistics tracking
      let newStatus = 'In Transit';
      
      if (trackingData.status === 'Delivered') {
        newStatus = 'Delivered';
      } else if (trackingData.status === 'Out for Delivery') {
        newStatus = 'Out for Delivery';
      } else if (trackingData.status === 'Exception') {
        newStatus = 'Delivery Exception';
      }

      await db.update(clickCollectOrders)
        .set({
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(clickCollectOrders.id, orderId));

      // Publish logistics update event
      this.publishMessage('logistics.update', {
        orderId,
        trackingNumber: trackingData.trackingNumber,
        status: trackingData.status,
        location: trackingData.location
      });

    } catch (error) {
      console.error('Error updating order with logistics status:', error);
    }
  }

  // Pub-Sub Messaging System (Kafka/NATS pattern)
  private setupPubSubSystem(): void {
    // Set up event listeners for internal system events
    this.on('inventory.update', (data) => {
      this.publishMessage('inventory.update', data);
    });

    this.on('order.status_change', (data) => {
      this.publishMessage('order.status_change', data);
    });

    this.on('robot.maintenance', (data) => {
      this.publishMessage('robot.maintenance', data);
    });

    this.on('weather.alert', (data) => {
      this.publishMessage('weather.alert', data);
    });
  }

  public publishMessage(topic: string, payload: any): void {
    const message: PubSubMessage = {
      topic,
      payload,
      timestamp: new Date().toISOString(),
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Notify subscribers
    const subscribers = this.pubSubSubscribers.get(topic) || [];
    subscribers.forEach(subscriber => {
      try {
        subscriber(message);
      } catch (error) {
        console.error(`Error in subscriber for topic ${topic}:`, error);
      }
    });

    // Emit internal event
    this.emit('message.published', message);

    console.log(`Message published to topic: ${topic}`);
  }

  public subscribeToTopic(topic: string, callback: (message: PubSubMessage) => void): () => void {
    if (!this.pubSubSubscribers.has(topic)) {
      this.pubSubSubscribers.set(topic, []);
    }

    this.pubSubSubscribers.get(topic)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.pubSubSubscribers.get(topic) || [];
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  public async syncWMSChanges(): Promise<void> {
    try {
      // Simulate WMS changes sync
      const wmsChanges = await this.getWMSChanges();
      
      for (const change of wmsChanges) {
        switch (change.type) {
          case 'inventory_update':
            await this.syncInventoryChange(change);
            break;
          case 'order_update':
            await this.syncOrderChange(change);
            break;
          case 'location_update':
            await this.syncLocationChange(change);
            break;
        }
      }

      // Publish WMS sync event
      this.publishMessage('wms.sync', {
        syncedAt: new Date().toISOString(),
        changesProcessed: wmsChanges.length
      });

    } catch (error) {
      console.error('Error syncing WMS changes:', error);
    }
  }

  private async getWMSChanges(): Promise<any[]> {
    // Mock WMS changes - in real implementation, this would poll WMS API
    return [
      {
        type: 'inventory_update',
        productId: 'PROD-001',
        quantity: 150,
        location: 'Warehouse A',
        timestamp: new Date().toISOString()
      },
      {
        type: 'order_update',
        orderId: 'ORD-123',
        status: 'picked',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private async syncInventoryChange(change: any): Promise<void> {
    await db.update(inventory)
      .set({
        quantity: change.quantity,
        lastUpdated: new Date()
      })
      .where(eq(inventory.productName, change.productId));
  }

  private async syncOrderChange(change: any): Promise<void> {
    await db.update(clickCollectOrders)
      .set({
        status: change.status,
        updatedAt: new Date()
      })
      .where(eq(clickCollectOrders.id, parseInt(change.orderId)));
  }

  private async syncLocationChange(change: any): Promise<void> {
    // Handle location changes
    console.log('Location change synced:', change);
  }

  private startPeriodicSync(): void {
    // Sync with ERP every hour
    setInterval(() => {
      this.syncInventoryWithERP();
    }, 60 * 60 * 1000);

    // Sync WMS changes every 5 minutes
    setInterval(() => {
      this.syncWMSChanges();
    }, 5 * 60 * 1000);

    // Update logistics tracking every 10 minutes
    setInterval(() => {
      this.updateLogisticsTracking();
    }, 10 * 60 * 1000);
  }

  private async updateLogisticsTracking(): Promise<void> {
    try {
      // Get orders in transit
      const inTransitOrders = await db.select()
        .from(clickCollectOrders)
        .where(eq(clickCollectOrders.status, 'In Transit'));

      for (const order of inTransitOrders) {
        // In real implementation, this would use actual tracking numbers
        const mockTrackingNumber = `TRK-${order.id}`;
        const trackingData = await this.getLogisticsTracking(mockTrackingNumber);
        await this.updateOrderWithLogisticsStatus(order.id, trackingData);
      }
    } catch (error) {
      console.error('Error updating logistics tracking:', error);
    }
  }

  // Mock data generators
  private getMockERPProducts(): ERPProduct[] {
    return [
      {
        id: 'ERP-001',
        name: 'Laptop',
        sku: 'LAP-001',
        category: 'Electronics',
        supplier: 'TechCorp',
        cost: 800,
        price: 1200,
        minStock: 10,
        maxStock: 100,
        leadTime: 7
      },
      {
        id: 'ERP-002',
        name: 'Smartphone',
        sku: 'PHN-001',
        category: 'Electronics',
        supplier: 'MobileTech',
        cost: 400,
        price: 600,
        minStock: 20,
        maxStock: 150,
        leadTime: 5
      }
    ];
  }

  private getMockWeatherData(location: string): WeatherData {
    return {
      location,
      temperature: 22,
      humidity: 65,
      windSpeed: 15,
      windDirection: 180,
      precipitation: 0,
      visibility: 10,
      conditions: 'Clear',
      forecast: [
        {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          high: 25,
          low: 18,
          conditions: 'Partly Cloudy',
          precipitation: 20
        }
      ],
      alerts: []
    };
  }

  private getMockLogisticsTracking(trackingNumber: string): LogisticsTracking {
    return {
      trackingNumber,
      carrier: 'Mock Logistics',
      status: 'In Transit',
      location: 'Distribution Center',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          timestamp: new Date().toISOString(),
          location: 'Distribution Center',
          status: 'Package Received',
          description: 'Package received at distribution center'
        }
      ]
    };
  }

  private async getBaseRoute(origin: string, destination: string): Promise<any> {
    // Mock base route - in real implementation, this would use routing API
    return {
      origin,
      destination,
      distance: 25,
      duration: 45,
      waypoints: [
        { lat: 28.6139, lng: 77.2090 },
        { lat: 28.7041, lng: 77.1025 }
      ]
    };
  }

  private applyWeatherModifications(baseRoute: any, weatherImpact: any): any {
    return {
      ...baseRoute,
      modifiedDuration: Math.round(baseRoute.duration * weatherImpact.delayMultiplier),
      riskLevel: weatherImpact.riskLevel,
      recommendations: weatherImpact.recommendations,
      weatherModified: true
    };
  }

  // Add demo order sync for completeness
  public async syncOrdersWithERP(): Promise<void> {
    if (isDemoERP) {
      await erpSimulator.syncOrdersWithERP();
      return;
    }
    // Real implementation would go here
  }
}

export const externalIntegrations = new ExternalIntegrationsService(); 