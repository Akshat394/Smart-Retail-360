import { storage } from "./storage";

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