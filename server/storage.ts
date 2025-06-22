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
  type InsertEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data';

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
  insertInventory(inventory: InsertInventory): Promise<Inventory>;
  getLatestMetrics(): Promise<SystemMetrics | undefined>;
  insertMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getRecentEvents(limit?: number): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;
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
