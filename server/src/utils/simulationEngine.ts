import {
  type SimulationParams,
  type SimulationReport,
  type Route,
} from '@shared/schema';
import { storage, dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES, MOCK_PRODUCT_INVENTORY } from './demo-data';
import type { WeatherEventParams, DemandSpikeParams, SupplierOutageParams } from "@shared/schema";
import { pool } from './db';

// Enhanced mathematical models for supply chain simulation
class SupplyChainMathematicalModel {
  // Economic Order Quantity (EOQ) model
  static calculateEOQ(demand: number, setupCost: number, holdingCost: number): number {
    return Math.sqrt((2 * demand * setupCost) / holdingCost);
  }

  // Safety Stock calculation using service level
  static calculateSafetyStock(demand: number, leadTime: number, serviceLevel: number, demandVariability: number): number {
    const zScore = this.getZScore(serviceLevel);
    return zScore * Math.sqrt(leadTime) * demandVariability;
  }

  // Z-score for service level (simplified)
  static getZScore(serviceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.90: 1.28, 0.91: 1.34, 0.92: 1.41, 0.93: 1.48, 0.94: 1.55,
      0.95: 1.65, 0.96: 1.75, 0.97: 1.88, 0.98: 2.05, 0.99: 2.33
    };
    return zScores[Math.round(serviceLevel * 100) / 100] || 1.65;
  }

  // Bullwhip Effect calculation
  static calculateBullwhipEffect(demandVariability: number, leadTime: number, forecastPeriod: number): number {
    return Math.sqrt(1 + (2 * leadTime / forecastPeriod) + (2 * Math.pow(leadTime / forecastPeriod, 2))) * demandVariability;
  }

  // Cost of Stockout calculation
  static calculateStockoutCost(unitCost: number, stockoutProbability: number, demandDuringStockout: number, profitMargin: number): number {
    return unitCost * stockoutProbability * demandDuringStockout * profitMargin;
  }

  // Transportation cost with economies of scale
  static calculateTransportCost(distance: number, volume: number, mode: string): number {
    const baseRates = { truck: 0.15, mini_truck: 0.12, autonomous_vehicle: 0.10, drone: 0.30 };
    const baseRate = baseRates[mode as keyof typeof baseRates] || 0.15;
    
    // Economies of scale: cost per km decreases with volume
    const volumeDiscount = Math.min(0.3, volume / 1000); // Max 30% discount
    const adjustedRate = baseRate * (1 - volumeDiscount);
    
    return distance * adjustedRate;
  }

  // Carbon footprint calculation with mode efficiency
  static calculateCarbonFootprint(distance: number, volume: number, mode: string): number {
    const co2Rates = { truck: 180, mini_truck: 120, autonomous_vehicle: 100, drone: 30 };
    const baseCO2 = co2Rates[mode as keyof typeof co2Rates] || 180;
    
    // Efficiency improves with volume (consolidation effect)
    const efficiencyGain = Math.min(0.2, volume / 500); // Max 20% efficiency gain
    const adjustedCO2 = baseCO2 * (1 - efficiencyGain);
    
    return distance * adjustedCO2;
  }

  // Lead time variability impact
  static calculateLeadTimeImpact(baseLeadTime: number, variability: number, criticality: number): number {
    // Higher variability and criticality increase effective lead time
    const variabilityMultiplier = 1 + (variability * 0.5);
    const criticalityMultiplier = 1 + (criticality * 0.3);
    return baseLeadTime * variabilityMultiplier * criticalityMultiplier;
  }

  // Capacity utilization and bottleneck analysis
  static calculateCapacityUtilization(currentLoad: number, capacity: number, efficiency: number): number {
    const utilization = currentLoad / capacity;
    // Efficiency decreases as utilization approaches 100%
    const efficiencyPenalty = utilization > 0.8 ? Math.pow(utilization - 0.8, 2) * 0.5 : 0;
    return Math.min(1, utilization * (efficiency - efficiencyPenalty));
  }

  // Risk-adjusted cost calculation
  static calculateRiskAdjustedCost(baseCost: number, riskFactors: { [key: string]: number }): number {
    let riskMultiplier = 1;
    for (const [factor, probability] of Object.entries(riskFactors)) {
      const impact = this.getRiskImpact(factor);
      riskMultiplier += probability * impact;
    }
    return baseCost * riskMultiplier;
  }

  // Risk impact factors
  static getRiskImpact(riskType: string): number {
    const impacts: { [key: string]: number } = {
      'supplier_failure': 0.3,
      'transport_delay': 0.2,
      'quality_issue': 0.25,
      'demand_spike': 0.15,
      'weather_event': 0.4,
      'capacity_constraint': 0.35
    };
    return impacts[riskType] || 0.1;
  }

  // Dynamic pricing model based on demand and supply
  static calculateDynamicPrice(basePrice: number, demand: number, supply: number, elasticity: number): number {
    const supplyDemandRatio = supply / demand;
    const priceMultiplier = Math.pow(supplyDemandRatio, -1 / elasticity);
    return basePrice * priceMultiplier;
  }

  // Service level optimization
  static optimizeServiceLevel(demand: number, leadTime: number, holdingCost: number, stockoutCost: number): number {
    // Find optimal service level using newsvendor model
    const criticalRatio = stockoutCost / (stockoutCost + holdingCost);
    return Math.min(0.99, Math.max(0.5, criticalRatio));
  }
}

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
  // productId: { daily_consumption, supplierId, unitCost, holdingCost, setupCost }
  101: { daily_consumption: 20, supplierId: 1, unitCost: 50, holdingCost: 5, setupCost: 100 },
  102: { daily_consumption: 30, supplierId: 1, unitCost: 75, holdingCost: 7.5, setupCost: 150 },
  105: { daily_consumption: 15, supplierId: 2, unitCost: 25, holdingCost: 2.5, setupCost: 50 },
  201: { daily_consumption: 50, supplierId: 2, unitCost: 100, holdingCost: 10, setupCost: 200 },
  202: { daily_consumption: 25, supplierId: 3, unitCost: 60, holdingCost: 6, setupCost: 120 },
};

const MOCK_SUPPLIER_DATA = {
  1: { name: 'Supplier Alpha', backupSupplierId: 2, reliability: 0.95, leadTimeDays: 7, leadTimeVariability: 0.2 },
  2: { name: 'Supplier Beta', backupSupplierId: 3, reliability: 0.92, leadTimeDays: 5, leadTimeVariability: 0.15 },
  3: { name: 'Supplier Gamma', backupSupplierId: 1, reliability: 0.88, leadTimeDays: 10, leadTimeVariability: 0.3 },
};

// Delivery mode factors with enhanced mathematical modeling
const DELIVERY_MODE_FACTORS: { [key: string]: { 
  speed: number; 
  costPerKm: number; 
  co2PerKm: number; 
  maxDistance?: number; 
  maxPayload?: number;
  reliability: number;
  capacityUtilization: number;
} } = {
  truck: { 
    speed: 60, 
    costPerKm: 0.15, 
    co2PerKm: 180, 
    reliability: 0.95,
    capacityUtilization: 0.85
  },
  mini_truck: { 
    speed: 50, 
    costPerKm: 0.12, 
    co2PerKm: 120, 
    reliability: 0.92,
    capacityUtilization: 0.75
  },
  autonomous_vehicle: { 
    speed: 75, 
    costPerKm: 0.10, 
    co2PerKm: 100, 
    reliability: 0.98,
    capacityUtilization: 0.90
  },
  drone: { 
    speed: 120, 
    costPerKm: 0.30, 
    co2PerKm: 30, 
    maxDistance: 30, 
    maxPayload: 5,
    reliability: 0.85,
    capacityUtilization: 0.60
  },
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

async function logSimulationRun(scenario: string, params: any, impact: any) {
  await pool.query(
    'INSERT INTO simulation_logs (scenario, params, timestamp, impact) VALUES ($1, $2, NOW(), $3)',
    [scenario, JSON.stringify(params), JSON.stringify(impact)]
  );
}

async function runWeatherEvent(params: any): Promise<SimulationReport> {
  console.log('[SIM DEBUG] WeatherEvent params:', params);
  const { city, severity, deliveryMode = 'truck', eventType = 'flood' } = params;
  const activeRoutes = await storage.getAllRoutes();
  console.log('[SIM DEBUG] Active Routes:', activeRoutes);
  const affectedRoutes = activeRoutes.filter(r => {
    if (r.destination && r.destination.includes(city)) return true;
    const stops = Array.isArray(r.stops) ? r.stops : (Array.isArray((r.stops as any)?.toArray) ? (r.stops as any).toArray() : []);
    return Array.isArray(stops) && stops.includes(city);
  });

  // Enhanced mathematical modeling for weather impact
  const weatherImpact = IMPACT_FACTORS.weather[eventType as keyof typeof IMPACT_FACTORS.weather];
  const severityMultiplier = weatherImpact[severity as keyof typeof weatherImpact];
  
  // Calculate lead time impact based on weather severity
  const baseLeadTime = 2; // days
  const leadTimeVariability = severity === 'high' ? 0.8 : severity === 'medium' ? 0.5 : 0.3;
  const criticality = 0.7; // High criticality for weather events
  const effectiveLeadTime = SupplyChainMathematicalModel.calculateLeadTimeImpact(
    baseLeadTime, leadTimeVariability, criticality
  );

  const modifiedGraph = cloneGraph(INDIAN_CITY_GRAPH);
  
  // Apply weather-specific distance modifications
  for (const origin in modifiedGraph) {
    modifiedGraph[origin] = modifiedGraph[origin].map(edge => {
      if (edge.to === city) {
        let distanceMultiplier = severityMultiplier;
        
        // Event-specific adjustments
        if (eventType === 'flood') {
          distanceMultiplier = 1 + (severityMultiplier * 0.5); // Floods increase distance more
        } else if (eventType === 'storm') {
          distanceMultiplier = 1 / severityMultiplier; // Storms reduce speed
        } else if (eventType === 'fog') {
          distanceMultiplier = 1 / severityMultiplier; // Fog reduces speed
        }
        
        return { ...edge, distance: edge.distance * distanceMultiplier };
      }
      return edge;
    });
  }

  let totalOriginalDistance = 0;
  let totalReroutedDistance = 0;
  let totalOriginalVolume = 0;
  let totalReroutedVolume = 0;

  const reroutedPaths: any[] = [];
  for (const route of affectedRoutes) {
    const origin = ((route.stops as unknown) as any[])[0];
    const destination = route.destination;
    const routeVolume = (route as any).volume || 100; // Default volume if not specified

    totalOriginalDistance += route.distance ?? 0;
    totalOriginalVolume += routeVolume;
    
    const { path, distance } = dijkstraShortestPath(modifiedGraph, origin, destination);
    reroutedPaths.push({ routeId: route.routeId, newPath: path, newDistance: distance });
    totalReroutedDistance += distance;
    totalReroutedVolume += routeVolume;
  }

  // Enhanced cost calculation using mathematical models
  const originalTransportCost = SupplyChainMathematicalModel.calculateTransportCost(
    totalOriginalDistance, totalOriginalVolume, deliveryMode
  );
  const reroutedTransportCost = SupplyChainMathematicalModel.calculateTransportCost(
    totalReroutedDistance, totalReroutedVolume, deliveryMode
  );
  
  // Risk-adjusted cost calculation
  const riskFactors = {
    'weather_event': severity === 'high' ? 0.8 : severity === 'medium' ? 0.5 : 0.3,
    'transport_delay': 0.6
  };
  const riskAdjustedCost = SupplyChainMathematicalModel.calculateRiskAdjustedCost(
    reroutedTransportCost, riskFactors
  );

  // Enhanced carbon footprint calculation
  const originalCarbon = SupplyChainMathematicalModel.calculateCarbonFootprint(
    totalOriginalDistance, totalOriginalVolume, deliveryMode
  );
  const reroutedCarbon = SupplyChainMathematicalModel.calculateCarbonFootprint(
    totalReroutedDistance, totalReroutedVolume, deliveryMode
  );

  // Calculate delay impact on SLA
  const deliveryModeFactors = getDeliveryModeFactors(deliveryMode);
  const originalDuration = (totalOriginalDistance / deliveryModeFactors.speed) * 60;
  const reroutedDuration = (totalReroutedDistance / deliveryModeFactors.speed) * 60;
  const delayMinutes = reroutedDuration - originalDuration;

  // Calculate capacity utilization impact
  const currentCapacity = 1000; // Assume 1000 units capacity
  const capacityUtilization = SupplyChainMathematicalModel.calculateCapacityUtilization(
    totalReroutedVolume, currentCapacity, deliveryModeFactors.capacityUtilization
  );

  const costChange = riskAdjustedCost - originalTransportCost;
  const co2Change = reroutedCarbon - originalCarbon;
  
  const result = {
    summary: {
      scenario: "Weather Event",
      description: `Simulated a ${severity} ${eventType} in ${city} affecting ${affectedRoutes.length} routes.`,
    },
    impact: {
      cost: { 
        change: costChange, 
        percentage: ((costChange / originalTransportCost) * 100).toFixed(2) + '%',
        riskAdjusted: riskAdjustedCost,
        capacityUtilization: capacityUtilization
      },
      sla: { 
        total_delay_minutes: delayMinutes, 
        affected_routes: affectedRoutes.length,
        effectiveLeadTime: effectiveLeadTime
      },
      carbon: { 
        change_kg: co2Change, 
        percentage: ((co2Change / originalCarbon) * 100).toFixed(2) + '%',
        totalEmission: reroutedCarbon
      },
      inventory: { 
        stockout_risk_percentage: severity === 'high' ? 15 : severity === 'medium' ? 8 : 3, 
        affected_products: [],
        safetyStockIncrease: SupplyChainMathematicalModel.calculateSafetyStock(
          100, effectiveLeadTime, 0.95, 0.3
        )
      }
    },
    recommendations: [
      {
        priority: 'High' as const,
        message: `Reroute all traffic away from ${city} and activate emergency response protocols.`
      },
      {
        priority: 'Medium' as const,
        message: `Increase safety stock by ${Math.round(SupplyChainMathematicalModel.calculateSafetyStock(100, effectiveLeadTime, 0.95, 0.3))} units for affected regions.`
      }
    ],
    details: { affectedRoutes, reroutedPaths }
  };
  await logSimulationRun('Weather Event', params, result.impact);
  return result;
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
  const { increasePercentage, duration, productCategory, deliveryMode = 'truck', region = 'Northeast' } = params;
  console.log('[SIM DEBUG] DemandSpike params:', params);
  const inventory = await getInventoryOrMock();
  console.log('[SIM DEBUG] Inventory:', inventory);
  const affectedProducts = inventory.filter(p => p.category === productCategory);
  console.log('[SIM DEBUG] Affected Products:', affectedProducts);
  
  let totalExtraDemand = 0;
  let totalStockoutCost = 0;
  let productsAtRisk: number[] = [];
  let optimalOrderQuantities: { [key: number]: number } = {};
  let safetyStockRequirements: { [key: number]: number } = {};

  // Enhanced mathematical modeling for demand spike
  for (const product of affectedProducts) {
    const dailyDemand = product.dailyConsumption;
    const spikeDemand = dailyDemand * (1 + increasePercentage / 100);
    const totalDemandDuringSpike = spikeDemand * duration;
    totalExtraDemand += (spikeDemand - dailyDemand) * duration;

    // Calculate EOQ for optimal ordering
    const mockData = MOCK_INVENTORY_DATA[product.id as keyof typeof MOCK_INVENTORY_DATA];
    if (mockData) {
      const eoq = SupplyChainMathematicalModel.calculateEOQ(
        spikeDemand, mockData.setupCost, mockData.holdingCost
      );
      optimalOrderQuantities[product.id] = eoq;

      // Calculate safety stock requirements
      const demandVariability = increasePercentage / 100; // Higher spike = higher variability
      const safetyStock = SupplyChainMathematicalModel.calculateSafetyStock(
        spikeDemand, 7, 0.95, demandVariability
      );
      safetyStockRequirements[product.id] = safetyStock;
    }

    // Calculate stockout risk and cost
    if (product.stock < totalDemandDuringSpike) {
      const stockoutProbability = (totalDemandDuringSpike - product.stock) / totalDemandDuringSpike;
      const demandDuringStockout = (totalDemandDuringSpike - product.stock) * 0.3; // Assume 30% of shortage is lost sales
      const profitMargin = 0.25; // 25% profit margin
      const unitCost = mockData?.unitCost || 50;
      
      const stockoutCost = SupplyChainMathematicalModel.calculateStockoutCost(
        unitCost, stockoutProbability, demandDuringStockout, profitMargin
      );
      totalStockoutCost += stockoutCost;
      productsAtRisk.push(product.id);
    }
  }

  // Calculate bullwhip effect
  const demandVariability = increasePercentage / 100;
  const leadTime = 7; // days
  const forecastPeriod = 30; // days
  const bullwhipEffect = SupplyChainMathematicalModel.calculateBullwhipEffect(
    demandVariability, leadTime, forecastPeriod
  );

  // Enhanced cost calculations using mathematical models
  const avgStockoutRisk = productsAtRisk.length > 0 ? (totalStockoutCost / productsAtRisk.length) : 0;
  
  // Calculate expedited shipping cost with economies of scale
  const expeditedVolume = totalExtraDemand * 0.15; // 15% requires expedited shipping
  const expeditedDistance = 500; // Assume 500km average for expedited routes
  const expeditedCost = SupplyChainMathematicalModel.calculateTransportCost(
    expeditedDistance, expeditedVolume, deliveryMode
  ) * 1.5; // 50% premium for expedited shipping

  // Calculate carbon impact
  const carbonChange = SupplyChainMathematicalModel.calculateCarbonFootprint(
    expeditedDistance, expeditedVolume, deliveryMode
  );

  // Calculate dynamic pricing impact
  const basePrice = 100; // Base product price
  const supply = affectedProducts.reduce((sum, p) => sum + p.stock, 0);
  const demand = totalExtraDemand;
  const elasticity = 1.5; // Price elasticity of demand
  const dynamicPrice = SupplyChainMathematicalModel.calculateDynamicPrice(
    basePrice, demand, supply, elasticity
  );

  // Calculate optimal service level
  const avgHoldingCost = affectedProducts.reduce((sum, p) => {
    const mockData = MOCK_INVENTORY_DATA[p.id as keyof typeof MOCK_INVENTORY_DATA];
    return sum + (mockData?.holdingCost || 5);
  }, 0) / affectedProducts.length;
  
  const optimalServiceLevel = SupplyChainMathematicalModel.optimizeServiceLevel(
    totalExtraDemand, 7, avgHoldingCost, totalStockoutCost
  );

  const result = {
    summary: {
      scenario: "Demand Spike",
      description: `Simulated a ${increasePercentage}% demand spike for ${productCategory} in ${region} over ${duration} days.`,
    },
    impact: {
      cost: { 
        change: expeditedCost + totalStockoutCost, 
        percentage: (((expeditedCost + totalStockoutCost) / (expeditedCost * 10)) * 100).toFixed(2) + '%',
        stockoutCost: totalStockoutCost,
        expeditedShipping: expeditedCost,
        dynamicPricing: dynamicPrice - basePrice
      },
      sla: { 
        total_delay_minutes: avgStockoutRisk > 1000 ? 120 : 0, 
        affected_routes: avgStockoutRisk > 1000 ? Math.ceil(totalExtraDemand / 100) : 0,
        serviceLevel: optimalServiceLevel
      },
      carbon: { 
        change_kg: carbonChange, 
        percentage: ((carbonChange / (expeditedCost * 0.1)) * 100).toFixed(2) + '%',
        totalEmission: carbonChange
      },
      inventory: { 
        stockout_risk_percentage: productsAtRisk.length > 0 ? (productsAtRisk.length / affectedProducts.length) * 100 : 0, 
        affected_products: productsAtRisk,
        optimalEOQ: optimalOrderQuantities,
        safetyStock: safetyStockRequirements,
        bullwhipEffect: bullwhipEffect
      }
    },
    recommendations: [
      {
        priority: 'High' as const,
        message: `Increase inventory for ${productCategory} by ${Math.round(Object.values(optimalOrderQuantities).reduce((a, b) => a + b, 0))} units and activate backup suppliers.`
      },
      {
        priority: 'Medium' as const,
        message: `Implement safety stock of ${Math.round(Object.values(safetyStockRequirements).reduce((a, b) => a + b, 0))} units to mitigate ${bullwhipEffect.toFixed(2)}x bullwhip effect.`
      },
      {
        priority: 'Low' as const,
        message: `Consider dynamic pricing strategy with ${((dynamicPrice - basePrice) / basePrice * 100).toFixed(1)}% price adjustment.`
      }
    ],
    details: { affectedRoutes: [], reroutedPaths: [] }
  };
  await logSimulationRun('Demand Spike', params, result.impact);
  return result;
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
    let totalExtraCost = 0;
    let totalStockoutCost = 0;
    let productsAtRisk: number[] = [];
    let alternativeSourcingCosts: { [key: number]: number } = {};
    let leadTimeImpacts: { [key: number]: number } = {};

    // Enhanced mathematical modeling for supplier outage
    for (const product of affectedProducts) {
        const dailySupply = product.dailyConsumption; // Assume supply matches consumption
        const reducedSupply = dailySupply * (1 - impactPercentage / 100);
        const dailyDeficit = dailySupply - reducedSupply;
        const daysUntilStockout = product.stock / dailyDeficit;
        
        // Calculate lead time impact
        const mainSupplierData = MOCK_SUPPLIER_DATA[supplierId as keyof typeof MOCK_SUPPLIER_DATA];
        const backupSupplierData = backupSupplier ? MOCK_SUPPLIER_DATA[backupSupplier.id as keyof typeof MOCK_SUPPLIER_DATA] : null;
        
        if (mainSupplierData && backupSupplierData) {
            const leadTimeImpact = SupplyChainMathematicalModel.calculateLeadTimeImpact(
                backupSupplierData.leadTimeDays,
                backupSupplierData.leadTimeVariability,
                0.8 // High criticality for supplier outage
            );
            leadTimeImpacts[product.id] = leadTimeImpact;
        }
        
        if (daysUntilStockout < duration) {
            totalStockoutDays += (duration - daysUntilStockout);
            productsAtRisk.push(product.id);

            // Calculate stockout cost using mathematical model
            const mockData = MOCK_INVENTORY_DATA[product.id as keyof typeof MOCK_INVENTORY_DATA];
            if (mockData) {
                const stockoutProbability = (duration - daysUntilStockout) / duration;
                const demandDuringStockout = (duration - daysUntilStockout) * dailyDeficit;
                const profitMargin = 0.25;
                
                const stockoutCost = SupplyChainMathematicalModel.calculateStockoutCost(
                    mockData.unitCost, stockoutProbability, demandDuringStockout, profitMargin
                );
                totalStockoutCost += stockoutCost;
            }

            // Calculate alternative sourcing cost with mathematical models
            if (backupSupplier) {
                const deficitToCover = (duration - daysUntilStockout) * dailyDeficit;
                const mockData = MOCK_INVENTORY_DATA[product.id as keyof typeof MOCK_INVENTORY_DATA];
                const unitCost = mockData?.unitCost || 50;
                
                // Calculate transportation cost for alternative sourcing
                const sourcingDistance = 800; // Assume 800km for alternative sourcing
                const sourcingVolume = deficitToCover;
                const transportCost = SupplyChainMathematicalModel.calculateTransportCost(
                    sourcingDistance, sourcingVolume, deliveryMode
                );
                
                // Calculate cost difference with risk adjustment
                const mainCost = deficitToCover * unitCost * mainSupplier.costFactor;
                const backupCost = deficitToCover * unitCost * backupSupplier.costFactor + transportCost;
                
                // Apply risk adjustment for supplier reliability
                const riskFactors = {
                    'supplier_failure': 1 - backupSupplier.reliability,
                    'transport_delay': 0.3
                };
                const riskAdjustedBackupCost = SupplyChainMathematicalModel.calculateRiskAdjustedCost(
                    backupCost, riskFactors
                );
                
                const costDifference = riskAdjustedBackupCost - mainCost;
                totalExtraCost += costDifference;
                alternativeSourcingCosts[product.id] = costDifference;
            }
        }
    }

    const avgStockoutRisk = totalStockoutDays > 0 ? (totalStockoutDays / (affectedProducts.length * duration)) * 100 : 0;

    // Calculate carbon impact
    const carbonChange = SupplyChainMathematicalModel.calculateCarbonFootprint(
        800, totalExtraCost / 100, deliveryMode // Assume 800km average for alternative sourcing
    );

    // Calculate optimal service level for recovery
    const avgHoldingCost = affectedProducts.reduce((sum, p) => {
        const mockData = MOCK_INVENTORY_DATA[p.id as keyof typeof MOCK_INVENTORY_DATA];
        return sum + (mockData?.holdingCost || 5);
    }, 0) / affectedProducts.length;
    
    const optimalServiceLevel = SupplyChainMathematicalModel.optimizeServiceLevel(
        totalStockoutCost, 7, avgHoldingCost, totalStockoutCost
    );

    const result = {
        summary: {
            scenario: "Supplier Outage",
            description: `Simulated a ${impactPercentage}% outage for supplier "${mainSupplier.name}" for ${duration} days.`,
        },
        impact: {
            cost: { 
                change: totalExtraCost + totalStockoutCost, 
                percentage: (((totalExtraCost + totalStockoutCost) / (totalExtraCost * 5)) * 100).toFixed(2) + '%',
                alternativeSourcing: totalExtraCost,
                stockoutCost: totalStockoutCost,
                leadTimeImpact: Object.values(leadTimeImpacts).reduce((a, b) => a + b, 0)
            },
            sla: { 
                total_delay_minutes: avgStockoutRisk > 20 ? 180 : 0, 
                affected_routes: avgStockoutRisk > 20 ? productsAtRisk.length : 0,
                serviceLevel: optimalServiceLevel
            },
            carbon: { 
                change_kg: carbonChange, 
                percentage: ((carbonChange / (totalExtraCost * 0.01)) * 100).toFixed(2) + '%',
                totalEmission: carbonChange
            },
            inventory: { 
                stockout_risk_percentage: avgStockoutRisk, 
                affected_products: productsAtRisk,
                alternativeSourcingCosts: alternativeSourcingCosts,
                leadTimeImpacts: leadTimeImpacts
            }
        },
        recommendations: [
            {
                priority: 'High' as const,
                message: `Engage backup suppliers immediately and expedite shipments for ${productsAtRisk.length} affected products.`
            },
            {
                priority: 'Medium' as const,
                message: `Implement safety stock of ${Math.round(Object.values(leadTimeImpacts).reduce((a, b) => a + b, 0))} days to mitigate lead time variability.`
            }
        ],
        details: { affectedRoutes: [], reroutedPaths: [] }
    };
    await logSimulationRun('Supplier Outage', params, result.impact);
    return result;
}

async function runPeakSeason(params: any): Promise<SimulationReport> {
  console.log('[SIM DEBUG] PeakSeason params:', params);
  const { increasePercentage, duration, preparationTime, deliveryMode = 'truck' } = params;
  const inventory = await getInventoryOrMock();
  console.log('[SIM DEBUG] Inventory:', inventory);
  
  let totalProjectedDemand = 0;
  let totalSupplyFromBuildup = 0;
  let productsAtRisk: number[] = [];
  let optimalOrderQuantities: { [key: number]: number } = {};
  let capacityUtilization: { [key: number]: number } = {};
  let totalBuildupCost = 0;

  // Enhanced mathematical modeling for peak season
  for (const product of inventory) {
    const normalDailyDemand = product.dailyConsumption;
    const peakDailyDemand = normalDailyDemand * (1 + increasePercentage / 100);
    totalProjectedDemand += peakDailyDemand * duration;
    
    // Calculate optimal order quantities for peak season
    const mockData = MOCK_INVENTORY_DATA[product.id as keyof typeof MOCK_INVENTORY_DATA];
    if (mockData) {
      const eoq = SupplyChainMathematicalModel.calculateEOQ(
        peakDailyDemand, mockData.setupCost, mockData.holdingCost
      );
      optimalOrderQuantities[product.id] = eoq;
      
      // Calculate buildup cost
      const buildupVolume = normalDailyDemand * preparationTime;
      const buildupCost = SupplyChainMathematicalModel.calculateTransportCost(
        200, buildupVolume, deliveryMode // Assume 200km for buildup shipments
      );
      totalBuildupCost += buildupCost;
    }
    
    // Calculate capacity utilization
    const currentCapacity = 1000; // Assume 1000 units capacity per product
    const peakCapacity = peakDailyDemand * duration;
    const utilization = SupplyChainMathematicalModel.calculateCapacityUtilization(
      peakCapacity, currentCapacity, 0.85 // 85% efficiency
    );
    capacityUtilization[product.id] = utilization;
    
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

  // Enhanced cost calculations using mathematical models
  const scalingCost = (duration / 30) * 50000 * (increasePercentage / 100);
  const deliveryModeFactors = getDeliveryModeFactors(deliveryMode);
  const transportCost = SupplyChainMathematicalModel.calculateTransportCost(
    300, totalProjectedDemand * 0.1, deliveryMode // Assume 300km average and 10% requires extra transport
  );
  
  // Calculate risk-adjusted cost
  const riskFactors = {
    'capacity_constraint': stockoutRisk > 20 ? 0.6 : 0.3,
    'demand_spike': increasePercentage > 100 ? 0.4 : 0.2
  };
  const riskAdjustedCost = SupplyChainMathematicalModel.calculateRiskAdjustedCost(
    scalingCost + transportCost + totalBuildupCost, riskFactors
  );

  // Calculate carbon impact
  const carbonChange = SupplyChainMathematicalModel.calculateCarbonFootprint(
    300, totalProjectedDemand * 0.1, deliveryMode
  );

  // Calculate dynamic pricing opportunities
  const basePrice = 100;
  const supply = totalSupplyFromBuildup;
  const demand = totalProjectedDemand;
  const elasticity = 1.2; // Lower elasticity during peak season
  const dynamicPrice = SupplyChainMathematicalModel.calculateDynamicPrice(
    basePrice, demand, supply, elasticity
  );

  // Calculate optimal service level for peak season
  const avgHoldingCost = inventory.reduce((sum, p) => {
    const mockData = MOCK_INVENTORY_DATA[p.id as keyof typeof MOCK_INVENTORY_DATA];
    return sum + (mockData?.holdingCost || 5);
  }, 0) / inventory.length;
  
  const stockoutCost = stockoutRisk * totalProjectedDemand * 0.1; // Assume 10% of demand is lost during stockout
  const optimalServiceLevel = SupplyChainMathematicalModel.optimizeServiceLevel(
    totalProjectedDemand, 7, avgHoldingCost, stockoutCost
  );

  const result = {
    summary: {
      scenario: "Peak Season",
      description: `Simulated a ${increasePercentage}% demand increase over ${duration} days with ${preparationTime} days to prepare.`,
    },
    impact: {
      cost: { 
        change: riskAdjustedCost, 
        percentage: ((riskAdjustedCost / (scalingCost * 2)) * 100).toFixed(2) + '%',
        scalingCost: scalingCost,
        transportCost: transportCost,
        buildupCost: totalBuildupCost,
        dynamicPricing: dynamicPrice - basePrice
      },
      sla: { 
        total_delay_minutes: stockoutRisk > 10 ? 120 : 0, 
        affected_routes: stockoutRisk > 10 ? 25 : 0,
        serviceLevel: optimalServiceLevel,
        capacityUtilization: Object.values(capacityUtilization).reduce((a, b) => a + b, 0) / Object.keys(capacityUtilization).length
      },
      carbon: { 
        change_kg: carbonChange, 
        percentage: ((carbonChange / (scalingCost * 0.1)) * 100).toFixed(2) + '%',
        totalEmission: carbonChange
      },
      inventory: { 
        stockout_risk_percentage: stockoutRisk, 
        affected_products: productsAtRisk,
        optimalEOQ: optimalOrderQuantities,
        capacityUtilization: capacityUtilization
      }
    },
    recommendations: [
      {
        priority: 'High' as const,
        message: `Begin inventory buildup of ${Math.round(Object.values(optimalOrderQuantities).reduce((a, b) => a + b, 0))} units ${preparationTime} days before peak season.`
      },
      {
        priority: 'Medium' as const,
        message: `Scale warehouse capacity to ${(Object.values(capacityUtilization).reduce((a, b) => a + b, 0) / Object.keys(capacityUtilization).length * 100).toFixed(1)}% utilization.`
      },
      {
        priority: 'Low' as const,
        message: `Consider dynamic pricing with ${((dynamicPrice - basePrice) / basePrice * 100).toFixed(1)}% adjustment to optimize revenue.`
      }
    ],
    details: { affectedRoutes: [], reroutedPaths: [] }
  };
  await logSimulationRun('Peak Season', params, result.impact);
  return result;
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
export { logSimulationRun }; 