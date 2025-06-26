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

// Delivery mode factors
const DELIVERY_MODE_FACTORS: { [key: string]: { speed: number; costPerKm: number; co2PerKm: number; maxDistance?: number; maxPayload?: number } } = {
  truck:    { speed: 60, costPerKm: 0.15, co2PerKm: 180 },
  mini_truck: { speed: 50, costPerKm: 0.12, co2PerKm: 120 },
  autonomous_vehicle: { speed: 75, costPerKm: 0.10, co2PerKm: 100 },
  drone:    { speed: 120, costPerKm: 0.30, co2PerKm: 30, maxDistance: 30, maxPayload: 5 },
};

function getDeliveryModeFactors(mode = 'truck') {
  return DELIVERY_MODE_FACTORS[mode] || DELIVERY_MODE_FACTORS.truck;
}

// --- Helper Functions ---
function cloneGraph(graph: typeof INDIAN_CITY_GRAPH): typeof INDIAN_CITY_GRAPH {
  return JSON.parse(JSON.stringify(graph));
}

const VEHICLE_SPEED_KMPH = 60;
const FUEL_COST_PER_KM = 0.15; // USD
const CO2_EMISSION_G_PER_KM = 180;
const DAILY_OPERATIONAL_COST = 200; // Per vehicle

function calculateRouteMetrics(distance: number, mode: string = 'truck') {
  const factors = getDeliveryModeFactors(mode);
  const durationMinutes = (distance / factors.speed) * 60;
  const fuelCost = distance * factors.costPerKm;
  const co2EmissionKg = (distance * factors.co2PerKm) / 1000;
  return { durationMinutes, fuelCost, co2EmissionKg };
}

// --- Scenario Implementations ---

async function runWeatherEvent(params: any): Promise<SimulationReport> {
  console.log('[SIM DEBUG] WeatherEvent params:', params);
  const { city, severity, deliveryMode = 'truck' } = params;
  const activeRoutes = await storage.getAllRoutes();
  console.log('[SIM DEBUG] Active Routes:', activeRoutes);
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
    totalReroutedDuration += (distance / getDeliveryModeFactors(deliveryMode).speed) * 60;
  }

  const origMetrics = calculateRouteMetrics(totalOriginalDistance, deliveryMode);
  const reroutedMetrics = calculateRouteMetrics(totalReroutedDistance, deliveryMode);
  const costChange = reroutedMetrics.fuelCost - origMetrics.fuelCost;
  const co2Change = reroutedMetrics.co2EmissionKg - origMetrics.co2EmissionKg;
  const delayMinutes = totalReroutedDuration - totalOriginalDuration;
  
  return {
    summary: {
      scenario: "Weather Event",
      description: `Simulated a ${severity} ${params.eventType} in ${city}.`,
    },
    impact: {
      cost: { change: costChange, percentage: ((costChange / origMetrics.fuelCost) * 100).toFixed(2) + '%' },
      sla: { total_delay_minutes: delayMinutes, affected_routes: affectedRoutes.length },
      carbon: { change_kg: co2Change, percentage: ((co2Change / origMetrics.co2EmissionKg) * 100).toFixed(2) + '%' },
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
  // Always use mock for now to ensure categories are present for simulation
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
  const { increasePercentage, duration, productCategory, deliveryMode = 'truck' } = params;
  console.log('[SIM DEBUG] DemandSpike params:', params);
  const inventory = await getInventoryOrMock();
  console.log('[SIM DEBUG] Inventory:', inventory);
  const affectedProducts = inventory.filter(p => p.category === productCategory);
  console.log('[SIM DEBUG] Affected Products:', affectedProducts);
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
  const expeditedCost = (totalExtraDemand * 0.1) * getDeliveryModeFactors(deliveryMode).costPerKm * 2;
  // Carbon impact
  const carbonChange = expeditedCost * (getDeliveryModeFactors(deliveryMode).co2PerKm / 1000);

  return {
    summary: {
      scenario: "Demand Spike",
      description: `Simulated a ${increasePercentage}% demand spike for ${productCategory} over ${duration} days.`,
    },
    impact: {
      cost: { change: expeditedCost, percentage: `~5-10%` },
      sla: { total_delay_minutes: 0, affected_routes: 0 },
      carbon: { change_kg: carbonChange, percentage: `~2-4%` },
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
    const { supplierId, impactPercentage, duration, deliveryMode = 'truck' } = params;
    console.log('[SIM DEBUG] SupplierOutage params:', params);
    const suppliers = await getSuppliersOrMock();
    console.log('[SIM DEBUG] Suppliers:', suppliers);
    const mainSupplier = suppliers.find((s: any) => s.id === supplierId);
    console.log('[SIM DEBUG] Main Supplier:', mainSupplier);
    if (!mainSupplier) throw new Error("Supplier not found");
    const backupSupplier = suppliers.find((s: any) => s.id !== supplierId && s.productIds.some((pid: number) => mainSupplier.productIds.includes(pid)));
    const inventory = await getInventoryOrMock();
    console.log('[SIM DEBUG] Inventory:', inventory);
    const affectedProducts = inventory.filter(p => mainSupplier.productIds.includes(p.id));
    console.log('[SIM DEBUG] Affected Products:', affectedProducts);
    let totalStockoutDays = 0;
    let extraCost = 0;

    for (const product of affectedProducts) {
        const dailySupply = product.dailyConsumption; // Assume supply matches consumption
        const reducedSupply = dailySupply * (1 - impactPercentage / 100);
        const dailyDeficit = dailySupply - reducedSupply;
        const daysUntilStockout = product.stock / dailyDeficit;
        
        if (daysUntilStockout < duration) {
            totalStockoutDays += (duration - daysUntilStockout);

            // Calculate cost of using backup supplier
            if (backupSupplier) {
                const deficitToCover = (duration - daysUntilStockout) * dailyDeficit;
                const productCost = 10; // Avg cost
                const mainCost = deficitToCover * productCost * mainSupplier.costFactor;
                const backupCost = deficitToCover * productCost * backupSupplier.costFactor;
                extraCost += (backupCost - mainCost) * getDeliveryModeFactors(deliveryMode).costPerKm;
            }
        }
    }

    const avgStockoutRisk = totalStockoutDays > 0 ? (totalStockoutDays / (affectedProducts.length * duration)) * 100 : 0;

    return {
        summary: {
            scenario: "Supplier Outage",
            description: `Simulated a ${impactPercentage}% outage for supplier "${mainSupplier.name}" for ${duration} days.`,
        },
        impact: {
            cost: { change: extraCost, percentage: "~15-30%" },
            sla: { total_delay_minutes: 0, affected_routes: 0 },
            carbon: { change_kg: extraCost * (getDeliveryModeFactors(deliveryMode).co2PerKm / 1000), percentage: "~1-2%" },
            inventory: { stockout_risk_percentage: avgStockoutRisk, affected_products: affectedProducts.map(p => p.id) }
        },
        recommendations: [{
            priority: 'High',
            message: `Immediately engage backup supplier "${backupSupplier?.name}" and verify their capacity.`
        }],
        details: { affectedRoutes: [], reroutedPaths: [] }
    };
}

async function runPeakSeason(params: any): Promise<SimulationReport> {
  console.log('[SIM DEBUG] PeakSeason params:', params);
  const { increasePercentage, duration, preparationTime, deliveryMode = 'truck' } = params;
  const inventory = await getInventoryOrMock();
  console.log('[SIM DEBUG] Inventory:', inventory);
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
  const extraCost = (duration / 30) * 50000 * (increasePercentage / 100) * getDeliveryModeFactors(deliveryMode).costPerKm;
  return {
    summary: {
      scenario: "Peak Season",
      description: `Simulated a ${increasePercentage}% demand increase over ${duration} days with ${preparationTime} days to prepare.`,
    },
    impact: {
      cost: { change: extraCost, percentage: "~20-50%" },
      sla: { total_delay_minutes: stockoutRisk > 10 ? 120 : 0, affected_routes: stockoutRisk > 10 ? 25 : 0 },
      carbon: { change_kg: extraCost * (getDeliveryModeFactors(deliveryMode).co2PerKm / 1000), percentage: "~5-10%" },
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