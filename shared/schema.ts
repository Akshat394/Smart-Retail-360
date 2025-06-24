import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("viewer"), // admin, manager, operations, analyst, planner, viewer
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  licenseNumber: text("license_number").notNull().unique(),
  vehicleId: text("vehicle_id"),
  status: text("status").notNull().default("available"), // available, assigned, off_duty
  location: jsonb("location").$type<{ lat: number; lng: number } | null>(), // { lat, lng }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  driverId: integer("driver_id").references(() => drivers.id),
  vehicleId: text("vehicle_id"),
  destination: text("destination").notNull(),
  status: text("status").notNull().default("planned"), // planned, active, completed, cancelled
  optimizationMode: text("optimization_mode").notNull().default("balanced"), // fastest, eco, balanced
  estimatedTime: integer("estimated_time"), // minutes
  distance: real("distance"), // km
  fuelCost: real("fuel_cost"),
  co2Emission: real("co2_emission"),
  stops: integer("stops").default(0),
  optimizationSavings: real("optimization_savings"),
  coordinates: jsonb("coordinates"), // { lat, lng }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  reliability: real("reliability").notNull(), // 0-1
  leadTimeDays: integer("lead_time_days").notNull(),
  costFactor: real("cost_factor").notNull(),
  productIds: jsonb("product_ids").$type<number[]>(), // Array of product IDs supplied
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const insertDriverSchema = createInsertSchema(drivers, {
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectDriverSchema = createSelectSchema(drivers, {
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
});

export const selectRouteSchema = createSelectSchema(routes);
export const insertRouteSchema = createInsertSchema(routes, {
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  })
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
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

export const insertSupplierSchema = createInsertSchema(suppliers, {
  productIds: z.array(z.number()),
}).omit({
  id: true,
});

export const selectSupplierSchema = createSelectSchema(suppliers, {
  productIds: z.array(z.number()),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = z.infer<typeof selectDriverSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = z.infer<typeof selectSupplierSchema>;

export type IndianCity = { name: string; lat: number; lng: number };

// Types for Digital Twin Simulation

// Define parameter structures for each specific scenario
export type WeatherEventParams = {
  scenario: 'weather_event';
  parameters: {
    eventType: 'flood' | 'storm' | 'fog';
    city: 'Mumbai' | 'Chennai' | 'Kolkata' | 'Delhi';
    severity: 'low' | 'medium' | 'high';
  };
};

export type DemandSpikeParams = {
  scenario: 'demand_spike';
  parameters: {
    increasePercentage: number;
    duration: number;
    productCategory: 'Electronics' | 'Apparel' | 'Groceries' | 'Home Goods';
    region: 'Northeast' | 'South' | 'West' | 'Midwest';
  };
};

export type SupplierOutageParams = {
  scenario: 'supplier_outage';
  parameters: {
    supplierId: number;
    impactPercentage: number;
    duration: number;
  };
};

export type PeakSeasonParams = {
  scenario: 'peak_season';
  parameters: {
    increasePercentage: number;
    duration: number;
    preparationTime: number;
  };
};

// Create a discriminated union of all possible simulation parameter types
export type SimulationParams = WeatherEventParams | DemandSpikeParams | SupplierOutageParams | PeakSeasonParams;

export type SimulationReport = {
  summary: {
    scenario: string;
    description: string;
  };
  impact: {
    cost: {
      change: number;
      percentage: string;
    };
    sla: {
      total_delay_minutes: number;
      affected_routes: number;
    };
    carbon: {
      change_kg: number;
      percentage: string;
    };
    inventory: {
      stockout_risk_percentage: number;
      affected_products: number[];
    };
  };
  recommendations: {
    priority: 'High' | 'Medium' | 'Low';
    message: string;
  }[];
  details: {
    affectedRoutes: Partial<Route>[];
    reroutedPaths: any[]; // Define a more specific type for this
  };
};
