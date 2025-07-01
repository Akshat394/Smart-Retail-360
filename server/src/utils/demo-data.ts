import { storage } from "./storage.js";
import { db } from './db.js';
import { routes, type IndianCity, suppliers, inventory as inventoryTable } from '../../../shared/schema';
import { eq, sql } from "drizzle-orm";
import { faker } from '@faker-js/faker';

// List of real Indian cities with coordinates
export const INDIAN_CITIES: ReadonlyArray<IndianCity> = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376 },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
  { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538 },
  { name: 'Ludhiana', lat: 30.9005, lng: 75.8573 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
  { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
];

// New Delhi HQ coordinates
const HQ = { name: 'New Delhi', lat: 28.6139, lng: 77.2090 };

// Static graph of Indian cities with distances (in km)
// For demo, only connect some major cities directly
export const INDIAN_CITY_GRAPH: Record<string, { to: string; distance: number }[]> = {
  'New Delhi': [
    { to: 'Jaipur', distance: 280 },
    { to: 'Lucknow', distance: 555 },
    { to: 'Agra', distance: 233 },
    { to: 'Ghaziabad', distance: 30 },
    { to: 'Kanpur', distance: 440 },
    { to: 'Ludhiana', distance: 310 },
  ],
  'Jaipur': [
    { to: 'New Delhi', distance: 280 },
    { to: 'Ahmedabad', distance: 675 },
    { to: 'Agra', distance: 238 },
  ],
  'Lucknow': [
    { to: 'New Delhi', distance: 555 },
    { to: 'Kanpur', distance: 90 },
    { to: 'Patna', distance: 530 },
  ],
  'Agra': [
    { to: 'New Delhi', distance: 233 },
    { to: 'Jaipur', distance: 238 },
    { to: 'Kanpur', distance: 285 },
  ],
  'Kanpur': [
    { to: 'New Delhi', distance: 440 },
    { to: 'Lucknow', distance: 90 },
    { to: 'Agra', distance: 285 },
    { to: 'Patna', distance: 600 },
  ],
  'Ahmedabad': [
    { to: 'Jaipur', distance: 675 },
    { to: 'Mumbai', distance: 530 },
    { to: 'Surat', distance: 270 },
    { to: 'Vadodara', distance: 110 },
  ],
  'Mumbai': [
    { to: 'Ahmedabad', distance: 530 },
    { to: 'Pune', distance: 150 },
    { to: 'Surat', distance: 280 },
    { to: 'Nashik', distance: 170 },
  ],
  'Pune': [
    { to: 'Mumbai', distance: 150 },
    { to: 'Hyderabad', distance: 560 },
    { to: 'Nashik', distance: 210 },
  ],
  'Hyderabad': [
    { to: 'Pune', distance: 560 },
    { to: 'Bangalore', distance: 570 },
    { to: 'Chennai', distance: 630 },
    { to: 'Nagpur', distance: 500 },
  ],
  'Bangalore': [
    { to: 'Hyderabad', distance: 570 },
    { to: 'Chennai', distance: 350 },
    { to: 'Indore', distance: 1200 },
  ],
  'Chennai': [
    { to: 'Bangalore', distance: 350 },
    { to: 'Hyderabad', distance: 630 },
    { to: 'Kolkata', distance: 1670 },
  ],
  'Kolkata': [
    { to: 'Chennai', distance: 1670 },
    { to: 'Patna', distance: 580 },
  ],
  'Patna': [
    { to: 'Lucknow', distance: 530 },
    { to: 'Kanpur', distance: 600 },
    { to: 'Kolkata', distance: 580 },
  ],
  'Surat': [
    { to: 'Mumbai', distance: 280 },
    { to: 'Ahmedabad', distance: 270 },
    { to: 'Vadodara', distance: 140 },
  ],
  'Vadodara': [
    { to: 'Ahmedabad', distance: 110 },
    { to: 'Surat', distance: 140 },
  ],
  'Nashik': [
    { to: 'Mumbai', distance: 170 },
    { to: 'Pune', distance: 210 },
  ],
  'Ludhiana': [
    { to: 'New Delhi', distance: 310 },
  ],
  'Nagpur': [
    { to: 'Hyderabad', distance: 500 },
    { to: 'Indore', distance: 450 },
    { to: 'Bhopal', distance: 350 },
  ],
  'Indore': [
    { to: 'Nagpur', distance: 450 },
    { to: 'Bhopal', distance: 190 },
    { to: 'Bangalore', distance: 1200 },
  ],
  'Bhopal': [
    { to: 'Indore', distance: 190 },
    { to: 'Nagpur', distance: 350 },
  ],
  'Varanasi': [
    { to: 'Lucknow', distance: 320 },
  ],
  // Add more connections as needed
};

const walmartProductCatalog = {
  "Grocery & Beverages": {
    brands: ["Great Value", "Sam's Choice", "Bettergoods", "Clear American", "Oak Leaf"],
    products: ["Soda", "Chips", "Organic Pasta", "Premium Coffee", "Sparkling Water", "Red Wine"],
  },
  "Home & Kitchen": {
    brands: ["Mainstays", "Better Homes & Gardens", "Hometrends", "Allswell"],
    products: ["Towel Set", "Lava Lamp", "Cookware", "Bedding", "Storage Bins", "Memory Foam Mattress"],
  },
  "Health & Beauty": {
    brands: ["Equate"],
    products: ["Lotion", "OTC Meds", "Skincare", "Cosmetics", "Grooming Tools", "Supplements"],
  },
  "Electronics": {
    brands: ["onn."],
    products: ["4K TV", "Gaming Laptop", "Tablet", "Bluetooth Speaker", "Fitness Tracker"],
  },
  "Clothing & Apparel": {
    brands: ["George", "Time and Tru", "Terra & Sky", "No Boundaries", "Athletic Works", "Joyspun"],
    products: ["T-Shirt", "Jeans", "Plus-Size Top", "Graphic Tee", "Activewear Shorts", "Pajama Set"],
  },
  "Baby & Kids": {
    brands: ["Parent's Choice", "Wonder Nation"],
    products: ["Diapers", "Baby Formula", "Kids T-Shirt", "Stroller", "Nursery Furniture"],
  },
  "Household Essentials": {
    brands: ["Great Value"],
    products: ["Paper Towels", "Cleaning Spray", "Pest Control", "Food Storage Bags"],
  },
  "Toys & Games": {
    brands: ["Adventure Force"],
    products: ["Action Figure", "Board Game", "Kids Bike", "500-Piece Puzzle", "RC Car"],
  },
  "Sports, Fitness & Outdoors": {
    brands: ["Athletic Works"],
    products: ["Dumbbells", "Yoga Mat", "Camping Tent", "Fishing Rod", "Basketball"],
  },
  "Automotive & Tools": {
    brands: ["Hyper Tough"],
    products: ["Motor Oil", "Car Battery", "Wrench Set", "Power Drill", "Tire Repair Kit"],
  },
  "Pet Supplies": {
    brands: ["Ol' Roy", "Special Kitty"],
    products: ["Dog Food", "Cat Litter", "Pet Shampoo", "Chew Toys", "Cat Tree"],
  },
  "Office & School Supplies": {
    brands: ["Pen+Gear"],
    products: ["Notebook", "Printer Paper", "Backpack", "Sticky Notes", "Ballpoint Pens"],
  },
  "Garden & Outdoor Living": {
    brands: ["Expert Grill", "Mainstays"],
    products: ["Patio Chair", "Gardening Tools", "Charcoal Grill", "Flower Pot", "Outdoor String Lights"],
  },
};
type Category = keyof typeof walmartProductCatalog;

// Function to insert demo metrics for testing real-time updates
export async function insertDemoMetrics() {
  const metrics = {
    forecastAccuracy: Math.max(80, Math.min(95, 87.4 + (Math.random() - 0.5) * 2)),
    onTimeDelivery: Math.max(90, Math.min(98, 94.2 + (Math.random() - 0.5) * 1)),
    carbonFootprint: Math.max(2.0, Math.min(4.0, 2.8 + (Math.random() - 0.5) * 0.5)),
    inventoryTurnover: Math.max(10, Math.min(15, 12.3 + (Math.random() - 0.5) * 1)),
    activeOrders: Math.max(1500, Math.min(2000, 1847 + Math.floor((Math.random() - 0.5) * 50))),
    routesOptimized: Math.max(300, Math.min(400, 342 + Math.floor(Math.random() * 5))),
    anomaliesDetected: Math.max(0, Math.min(10, 3 + Math.floor((Math.random() - 0.5) * 2))),
    costSavings: Math.max(250000, Math.min(350000, 284750 + Math.floor((Math.random() - 0.5) * 5000)))
  };

  try {
    await storage.insertMetrics(metrics);
    console.log('Demo metrics inserted:', metrics);
  } catch (error) {
    console.error('Failed to insert demo metrics:', error);
  }
}

// Function to randomly update inventory quantities for real-time simulation
export async function simulateInventoryChanges() {
  // Fetch all inventory items
  const allInventory = await storage.getAllInventory();
  for (const item of allInventory) {
    // Randomly decide to simulate a sale, restock, or transfer
    const action = Math.random();
    let newQuantity = item.quantity;
    if (action < 0.6) {
      // Simulate sale (reduce quantity)
      newQuantity = Math.max(0, item.quantity - Math.floor(Math.random() * 10));
    } else if (action < 0.9) {
      // Simulate restock (increase quantity)
      newQuantity = item.quantity + Math.floor(Math.random() * 20);
    } else {
      // Simulate transfer (randomly increase or decrease)
      newQuantity = Math.max(0, item.quantity + Math.floor(Math.random() * 15) - 7);
    }
    if (newQuantity !== item.quantity) {
      await db.update(inventoryTable)
        .set({ quantity: newQuantity, lastUpdated: new Date() })
        .where(eq(inventoryTable.id, item.id));
    }
  }
  // Notify listeners (WebSocket) of inventory update
  // Only send a small payload to avoid exceeding NOTIFY size limit
  const notificationPayload = JSON.stringify({ type: 'inventory_update' });
  await db.execute(`NOTIFY data_updates, '${notificationPayload}'`);
}

// Function to start the demo data generator
export function startDemoDataGenerator() {
  // Insert initial metrics
  insertDemoMetrics();
  simulateInventoryChanges();
  
  // Insert new metrics and simulate inventory every 10 seconds
  setInterval(() => {
    insertDemoMetrics();
    simulateInventoryChanges();
  }, 10000);
  
  console.log('Demo data generator started - inserting metrics and simulating inventory every 10 seconds');
}

export async function seedRoutesWithIndianCities() {
  for (const city of INDIAN_CITIES) {
    // Check if route already exists for this destination
    const existing = await db.query.routes.findFirst({
      where: eq(routes.destination, city.name)
    });
    if (!existing) {
      await db.insert(routes).values({
        routeId: `ROUTE-${city.name.replace(/\s/g, '').toUpperCase()}`,
        destination: city.name,
        coordinates: { lat: city.lat, lng: city.lng },
        status: 'active',
        optimizationMode: 'balanced',
        estimatedTime: Math.floor(Math.random() * 60 + 30),
        distance: Math.floor(Math.random() * 1500 + 200), // random km
        fuelCost: Math.random() * 100 + 50,
        co2Emission: Math.random() * 50 + 10,
        stops: Math.floor(Math.random() * 5 + 1),
        optimizationSavings: Math.random() * 0.3 + 0.1,
        vehicleId: null,
        driverId: null
      });
    }
  }
  console.log('Seeded routes with real Indian cities.');
}

export const MOCK_SUPPLIERS = [
  { id: 1, name: 'Global Electronics Inc.', productIds: [101, 102, 105], reliability: 0.98, leadTimeDays: 14, costFactor: 1.0 },
  { id: 2, name: 'Fashion Forward Fabrics', productIds: [201, 202, 203], reliability: 0.95, leadTimeDays: 20, costFactor: 1.0 },
  { id: 3, name: 'Fresh Produce Partners', productIds: [301, 302, 303, 304], reliability: 0.99, leadTimeDays: 2, costFactor: 1.0 },
  { id: 4, name: 'Home Essentials Co.', productIds: [401, 402, 403], reliability: 0.97, leadTimeDays: 25, costFactor: 1.0 },
  { id: 5, name: 'Backup Electronics Ltd.', productIds: [101, 102, 105], reliability: 0.92, leadTimeDays: 10, costFactor: 1.3 }, // more expensive backup
];

export const MOCK_PRODUCT_INVENTORY = [
  { id: 101, name: 'Laptop', category: 'Electronics', dailyConsumption: 50, stock: 2000 },
  { id: 102, name: 'Smartphone', category: 'Electronics', dailyConsumption: 150, stock: 5000 },
  { id: 201, name: 'T-Shirt', category: 'Apparel', dailyConsumption: 300, stock: 10000 },
  { id: 301, name: 'Apples', category: 'Groceries', dailyConsumption: 1000, stock: 7000 },
  { id: 401, name: 'Desk Chair', category: 'Home Goods', dailyConsumption: 30, stock: 1000 },
];

export async function seedSuppliers() {
  const demoSuppliers = [
    { name: 'Global Electronics Inc.', reliability: 0.98, leadTimeDays: 14, costFactor: 1.0, productIds: [101, 102, 105] },
    { name: 'Fashion Forward Fabrics', reliability: 0.95, leadTimeDays: 20, costFactor: 1.0, productIds: [201, 202, 203] },
    { name: 'Fresh Produce Partners', reliability: 0.99, leadTimeDays: 2, costFactor: 1.0, productIds: [301, 302, 303, 304] },
    { name: 'Home Essentials Co.', reliability: 0.97, leadTimeDays: 25, costFactor: 1.0, productIds: [401, 402, 403] },
    { name: 'Backup Electronics Ltd.', reliability: 0.92, leadTimeDays: 10, costFactor: 1.3, productIds: [101, 102, 105] },
  ];
  for (const s of demoSuppliers) {
    const exists = await db.query.suppliers.findFirst({ where: eq(suppliers.name, s.name) });
    if (!exists) {
      await db.insert(suppliers).values(s);
    }
  }
  console.log('Seeded suppliers table with demo data.');
}

// Function to seed initial product and inventory data
export async function seedInitialInventory() {
  console.log('Checking for existing inventory...');
  const existingInventory = await storage.getAllInventory();
  if (existingInventory.length > 0) {
    console.log('Inventory already exists, skipping seeding.');
    return;
  }
  
  console.log('Seeding initial Walmart product and inventory data...');
  const categories = Object.keys(walmartProductCatalog) as Category[];
  const allSuppliers = await storage.getAllSuppliers();
  if (allSuppliers.length === 0) {
    console.error("No suppliers found. Please seed suppliers before seeding inventory.");
    return;
  }

  const inventoryItems = [];
  for (let i = 0; i < 200; i++) {
    const category = categories[i % categories.length];
    const catalogEntry = walmartProductCatalog[category];
    const brand = catalogEntry.brands[i % catalogEntry.brands.length];
    const product = catalogEntry.products[i % catalogEntry.products.length];
    const productName = `${brand} ${product}`;
    const city = INDIAN_CITIES[i % INDIAN_CITIES.length];

    inventoryItems.push({
      productName,
      category,
      quantity: Math.floor(Math.random() * 250),
      location: city.name,
      supplierId: allSuppliers[i % allSuppliers.length].id,
      lastUpdated: new Date(),
    });
  }

  try {
    // Drizzle doesn't have an easy "insert or ignore", so we just insert.
    await db.insert(inventoryTable).values(inventoryItems);
    console.log(`Seeded ${inventoryItems.length} inventory items.`);
  } catch (error) {
    console.error('Error seeding inventory data:', error);
  }
}

export async function seedDatabase() {
  await seedRoutesWithIndianCities();
  await seedSuppliers();
  await seedInitialInventory();
}

// Call this function when the server starts
// seedDatabase();

if (process.argv.includes('--seed-suppliers')) {
  seedSuppliers().then(() => process.exit(0));
}

export function generateSuppliers(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: faker.company.name(),
    productIds: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.number.int({ min: 100, max: 999 })),
    reliability: faker.number.float({ min: 0.9, max: 1, fractionDigits: 2 }),
    leadTimeDays: faker.number.int({ min: 2, max: 30 }),
    costFactor: faker.number.float({ min: 1, max: 1.5, fractionDigits: 2 })
  }));
}

export function generateInventory(count = 200, suppliers = generateSuppliers()) {
  return Array.from({ length: count }, (_, i) => {
    const supplier = suppliers[faker.number.int({ min: 0, max: suppliers.length - 1 })];
    return {
      id: i + 1,
      productName: faker.commerce.productName(),
      category: faker.commerce.department(),
      quantity: faker.number.int({ min: 0, max: 250 }),
      location: faker.location.city(),
      supplierId: supplier.id,
      lastUpdated: faker.date.recent(),
    };
  });
}

export function generateMetrics() {
  return {
    forecastAccuracy: faker.number.float({ min: 80, max: 95, fractionDigits: 2 }),
    onTimeDelivery: faker.number.float({ min: 90, max: 98, fractionDigits: 2 }),
    carbonFootprint: faker.number.float({ min: 2, max: 4, fractionDigits: 2 }),
    inventoryTurnover: faker.number.float({ min: 10, max: 15, fractionDigits: 2 }),
    activeOrders: faker.number.int({ min: 1500, max: 2000 }),
    routesOptimized: faker.number.int({ min: 300, max: 400 }),
    anomaliesDetected: faker.number.int({ min: 0, max: 10 }),
    costSavings: faker.number.int({ min: 250000, max: 350000 })
  };
}