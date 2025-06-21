import { 
  users, 
  inventory, 
  systemMetrics, 
  events,
  type User, 
  type InsertUser,
  type Inventory,
  type InsertInventory,
  type SystemMetrics,
  type InsertSystemMetrics,
  type Event,
  type InsertEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllInventory(): Promise<Inventory[]>;
  insertInventory(inventory: InsertInventory): Promise<Inventory>;
  getLatestMetrics(): Promise<SystemMetrics | undefined>;
  insertMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getRecentEvents(limit?: number): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
