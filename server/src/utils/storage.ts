import { 
  users, 
  drivers,
  routes,
  userSessions,
  inventory, 
  systemMetrics, 
  events,
  type User, 
  type InsertUser,
  type LoginUser,
  type Driver,
  type InsertDriver,
  type Route,
  type InsertRoute,
  type UserSession,
  type Inventory,
  type InsertInventory,
  type SystemMetrics,
  type InsertSystemMetrics,
  type Event,
  type InsertEvent,
  type InsertSupplier,
  type Supplier,
  suppliers
} from "@shared/schema";
import { suppliers as suppliersSchema } from '../../../shared/schema';
import { db } from "./db";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data.js';
import { clickCollectOrders, type InsertClickCollectOrder, type ClickCollectOrder } from '../../../shared/schema';
import { warehouseTasks, type InsertWarehouseTask, type WarehouseTask } from '../../../shared/schema';
import { microFulfillmentCenters, type InsertMicroFulfillmentCenter, type MicroFulfillmentCenter } from '../../../shared/schema';
import { notifications, type InsertNotification, type Notification } from '../../../shared/schema';
import { customers, type InsertCustomer, type Customer } from '../../../shared/schema';

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(credentials: LoginUser): Promise<{ user: User; sessionToken: string } | null>;
  validateSession(sessionToken: string): Promise<User | null>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Driver management
  getAllDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, updates: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: number): Promise<boolean>;
  
  // Route management
  getAllRoutes(): Promise<(Route & { driverName: string | null })[]>;
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, updates: Partial<InsertRoute>): Promise<Route | undefined>;
  deleteRoute(id: number): Promise<boolean>;
  getRoutesByDriver(driverId: number): Promise<Route[]>;
  
  // Existing methods
  getAllInventory(): Promise<Inventory[]>;
  getInventoryForProducts(productIds: number[]): Promise<Inventory[]>;
  insertInventory(inventory: InsertInventory): Promise<Inventory>;
  getLatestMetrics(): Promise<SystemMetrics | undefined>;
  insertMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getRecentEvents(limit?: number): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;

  // Supplier management
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  getRecentMetrics(limit?: number): Promise<SystemMetrics[]>;

  // Click-and-Collect Orders
  getAllClickCollectOrders(channel?: string): Promise<ClickCollectOrder[]>;
  getClickCollectOrder(id: number): Promise<ClickCollectOrder | undefined>;
  createClickCollectOrder(order: InsertClickCollectOrder): Promise<ClickCollectOrder>;
  updateClickCollectOrder(id: number, updates: Partial<InsertClickCollectOrder>): Promise<ClickCollectOrder | undefined>;
  deleteClickCollectOrder(id: number): Promise<boolean>;

  // Warehouse Automation Tasks
  getAllWarehouseTasks(): Promise<WarehouseTask[]>;
  getWarehouseTask(id: number): Promise<WarehouseTask | undefined>;
  createWarehouseTask(task: InsertWarehouseTask): Promise<WarehouseTask>;
  updateWarehouseTask(id: number, updates: Partial<InsertWarehouseTask>): Promise<WarehouseTask | undefined>;
  deleteWarehouseTask(id: number): Promise<boolean>;

  // Micro-Fulfillment Centers
  getAllMicroFulfillmentCenters(): Promise<MicroFulfillmentCenter[]>;
  getMicroFulfillmentCenter(id: number): Promise<MicroFulfillmentCenter | undefined>;
  createMicroFulfillmentCenter(center: InsertMicroFulfillmentCenter): Promise<MicroFulfillmentCenter>;
  updateMicroFulfillmentCenter(id: number, updates: Partial<InsertMicroFulfillmentCenter>): Promise<MicroFulfillmentCenter | undefined>;
  deleteMicroFulfillmentCenter(id: number): Promise<boolean>;

  // Notifications
  getNotificationsByCustomer(customerName: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification | undefined>;

  // Customer management
  getAllCustomers(): Promise<Customer[]>;
  getCustomerByName(name: string): Promise<Customer | undefined>;
  updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async authenticateUser(credentials: LoginUser): Promise<{ user: User; sessionToken: string } | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, credentials.username), eq(users.isActive, true)));

    if (!user || !await bcrypt.compare(credentials.password, user.password)) {
      return null;
    }

    // Create session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken,
      expiresAt,
    });

    await this.updateUserLastLogin(user.id);

    return { user, sessionToken };
  }

  async validateSession(sessionToken: string): Promise<User | null> {
    const [session] = await db
      .select({
        user: users,
        session: userSessions,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(
        eq(userSessions.sessionToken, sessionToken),
        sql`${userSessions.expiresAt} > NOW()`,
        eq(users.isActive, true)
      ));

    return session?.user || null;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Driver management
  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriver(id: number, updates: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async deleteDriver(id: number): Promise<boolean> {
    const result = await db.delete(drivers).where(eq(drivers.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Route management
  async getAllRoutes(): Promise<(Route & { driverName: string | null })[]> {
    const result = await db
      .select({
        id: routes.id,
        routeId: routes.routeId,
        driverId: routes.driverId,
        vehicleId: routes.vehicleId,
        destination: routes.destination,
        status: routes.status,
        optimizationMode: routes.optimizationMode,
        estimatedTime: routes.estimatedTime,
        distance: routes.distance,
        fuelCost: routes.fuelCost,
        co2Emission: routes.co2Emission,
        stops: routes.stops,
        optimizationSavings: routes.optimizationSavings,
        coordinates: routes.coordinates,
        createdAt: routes.createdAt,
        updatedAt: routes.updatedAt,
        driverName: drivers.name,
      })
      .from(routes)
      .leftJoin(drivers, eq(routes.driverId, drivers.id))
      .orderBy(desc(routes.createdAt));
    
    return result.map(r => ({
      ...r,
    }));
  }

  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route || undefined;
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    // Auto-calculate route metrics if not provided
    const routeData = {
      ...insertRoute,
      estimatedTime: insertRoute.estimatedTime || Math.floor(Math.random() * 60 + 30),
      distance: insertRoute.distance || Math.random() * 50 + 10,
      fuelCost: insertRoute.fuelCost || Math.random() * 30 + 10,
      co2Emission: insertRoute.co2Emission || Math.random() * 20 + 5,
      optimizationSavings: insertRoute.optimizationSavings || Math.random() * 0.3 + 0.1,
    };

    const [route] = await db
      .insert(routes)
      .values(routeData)
      .returning();
    return route;
  }

  async updateRoute(id: number, updates: Partial<InsertRoute>): Promise<Route | undefined> {
    const [route] = await db
      .update(routes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(routes.id, id))
      .returning();
    return route || undefined;
  }

  async deleteRoute(id: number): Promise<boolean> {
    const result = await db.delete(routes).where(eq(routes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getRoutesByDriver(driverId: number): Promise<Route[]> {
    return await db
      .select()
      .from(routes)
      .where(eq(routes.driverId, driverId))
      .orderBy(desc(routes.createdAt));
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.lastUpdated));
  }

  async getInventoryForProducts(productIds: number[]): Promise<Inventory[]> {
    if (productIds.length === 0) {
      return [];
    }
    return await db.select().from(inventory).where(inArray(inventory.id, productIds));
  }

  async insertInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const [newInventory] = await db
      .insert(inventory)
      .values(insertInventory)
      .returning();
    return newInventory;
  }

  async getLatestMetrics(): Promise<SystemMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(systemMetrics)
      .orderBy(desc(systemMetrics.timestamp))
      .limit(1);
    return metrics || undefined;
  }

  async insertMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const [metrics] = await db
      .insert(systemMetrics)
      .values(insertMetrics)
      .returning();
    return metrics;
  }

  async getRecentEvents(limit: number = 10): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .orderBy(desc(events.timestamp))
      .limit(limit);
  }

  async insertEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  // Supplier management
  async getAllSuppliers(): Promise<Supplier[]> {
    const rows = await db.select().from(suppliersSchema);
    return rows.map(s => ({ ...s, productIds: s.productIds ?? [] }));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliersSchema).where(eq(suppliersSchema.id, id));
    return supplier ? { ...supplier, productIds: supplier.productIds ?? [] } : undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliersSchema)
      .values(insertSupplier)
      .returning();
    return { ...supplier, productIds: supplier.productIds ?? [] };
  }

  async updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliersSchema)
      .set(updates)
      .where(eq(suppliersSchema.id, id))
      .returning();
    return supplier ? { ...supplier, productIds: supplier.productIds ?? [] } : undefined;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliersSchema).where(eq(suppliersSchema.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getRecentMetrics(limit: number = 20): Promise<SystemMetrics[]> {
    return await db
      .select()
      .from(systemMetrics)
      .orderBy(desc(systemMetrics.timestamp))
      .limit(limit);
  }

  // Click-and-Collect Orders
  async getAllClickCollectOrders(channel?: string): Promise<ClickCollectOrder[]> {
    let query = db.select().from(clickCollectOrders).orderBy(desc(clickCollectOrders.createdAt));
    if (channel) {
      // @ts-ignore
      query = query.where(eq(clickCollectOrders.channel, channel));
    }
    return await query;
  }

  async getClickCollectOrder(id: number): Promise<ClickCollectOrder | undefined> {
    const [order] = await db.select().from(clickCollectOrders).where(eq(clickCollectOrders.id, id));
    return order || undefined;
  }

  async createClickCollectOrder(order: InsertClickCollectOrder): Promise<ClickCollectOrder> {
    const [newOrder] = await db.insert(clickCollectOrders).values(order).returning();
    return newOrder;
  }

  async updateClickCollectOrder(id: number, updates: Partial<InsertClickCollectOrder>): Promise<ClickCollectOrder | undefined> {
    const [order] = await db.update(clickCollectOrders).set({ ...updates, updatedAt: new Date() }).where(eq(clickCollectOrders.id, id)).returning();
    return order || undefined;
  }

  async deleteClickCollectOrder(id: number): Promise<boolean> {
    const result = await db.delete(clickCollectOrders).where(eq(clickCollectOrders.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Warehouse Automation Tasks
  async getAllWarehouseTasks(): Promise<WarehouseTask[]> {
    return await db.select().from(warehouseTasks).orderBy(desc(warehouseTasks.createdAt));
  }

  async getWarehouseTask(id: number): Promise<WarehouseTask | undefined> {
    const [task] = await db.select().from(warehouseTasks).where(eq(warehouseTasks.id, id));
    return task || undefined;
  }

  async createWarehouseTask(task: InsertWarehouseTask): Promise<WarehouseTask> {
    const [newTask] = await db.insert(warehouseTasks).values(task).returning();
    return newTask;
  }

  async updateWarehouseTask(id: number, updates: Partial<InsertWarehouseTask>): Promise<WarehouseTask | undefined> {
    const [task] = await db.update(warehouseTasks).set({ ...updates, updatedAt: new Date() }).where(eq(warehouseTasks.id, id)).returning();
    return task || undefined;
  }

  async deleteWarehouseTask(id: number): Promise<boolean> {
    const result = await db.delete(warehouseTasks).where(eq(warehouseTasks.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Micro-Fulfillment Centers
  async getAllMicroFulfillmentCenters(): Promise<MicroFulfillmentCenter[]> {
    return await db.select().from(microFulfillmentCenters).orderBy(desc(microFulfillmentCenters.createdAt));
  }

  async getMicroFulfillmentCenter(id: number): Promise<MicroFulfillmentCenter | undefined> {
    const [center] = await db.select().from(microFulfillmentCenters).where(eq(microFulfillmentCenters.id, id));
    return center || undefined;
  }

  async createMicroFulfillmentCenter(center: InsertMicroFulfillmentCenter): Promise<MicroFulfillmentCenter> {
    const [newCenter] = await db.insert(microFulfillmentCenters).values(center).returning();
    return newCenter;
  }

  async updateMicroFulfillmentCenter(id: number, updates: Partial<InsertMicroFulfillmentCenter>): Promise<MicroFulfillmentCenter | undefined> {
    const [center] = await db.update(microFulfillmentCenters).set({ ...updates, updatedAt: new Date() }).where(eq(microFulfillmentCenters.id, id)).returning();
    return center || undefined;
  }

  async deleteMicroFulfillmentCenter(id: number): Promise<boolean> {
    const result = await db.delete(microFulfillmentCenters).where(eq(microFulfillmentCenters.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Notifications
  async getNotificationsByCustomer(customerName: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.customerName, customerName)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: number): Promise<Notification | undefined> {
    const [notif] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return notif || undefined;
  }

  // Customer management
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.greenScore));
  }

  async getCustomerByName(name: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.name, name));
    return customer || undefined;
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers).set({ ...updates, updatedAt: new Date() }).where(eq(customers.id, id)).returning();
    return customer || undefined;
  }
}

export const storage = new DatabaseStorage();

// Dijkstra's algorithm for shortest path in the city graph
export function dijkstraShortestPath(graph: Record<string, { to: string; distance: number }[]>, start: string, end: string): { path: string[]; distance: number } {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const queue: [string, number][] = [];

  for (const node in graph) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[start] = 0;
  queue.push([start, 0]);

  while (queue.length > 0) {
    // Get node with smallest distance
    queue.sort((a, b) => a[1] - b[1]);
    const [current, currDist] = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === end) break;
    for (const neighbor of graph[current] || []) {
      const alt = currDist + neighbor.distance;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        prev[neighbor.to] = current;
        queue.push([neighbor.to, alt]);
      }
    }
  }
  // Reconstruct path
  const path: string[] = [];
  let u: string | null = end;
  while (u) {
    path.unshift(u);
    u = prev[u];
  }
  return { path, distance: distances[end] };
}
