import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  location: text("location").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  forecastAccuracy: real("forecast_accuracy").notNull(),
  onTimeDelivery: real("on_time_delivery").notNull(),
  carbonFootprint: real("carbon_footprint").notNull(),
  inventoryTurnover: real("inventory_turnover").notNull(),
  activeOrders: integer("active_orders").notNull(),
  routesOptimized: integer("routes_optimized").notNull(),
  anomaliesDetected: integer("anomalies_detected").notNull(),
  costSavings: integer("cost_savings").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  lastUpdated: true,
});

export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
