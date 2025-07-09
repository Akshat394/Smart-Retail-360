import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, varchar, index } from "drizzle-orm/pg-core";
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

export const clickCollectOrders = pgTable("click_collect_orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  location: text("location").notNull(),
  channel: text("channel").notNull().default("online"), // NEW: in-store, online, mobile, partner
  greenDelivery: boolean("green_delivery").notNull().default(false), // NEW: sustainability
  status: text("status").notNull().default("Pending"), // Pending, Ready, PickedUp, Cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  co2Emission: real("co2_emission").notNull().default(0), // Sustainability
  energyUsage: real("energy_usage").notNull().default(0), // Sustainability
  deliveryEfficiencyScore: real("delivery_efficiency_score").notNull().default(0), // Sustainability
});

export const warehouseTasks = pgTable("warehouse_tasks", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // Picking, Packing, Restocking
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("Pending"), // Pending, InProgress, Completed, Failed
  assignedRobot: text("assigned_robot"),
  warehouseLocation: text("warehouse_location").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const microFulfillmentCenters = pgTable("micro_fulfillment_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  capacity: integer("capacity").notNull(),
  stock: jsonb("stock").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerName: text("customer_name").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // e.g., 'OrderReady', 'OrderDelayed', 'OrderPickedUp'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  read: boolean("read").notNull().default(false),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contact: text("contact").notNull(),
  greenScore: integer("green_score").notNull().default(0), // Sustainability score
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const iotReadings = pgTable("iot_readings", {
  id: serial("id").primaryKey(),
  zone: varchar("zone", { length: 8 }).notNull(),
  temperature: real("temperature").notNull(),
  humidity: real("humidity").notNull(),
  vibration: real("vibration").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
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

export const insertClickCollectOrderSchema = createInsertSchema(clickCollectOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectClickCollectOrderSchema = createSelectSchema(clickCollectOrders);

export const insertWarehouseTaskSchema = createInsertSchema(warehouseTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectWarehouseTaskSchema = createSelectSchema(warehouseTasks);

export const insertMicroFulfillmentCenterSchema = createInsertSchema(microFulfillmentCenters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectMicroFulfillmentCenterSchema = createSelectSchema(microFulfillmentCenters);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const selectNotificationSchema = createSelectSchema(notifications);

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCustomerSchema = createSelectSchema(customers);

export const insertIotReadingSchema = createInsertSchema(iotReadings).omit({
  id: true,
  timestamp: true,
});

export const selectIotReadingSchema = createSelectSchema(iotReadings);

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
export type InsertClickCollectOrder = z.infer<typeof insertClickCollectOrderSchema>;
export type ClickCollectOrder = typeof clickCollectOrders.$inferSelect;
export type InsertWarehouseTask = z.infer<typeof insertWarehouseTaskSchema>;
export type WarehouseTask = typeof warehouseTasks.$inferSelect;
export type InsertMicroFulfillmentCenter = z.infer<typeof insertMicroFulfillmentCenterSchema>;
export type MicroFulfillmentCenter = typeof microFulfillmentCenters.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertIotReading = z.infer<typeof insertIotReadingSchema>;
export type IotReading = typeof iotReadings.$inferSelect;

export type IndianCity = { name: string; lat: number; lng: number };

export type DeliveryMode = 'truck' | 'autonomous' | 'drone';

// Types for Digital Twin Simulation

// Define parameter structures for each specific scenario
export type WeatherEventParams = {
  scenario: 'weather_event';
  parameters: {
    eventType: 'flood' | 'storm' | 'fog';
    city: 'Mumbai' | 'Chennai' | 'Kolkata' | 'Delhi';
    severity: 'low' | 'medium' | 'high';
    deliveryMode?: DeliveryMode;
  };
};

export type DemandSpikeParams = {
  scenario: 'demand_spike';
  parameters: {
    increasePercentage: number;
    duration: number;
    productCategory: 'Electronics' | 'Apparel' | 'Groceries' | 'Home Goods';
    region: 'Northeast' | 'South' | 'West' | 'Midwest';
    deliveryMode?: DeliveryMode;
  };
};

export type SupplierOutageParams = {
  scenario: 'supplier_outage';
  parameters: {
    supplierId: number;
    impactPercentage: number;
    duration: number;
    deliveryMode?: DeliveryMode;
  };
};

export type PeakSeasonParams = {
  scenario: 'peak_season';
  parameters: {
    increasePercentage: number;
    duration: number;
    preparationTime: number;
    deliveryMode?: DeliveryMode;
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
