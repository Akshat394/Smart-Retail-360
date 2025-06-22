import { storage } from "./storage";
import { db } from './db';
import { routes } from '../shared/schema';
import { eq } from "drizzle-orm";

// List of real Indian cities with coordinates
export const INDIAN_CITIES = [
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
  { name: 'Nashik', lat: 19.9975, lng: 73.7898 }
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
  // Add more connections as needed
};

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

// Function to start the demo data generator
export function startDemoDataGenerator() {
  // Insert initial metrics
  insertDemoMetrics();
  
  // Insert new metrics every 10 seconds
  setInterval(() => {
    insertDemoMetrics();
  }, 10000);
  
  console.log('Demo data generator started - inserting metrics every 10 seconds');
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