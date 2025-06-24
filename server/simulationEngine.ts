import { storage } from "./storage";
import { dijkstraShortestPath } from './storage';
import { INDIAN_CITY_GRAPH, INDIAN_CITIES } from './demo-data';
import type { Route, SimulationParams, SimulationReport } from "@shared/schema";

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

export class SimulationEngine {
  constructor() {
    // In the future, we could inject dependencies like a logger here.
  }

  public async run(params: SimulationParams): Promise<SimulationReport> {
    switch (params.scenario) {
      case 'weather_event':
        return this.runWeatherEvent(params.parameters);
      case 'demand_spike':
        return this.runDemandSpike(params.parameters);
      case 'supplier_outage':
        return this.runSupplierOutage(params.parameters);
      default:
        throw new Error('Invalid simulation scenario');
    }
  }

  private async runWeatherEvent(parameters: SimulationParams['parameters']): Promise<SimulationReport> {
    // Fetch all active routes
    const allRoutes = await storage.getAllRoutes();
    const activeRoutes = allRoutes.filter(r => r.status === 'active' && r.destination && r.coordinates);

    if (!parameters.city || !parameters.eventType) {
      throw new Error("City and event type are required for weather event simulation.");
    }
    
    const eventCity = INDIAN_CITIES.find(c => c.name.toLowerCase() === parameters.city!.toLowerCase());
    if (!eventCity) {
      throw new Error(`City '${parameters.city}' not found in the list of Indian cities.`);
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
    const impactFactor = IMPACT_FACTORS.weather[parameters.eventType][parameters.severity];

    for (const city in modifiedGraph) {
      if (city.toLowerCase() === parameters.city.toLowerCase()) {
        for (const connection of modifiedGraph[city]) {
          if (parameters.eventType === 'flood') {
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
        description: `Simulation of a ${parameters.severity} ${parameters.eventType} in ${parameters.city}.`,
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

  private async runDemandSpike(parameters: SimulationParams['parameters']): Promise<SimulationReport> {
    console.log("Running Demand Spike Simulation with params:", parameters);
    // Future implementation will model inventory depletion rates, warehouse capacity,
    // and recommend inventory transfers or expedited shipments.
    return this.generateMockReport('Demand Spike');
  }

  private async runSupplierOutage(parameters: SimulationParams['parameters']): Promise<SimulationReport> {
    console.log("Running Supplier Outage Simulation with params:", parameters);
    // Future implementation will model the impact on the supply chain,
    // calculate stockout risks for dependent products, and suggest alternative suppliers.
    return this.generateMockReport('Supplier Outage');
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