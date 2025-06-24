import { storage } from "./storage";
import { dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data';
import type { Route, SimulationParams, SimulationReport, WeatherEventParams, DemandSpikeParams, SupplierOutageParams } from "@shared/schema";

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

export class SimulationEngine {
  constructor() {
    // In the future, we could inject dependencies like a logger here.
  }

  public async run(params: SimulationParams): Promise<SimulationReport> {
    switch (params.scenario) {
      case 'weather_event':
        return this.runWeatherEvent(params);
      case 'demand_spike':
        return this.runDemandSpike(params);
      case 'supplier_outage':
        return this.runSupplierOutage(params);
      default:
        // This case should ideally be unreachable due to TypeScript's discriminated union
        const _exhaustiveCheck: never = params;
        throw new Error(`Invalid simulation scenario: ${(_exhaustiveCheck as any)?.scenario}`);
    }
  }

  private async runWeatherEvent(params: WeatherEventParams): Promise<SimulationReport> {
    const { city, eventType, severity } = params.parameters;
    
    // Fetch all active routes
    const allRoutes = await storage.getAllRoutes();
    const activeRoutes = allRoutes.filter(r => r.status === 'active' && r.destination && r.coordinates);
    
    const eventCity = INDIAN_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
    if (!eventCity) {
      throw new Error(`City '${city}' not found in the list of Indian cities.`);
    }

    // Identify affected routes (within 100km of the event city)
    const affectedRoutes = activeRoutes.filter(route => {
      const routeCoords = route.coordinates as { lat: number, lng: number };
      const distance = getDistance(eventCity.lat, eventCity.lng, routeCoords.lat, routeCoords.lng);
      return distance < 100;
    });

    if (affectedRoutes.length === 0) {
      return this.generateMockReport('Weather Event - No routes affected');
    }

    // Simulate disruption and re-optimize
    const modifiedGraph = JSON.parse(JSON.stringify(INDIAN_CITY_GRAPH)); // Deep copy
    const impactFactor = IMPACT_FACTORS.weather[eventType][severity];

    for (const cityNode in modifiedGraph) {
      if (cityNode.toLowerCase() === city.toLowerCase()) {
        for (const connection of modifiedGraph[cityNode]) {
          if (eventType === 'flood') {
            // Remove a percentage of connections for floods
            if (Math.random() < impactFactor) {
              connection.distance = Infinity;
            }
          } else {
            // Increase distance (cost) for other events to simulate slower travel
            connection.distance /= impactFactor;
          }
        }
      }
    }

    let totalCostChange = 0;
    let totalDelayMinutes = 0;
    let totalCarbonChange = 0;
    const reroutedPaths: any[] = [];

    for (const route of affectedRoutes) {
      const originalDistance = route.distance || 0;
      const startNode = 'New Delhi'; // Assuming all routes start from a central HQ for this simulation
      const endNode = route.destination;

      const reroutedResult = dijkstraShortestPath(modifiedGraph, startNode, endNode);
      if (reroutedResult.distance === Infinity) continue; // No path found

      const newDistance = reroutedResult.distance;

      // Calculate impact
      const distanceChange = newDistance - originalDistance;
      totalCostChange += (distanceChange / originalDistance) * (route.fuelCost || 0);
      totalDelayMinutes += (distanceChange / originalDistance) * (route.estimatedTime || 0);
      totalCarbonChange += (distanceChange / originalDistance) * (route.co2Emission || 0);
      
      reroutedPaths.push({
        routeId: route.routeId,
        originalDistance,
        newDistance,
        path: reroutedResult.path,
      });
    }

    // Generate recommendations based on impact
    const recommendations: SimulationReport['recommendations'] = [];
    if (totalDelayMinutes > 60 * affectedRoutes.length) {
      recommendations.push({
        priority: 'High',
        message: `Significant delays expected. Proactively notify ${affectedRoutes.length} affected customers.`
      });
    }
    if (totalCostChange > 5000) {
      recommendations.push({
        priority: 'Medium',
        message: `Cost increase is substantial. Review contracts with carriers for emergency clauses.`
      });
    }
    recommendations.push({
      priority: 'Low',
      message: 'Monitor weather updates and adjust warehouse staffing for new arrival times.'
    });

    return {
      summary: {
        scenario: 'Weather Event',
        description: `Simulation of a ${severity} ${eventType} in ${city}.`,
      },
      impact: {
        cost: {
          change: totalCostChange,
          percentage: totalCostChange > 0 ? `+${((totalCostChange / 10000) * 100).toFixed(1)}%` : '-0%',
        },
        sla: {
          total_delay_minutes: totalDelayMinutes,
          affected_routes: affectedRoutes.length,
        },
        carbon: {
          change_kg: totalCarbonChange,
          percentage: totalCarbonChange > 0 ? `+${((totalCarbonChange / 500) * 100).toFixed(1)}%` : '-0%',
        },
        inventory: {
          // Mocked as we don't have cargo data per route yet
          stockout_risk_percentage: Math.min(95, (totalDelayMinutes / (60 * affectedRoutes.length)) * 15),
          affected_products: [101, 102],
        },
      },
      recommendations,
      details: {
        affectedRoutes: affectedRoutes.map(r => ({ routeId: r.routeId, destination: r.destination })),
        reroutedPaths,
      },
    };
  }

  private async runDemandSpike(params: DemandSpikeParams): Promise<SimulationReport> {
    const { increasePercentage, duration, productCategory, region } = params.parameters;

    // 1. Fetch relevant inventory. For this demo, we'll use mock data.
    const relevantProductIds = Object.keys(MOCK_INVENTORY_DATA).map(Number);
    const inventory = await storage.getInventoryForProducts(relevantProductIds);

    // 2. Calculate simulated demand and project inventory levels.
    let totalStockoutDays = 0;
    let productsAtRisk: number[] = [];

    for (const item of inventory) {
      const mockData = MOCK_INVENTORY_DATA[item.id as keyof typeof MOCK_INVENTORY_DATA];
      if (!mockData) continue;

      const baseDemand = mockData.daily_consumption;
      const simulatedDemand = baseDemand * (1 + increasePercentage / 100);
      
      const daysUntilStockout = item.quantity / simulatedDemand;
      if (daysUntilStockout < duration) {
        totalStockoutDays += (duration - daysUntilStockout);
        productsAtRisk.push(item.id);
      }
    }
    
    const stockoutRiskPercentage = (totalStockoutDays / (inventory.length * duration)) * 100;

    // 3. Generate recommendations
    const recommendations: SimulationReport['recommendations'] = [];
    if (stockoutRiskPercentage > 20) {
      recommendations.push({
        priority: 'High',
        message: `High stockout risk of ${stockoutRiskPercentage.toFixed(1)}%. Recommend pre-positioning stock in the ${region} region.`
      });
      recommendations.push({
        priority: 'Medium',
        message: 'Consider activating backup suppliers for at-risk products.'
      });
    } else {
      recommendations.push({
        priority: 'Low',
        message: 'Monitor inventory levels closely and prepare for increased fulfillment activity.'
      });
    }

    return {
      summary: {
        scenario: 'Demand Spike',
        description: `Simulation of a ${increasePercentage}% demand increase for ${duration} days in the ${region} region.`,
      },
      impact: {
        cost: { change: stockoutRiskPercentage * 2000, percentage: `+${(stockoutRiskPercentage * 0.5).toFixed(1)}%` },
        sla: { total_delay_minutes: 0, affected_routes: 0 },
        carbon: { change_kg: 0, percentage: '+0%' },
        inventory: { stockout_risk_percentage: stockoutRiskPercentage, affected_products: productsAtRisk },
      },
      recommendations,
      details: { affectedRoutes: [], reroutedPaths: [] },
    };
  }

  private async runSupplierOutage(params: SupplierOutageParams): Promise<SimulationReport> {
    const { supplierId, impactPercentage, duration } = params.parameters;

    // 1. Identify affected products
    const affectedProductIds = Object.entries(MOCK_INVENTORY_DATA)
      .filter(([, data]) => data.supplierId === supplierId)
      .map(([id]) => Number(id));

    const inventory = await storage.getInventoryForProducts(affectedProductIds);

    // 2. Simulate supply reduction and project stock levels
    let totalStockoutDays = 0;
    
    for (const item of inventory) {
      const mockData = MOCK_INVENTORY_DATA[item.id as keyof typeof MOCK_INVENTORY_DATA];
      const baseDemand = mockData.daily_consumption;
      // Incoming supply is assumed to match demand, so we simulate a reduction
      const incomingSupply = baseDemand * (1 - impactPercentage / 100);
      const dailyNetChange = incomingSupply - baseDemand;

      let currentQuantity = item.quantity;
      for (let day = 1; day <= duration; day++) {
        currentQuantity += dailyNetChange;
        if (currentQuantity <= 0) {
          totalStockoutDays += (duration - day + 1);
          break; // Stop counting for this item once it stocks out
        }
      }
    }

    const stockoutRiskPercentage = (totalStockoutDays / (inventory.length * duration)) * 100;

    // 3. Generate recommendations
    const backupSupplier = MOCK_SUPPLIER_DATA[supplierId as keyof typeof MOCK_SUPPLIER_DATA]?.backupSupplierId;
    const recommendations: SimulationReport['recommendations'] = [];
    if (stockoutRiskPercentage > 30) {
      recommendations.push({
        priority: 'High',
        message: `Critical stockout risk of ${stockoutRiskPercentage.toFixed(1)}%. Immediately engage backup supplier (ID: ${backupSupplier}).`
      });
    } else {
       recommendations.push({
        priority: 'Medium',
        message: `Moderate stockout risk detected. Begin sourcing negotiations with backup supplier (ID: ${backupSupplier}).`
      });
    }

     return {
      summary: {
        scenario: 'Supplier Outage',
        description: `Simulation of a ${impactPercentage}% supply reduction from Supplier ${supplierId} for ${duration} days.`,
      },
      impact: {
        cost: { change: stockoutRiskPercentage * 3000, percentage: `+${(stockoutRiskPercentage * 0.7).toFixed(1)}%` },
        sla: { total_delay_minutes: 0, affected_routes: 0 },
        carbon: { change_kg: 0, percentage: '+0%' },
        inventory: { stockout_risk_percentage: stockoutRiskPercentage, affected_products: affectedProductIds },
      },
      recommendations,
      details: { affectedRoutes: [], reroutedPaths: [] },
    };
  }
  
  private generateMockReport(scenario: string): SimulationReport {
    return {
      summary: {
        scenario,
        description: `This is a simulated report for a ${scenario.toLowerCase()} scenario. Full data will be available upon implementation.`,
      },
      impact: {
        cost: { change: 15000, percentage: '+12%' },
        sla: { total_delay_minutes: 4800, affected_routes: 15 },
        carbon: { change_kg: 850, percentage: '+8%' },
        inventory: { stockout_risk_percentage: 35, affected_products: [101, 102, 105] },
      },
      recommendations: [
        { priority: 'High', message: 'Activate alternative routing protocols for the affected region.' },
        { priority: 'Medium', message: 'Increase safety stock for high-demand products in nearby warehouses.' },
      ],
      details: {
        affectedRoutes: [{ routeId: 'ROUTE-MUMBAI', destination: 'Mumbai' }],
        reroutedPaths: [{ from: 'Pune', to: 'Ahmedabad', new_distance: 600 }],
      },
    };
  }
} 