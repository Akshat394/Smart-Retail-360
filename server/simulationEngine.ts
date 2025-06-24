import {
  type SimulationParams,
  type SimulationReport,
  type Route,
} from '@shared/schema';
import { storage, dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES, MOCK_PRODUCT_INVENTORY } from './demo-data';
import type { WeatherEventParams, DemandSpikeParams, SupplierOutageParams } from "@shared/schema";

// Define realistic impact factors for various simulation scenarios.
// These values help translate qualitative severity into quantitative impact.
const IMPACT_FACTORS = {
  weather: {
    // For 'flood', value represents the percentage of roads considered impassable.
    flood: { low: 0.4, medium: 0.7, high: 1.0 },
    // For 'storm', value is a speed multiplier for affected routes.
    storm: { low: 0.7, medium: 0.5, high: 0.3 },
    // For 'fog', value is a visibility-based speed multiplier.
    fog: { low: 0.8, medium: 0.6, high: 0.4 },
  },
  supplier_outage: {
    // Percentage of supply reduction from a given supplier
    low: 0.25,
    medium: 0.5,
    high: 0.9,
  }
};

// Define a helper function to calculate distance between two lat-lng points (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Mock data for relationships not yet in the DB schema.
// This allows for more realistic simulations.
const MOCK_INVENTORY_DATA = {
  // productId: { daily_consumption, supplierId }
  101: { daily_consumption: 20, supplierId: 1 },
  102: { daily_consumption: 30, supplierId: 1 },
  105: { daily_consumption: 15, supplierId: 2 },
  201: { daily_consumption: 50, supplierId: 2 },
  202: { daily_consumption: 25, supplierId: 3 },
};

const MOCK_SUPPLIER_DATA = {
  1: { name: 'Supplier Alpha', backupSupplierId: 2 },
  2: { name: 'Supplier Beta', backupSupplierId: 3 },
  3: { name: 'Supplier Gamma', backupSupplierId: 1 },
};

// --- Helper Functions ---
function cloneGraph(graph: typeof INDIAN_CITY_GRAPH): typeof INDIAN_CITY_GRAPH {
  return JSON.parse(JSON.stringify(graph));
}

const VEHICLE_SPEED_KMPH = 60;
const FUEL_COST_PER_KM = 0.15; // USD
const CO2_EMISSION_G_PER_KM = 180;
const DAILY_OPERATIONAL_COST = 200; // Per vehicle

function calculateRouteMetrics(distance: number) {
  const durationMinutes = (distance / VEHICLE_SPEED_KMPH) * 60;
  const fuelCost = distance * FUEL_COST_PER_KM;
  const co2EmissionKg = (distance * CO2_EMISSION_G_PER_KM) / 1000;
  return { durationMinutes, fuelCost, co2EmissionKg };
}

// --- Scenario Implementations ---

async function runWeatherEvent(params: any): Promise<SimulationReport> {
  const { city, severity } = params;
  const activeRoutes = await storage.getAllRoutes();
  const affectedRoutes = activeRoutes.filter(r => {
    if (r.destination && r.destination.includes(city)) return true;
    const stops = Array.isArray(r.stops) ? r.stops : (Array.isArray((r.stops as any)?.toArray) ? (r.stops as any).toArray() : []);
    return Array.isArray(stops) && stops.includes(city);
  });

  const modifiedGraph = cloneGraph(INDIAN_CITY_GRAPH);
  const severityMultiplier = { low: 1.5, medium: 2.5, high: 5 }[severity as 'low' | 'medium' | 'high'];
  
  // Increase travel distance for routes connected to the affected city
  for (const origin in modifiedGraph) {
    modifiedGraph[origin] = modifiedGraph[origin].map(edge => {
      if (edge.to === city) {
        return { ...edge, distance: edge.distance * severityMultiplier };
      }
      return edge;
    });
  }

  let totalOriginalDistance = 0;
  let totalReroutedDistance = 0;
  let totalOriginalDuration = 0;
  let totalReroutedDuration = 0;

  const reroutedPaths: any[] = [];
  for (const route of affectedRoutes) {
    const origin = ((route.stops as unknown) as any[])[0];
    const destination = route.destination;

    totalOriginalDistance += route.distance ?? 0;
    totalOriginalDuration += route.estimatedTime ?? 0;
    
    const { path, distance } = dijkstraShortestPath(modifiedGraph, origin, destination);
    reroutedPaths.push({ routeId: route.routeId, newPath: path, newDistance: distance });
    totalReroutedDistance += distance;
    totalReroutedDuration += (distance / VEHICLE_SPEED_KMPH) * 60;
  }

  const { fuelCost: originalFuelCost, co2EmissionKg: originalCo2 } = calculateRouteMetrics(totalOriginalDistance);
  const { fuelCost: reroutedFuelCost, co2EmissionKg: reroutedCo2 } = calculateRouteMetrics(totalReroutedDistance);

  const costChange = reroutedFuelCost - originalFuelCost;
  const co2Change = reroutedCo2 - originalCo2;
  const delayMinutes = totalReroutedDuration - totalOriginalDuration;
  
  return {
    summary: {
      scenario: "Weather Event",
      description: `Simulated a ${severity} ${params.eventType} in ${city}.`,
    },
    impact: {
      cost: { change: costChange, percentage: ((costChange / originalFuelCost) * 100).toFixed(2) + '%' },
      sla: { total_delay_minutes: delayMinutes, affected_routes: affectedRoutes.length },
      carbon: { change_kg: co2Change, percentage: ((co2Change / originalCo2) * 100).toFixed(2) + '%' },
      inventory: { stockout_risk_percentage: 0, affected_products: [] }
    },
    recommendations: [{
      priority: 'High',
      message: `Reroute all traffic away from ${city} and notify downstream customers of potential delays.`
    }],
    details: { affectedRoutes, reroutedPaths }
  };
}

async function getInventoryOrMock() {
  const dbInventory = await storage.getAllInventory();
  if (dbInventory && dbInventory.length > 0) {
    // Map DB inventory to the expected shape for simulation
    return dbInventory.map(inv => ({
      id: inv.id,
      name: inv.productName || `Product ${inv.id}`,
      category: 'Unknown', // You may want to add category to your DB schema for full realism
      dailyConsumption: 50, // Placeholder, as DB does not have this field
      stock: inv.quantity
    }));
  }
  // fallback to mock
  return [
    { id: 101, name: 'Laptop', category: 'Electronics', dailyConsumption: 50, stock: 2000 },
    { id: 102, name: 'Smartphone', category: 'Electronics', dailyConsumption: 150, stock: 5000 },
    { id: 201, name: 'T-Shirt', category: 'Apparel', dailyConsumption: 300, stock: 10000 },
    { id: 301, name: 'Apples', category: 'Groceries', dailyConsumption: 1000, stock: 7000 },
    { id: 401, name: 'Desk Chair', category: 'Home Goods', dailyConsumption: 30, stock: 1000 },
  ];
}

async function getSuppliersOrMock() {
  const dbSuppliers = await storage.getAllSuppliers();
  if (dbSuppliers && dbSuppliers.length > 0) return dbSuppliers;
  // fallback to mock
  return [
    { id: 1, name: 'Global Electronics Inc.', reliability: 0.98, leadTimeDays: 14, costFactor: 1.0, productIds: [101, 102, 105] },
    { id: 2, name: 'Fashion Forward Fabrics', reliability: 0.95, leadTimeDays: 20, costFactor: 1.0, productIds: [201, 202, 203] },
    { id: 3, name: 'Fresh Produce Partners', reliability: 0.99, leadTimeDays: 2, costFactor: 1.0, productIds: [301, 302, 303, 304] },
    { id: 4, name: 'Home Essentials Co.', reliability: 0.97, leadTimeDays: 25, costFactor: 1.0, productIds: [401, 402, 403] },
    { id: 5, name: 'Backup Electronics Ltd.', reliability: 0.92, leadTimeDays: 10, costFactor: 1.3, productIds: [101, 102, 105] },
  ];
}

async function runDemandSpike(params: any): Promise<SimulationReport> {
  const { increasePercentage, duration, productCategory } = params;

  const inventory = await getInventoryOrMock();
  const affectedProducts = inventory.filter(p => p.category === productCategory);
  let totalExtraDemand = 0;
  let stockoutRisk = 0;
  let productsAtRisk: number[] = [];

  for (const product of affectedProducts) {
    const dailyDemand = product.dailyConsumption;
    const spikeDemand = dailyDemand * (1 + increasePercentage / 100);
    const totalDemandDuringSpike = spikeDemand * duration;
    totalExtraDemand += (spikeDemand - dailyDemand) * duration;

    if (product.stock < totalDemandDuringSpike) {
      stockoutRisk += (totalDemandDuringSpike - product.stock) / totalDemandDuringSpike;
      productsAtRisk.push(product.id);
    }
  }

  const avgStockoutRisk = productsAtRisk.length > 0 ? (stockoutRisk / productsAtRisk.length) * 100 : 0;
  // Estimate cost impact: assume 10% of extra demand requires expedited shipping at 2x cost
  const expeditedCost = (totalExtraDemand * 0.1) * 5; // Assuming avg product cost of $5

  return {
    summary: {
      scenario: "Demand Spike",
      description: `Simulated a ${increasePercentage}% demand spike for ${productCategory} over ${duration} days.`,
    },
    impact: {
      cost: { change: expeditedCost, percentage: `~5-10%` }, // Simplified
      sla: { total_delay_minutes: 0, affected_routes: 0 },
      carbon: { change_kg: expeditedCost * 0.05, percentage: `~2-4%` }, // Simplified
      inventory: { stockout_risk_percentage: avgStockoutRisk, affected_products: productsAtRisk }
    },
    recommendations: [{
      priority: 'Medium',
      message: `Increase inventory for ${productCategory} products and allocate more delivery vehicles.`
    }],
    details: { affectedRoutes: [], reroutedPaths: [] }
  };
}

async function runSupplierOutage(params: any): Promise<SimulationReport> {
    const { supplierId, impactPercentage, duration } = params;
    const suppliers = await getSuppliersOrMock();
    const mainSupplier = suppliers.find((s: any) => s.id === supplierId);
    if (!mainSupplier) throw new Error("Supplier not found");

    const backupSupplier = suppliers.find((s: any) => s.id !== supplierId && s.productIds.some((pid: number) => mainSupplier.productIds.includes(pid)));

    const inventory = await getInventoryOrMock();
    const affectedProducts = inventory.filter(p => mainSupplier.productIds.includes(p.id));
    let totalStockoutDays = 0;
    let productsAtRisk: number[] = [];
    let extraCost = 0;

    for (const product of affectedProducts) {
        const dailySupply = product.dailyConsumption; // Assume supply matches consumption
        const reducedSupply = dailySupply * (1 - impactPercentage / 100);
        const dailyDeficit = dailySupply - reducedSupply;
        const daysUntilStockout = product.stock / dailyDeficit;
        
        if (daysUntilStockout < duration) {
            totalStockoutDays += (duration - daysUntilStockout);
            productsAtRisk.push(product.id);

            // Calculate cost of using backup supplier
            if (backupSupplier) {
                const deficitToCover = (duration - daysUntilStockout) * dailyDeficit;
                const productCost = 10; // Avg cost
                const mainCost = deficitToCover * productCost * mainSupplier.costFactor;
                const backupCost = deficitToCover * productCost * backupSupplier.costFactor;
                extraCost += (backupCost - mainCost);
            }
        }
    }

    const avgStockoutRisk = productsAtRisk.length > 0 ? (totalStockoutDays / (productsAtRisk.length * duration)) * 100 : 0;

    return {
        summary: {
            scenario: "Supplier Outage",
            description: `Simulated a ${impactPercentage}% outage for supplier "${mainSupplier.name}" for ${duration} days.`,
        },
        impact: {
            cost: { change: extraCost, percentage: "~15-30%" },
            sla: { total_delay_minutes: 0, affected_routes: 0 },
            carbon: { change_kg: extraCost * 0.03, percentage: "~1-2%" },
            inventory: { stockout_risk_percentage: avgStockoutRisk, affected_products: productsAtRisk }
        },
        recommendations: [{
            priority: 'High',
            message: `Immediately engage backup supplier "${backupSupplier?.name}" and verify their capacity.`
        }],
        details: { affectedRoutes: [], reroutedPaths: [] }
    };
}

async function runPeakSeason(params: any): Promise<SimulationReport> {
    const { increasePercentage, duration, preparationTime } = params;

    const inventory = await getInventoryOrMock();
    let totalProjectedDemand = 0;
    let totalSupplyFromBuildup = 0;
    let productsAtRisk: number[] = [];

    for (const product of inventory) {
        const normalDailyDemand = product.dailyConsumption;
        const peakDailyDemand = normalDailyDemand * (1 + increasePercentage / 100);
        
        totalProjectedDemand += peakDailyDemand * duration;
        
        // Calculate how much extra inventory can be built up
        const inventoryBuildup = normalDailyDemand * preparationTime; // Assume we can buildup at normal consumption rate
        totalSupplyFromBuildup += product.stock + inventoryBuildup;

        if ((product.stock + inventoryBuildup) < (peakDailyDemand * duration)) {
            productsAtRisk.push(product.id);
        }
    }

    const stockoutRisk = totalSupplyFromBuildup < totalProjectedDemand 
        ? ((totalProjectedDemand - totalSupplyFromBuildup) / totalProjectedDemand) * 100 
        : 0;
    
    // Extra operational cost for scaling
    const extraCost = (duration / 30) * 50000 * (increasePercentage / 100);
    
    return {
        summary: {
            scenario: "Peak Season",
            description: `Simulated a ${increasePercentage}% demand increase over ${duration} days with ${preparationTime} days to prepare.`,
        },
        impact: {
            cost: { change: extraCost, percentage: "~20-50%" },
            sla: { total_delay_minutes: stockoutRisk > 10 ? 120 : 0, affected_routes: stockoutRisk > 10 ? 25 : 0 },
            carbon: { change_kg: extraCost * 0.08, percentage: "~5-10%" },
            inventory: { stockout_risk_percentage: stockoutRisk, affected_products: productsAtRisk }
        },
        recommendations: [{
            priority: 'Medium',
            message: `Begin inventory buildup ${preparationTime} days in advance and scale warehouse staff by ${increasePercentage/2}%.`
        }],
        details: { affectedRoutes: [], reroutedPaths: [] }
    };
}

export async function runSimulation(params: SimulationParams): Promise<SimulationReport> {
  switch (params.scenario) {
    case 'weather_event':
      return runWeatherEvent(params.parameters);
    case 'demand_spike':
      return runDemandSpike(params.parameters);
    case 'supplier_outage':
      return runSupplierOutage(params.parameters);
    case 'peak_season':
        return runPeakSeason(params.parameters);
    default:
      // This should be impossible with TypeScript discriminated unions
      throw new Error("Invalid simulation scenario");
  }
}

export type { SimulationParams }; 