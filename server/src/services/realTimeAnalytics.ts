import { WebSocket } from 'ws';
import { db } from '@server/utils/db';
import { inventory, clickCollectOrders, warehouseTasks, routes } from '@shared/schema';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';


export interface KPIMetrics {
  ordersInProgress: number;
  deliverySLA: number;
  co2Emissions: number;
  costSavings: number;
  inventoryTurnover: number;
  timestamp: string;
}

class RealTimeAnalyticsService {
  private clients: Set<WebSocket> = new Set();
  private kpiUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startKPIBroadcasting();
  }

  public addClient(client: WebSocket) {
    this.clients.add(client);
    // Send initial KPI data
    this.sendKPIData(client);
  }

  public removeClient(client: WebSocket) {
    this.clients.delete(client);
  }

  private async calculateInventoryTurnover(): Promise<number> {
    try {
      // Calculate inventory turnover rate: Cost of Goods Sold / Average Inventory
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total orders in last 30 days
      const recentOrders = await db
        .select({ totalQuantity: sql<number>`sum(${clickCollectOrders.quantity})` })
        .from(clickCollectOrders)
        .where(gte(clickCollectOrders.createdAt, thirtyDaysAgo));

      const totalSold = recentOrders[0]?.totalQuantity || 0;

      // Get average inventory
      const avgInventory = await db
        .select({ avgQuantity: sql<number>`avg(${inventory.quantity})` })
        .from(inventory);

      const averageInventory = avgInventory[0]?.avgQuantity || 1;

      return totalSold / averageInventory;
    } catch (error) {
      console.error('Error calculating inventory turnover:', error);
      return 0;
    }
  }

  private async calculateDeliverySLA(): Promise<number> {
    try {
      const recentOrders = await db
        .select()
        .from(clickCollectOrders)
        .where(eq(clickCollectOrders.status, 'PickedUp'))
        .orderBy(desc(clickCollectOrders.updatedAt))
        .limit(100);

      if (recentOrders.length === 0) return 0;

      let onTimeDeliveries = 0;
      const totalDeliveries = recentOrders.length;

      for (const order of recentOrders) {
        const createdAt = new Date(order.createdAt);
        const updatedAt = new Date(order.updatedAt);
        const deliveryTime = updatedAt.getTime() - createdAt.getTime();
        const deliveryHours = deliveryTime / (1000 * 60 * 60);

        // Assume SLA is 24 hours for standard delivery
        if (deliveryHours <= 24) {
          onTimeDeliveries++;
        }
      }

      return (onTimeDeliveries / totalDeliveries) * 100;
    } catch (error) {
      console.error('Error calculating delivery SLA:', error);
      return 0;
    }
  }

  private async calculateCO2Emissions(): Promise<number> {
    try {
      // Calculate CO2 emissions from recent deliveries
      const recentOrders = await db
        .select()
        .from(clickCollectOrders)
        .where(eq(clickCollectOrders.status, 'PickedUp'))
        .orderBy(desc(clickCollectOrders.updatedAt))
        .limit(50);

      let totalCO2 = 0;

      for (const order of recentOrders) {
        // Assume average delivery distance and CO2 per km
        const avgDistance = 15; // km
        const co2PerKm = 0.15; // kg CO2 per km
        totalCO2 += avgDistance * co2PerKm;
      }

      return totalCO2;
    } catch (error) {
      console.error('Error calculating CO2 emissions:', error);
      return 0;
    }
  }

  private async calculateCostSavings(): Promise<number> {
    try {
      // Calculate cost savings from route optimization
      const optimizedRoutes = await db
        .select()
        .from(routes)
        .where(eq(routes.status, 'completed'));

      let totalSavings = 0;

      for (const route of optimizedRoutes) {
        if (route.optimizationSavings && route.fuelCost) {
          totalSavings += route.fuelCost * route.optimizationSavings;
        }
      }

      return totalSavings;
    } catch (error) {
      console.error('Error calculating cost savings:', error);
      return 0;
    }
  }

  private async getOrdersInProgress(): Promise<number> {
    try {
      const pendingOrders = await db
        .select({ count: sql<number>`count(*)` })
        .from(clickCollectOrders)
        .where(eq(clickCollectOrders.status, 'Pending'));

      const readyOrders = await db
        .select({ count: sql<number>`count(*)` })
        .from(clickCollectOrders)
        .where(eq(clickCollectOrders.status, 'Ready'));

      return (pendingOrders[0]?.count || 0) + (readyOrders[0]?.count || 0);
    } catch (error) {
      console.error('Error getting orders in progress:', error);
      return 0;
    }
  }

  public async generateKPIMetrics(): Promise<KPIMetrics> {
    const [
      ordersInProgress,
      deliverySLA,
      co2Emissions,
      costSavings,
      inventoryTurnover
    ] = await Promise.all([
      this.getOrdersInProgress(),
      this.calculateDeliverySLA(),
      this.calculateCO2Emissions(),
      this.calculateCostSavings(),
      this.calculateInventoryTurnover()
    ]);

    return {
      ordersInProgress,
      deliverySLA,
      co2Emissions,
      costSavings,
      inventoryTurnover,
      timestamp: new Date().toISOString()
    };
  }

  private async sendKPIData(client: WebSocket) {
    try {
      const kpiData = await this.generateKPIMetrics();
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'kpi_update',
          data: kpiData,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error sending KPI data:', error);
    }
  }

  private async broadcastKPIData() {
    const kpiData = await this.generateKPIMetrics();
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'kpi_update',
          data: kpiData,
          timestamp: new Date().toISOString()
        }));
      }
    });
  }

  private startKPIBroadcasting() {
    // Broadcast KPI data every 10 seconds
    this.kpiUpdateInterval = setInterval(() => {
      this.broadcastKPIData();
    }, 10000);
  }

  public stop() {
    if (this.kpiUpdateInterval) {
      clearInterval(this.kpiUpdateInterval);
    }
  }
}

export const realTimeAnalytics = new RealTimeAnalyticsService(); 