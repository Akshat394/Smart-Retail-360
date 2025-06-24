import { apiRequest } from '../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      return await apiRequest(url, options);
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getForecastAccuracy() {
    return this.request('/forecast-accuracy');
  }

  async getRoute(deliveryId: string, mode: string = 'balanced') {
    return this.request(`/routes?delivery_id=${deliveryId}&mode=${mode}`);
  }

  async getRecentEvents() {
    return this.request('/events');
  }

  async getInventoryStatus() {
    return this.request('/inventory');
  }

  async getSystemHealth() {
    return this.request('/system-health');
  }

  async getDrivers() {
    return this.request('/drivers');
  }

  async createDriver(driver: any) {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(driver),
    });
  }

  async updateDriver(id: number, updates: any) {
    return this.request(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteDriver(id: number) {
    return this.request(`/drivers/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoutes() {
    return this.request('/routes');
  }

  async createRoute(route: any) {
    return this.request('/routes', {
      method: 'POST',
      body: JSON.stringify(route),
    });
  }

  async updateRoute(id: number, updates: any) {
    return this.request(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getDemandForecast() {
    // Generate mock forecast data for demo
    const forecast = [];
    const baseDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        actual: i < 7 ? Math.floor(Math.random() * 600 + 1000) : null,
        predicted: Math.floor(Math.random() * 600 + 1000),
        confidence: Math.floor(Math.random() * 15 + 85)
      });
    }
    
    return { forecast };
  }

  async getVehicleLocations() {
    return this.request('/vehicles/locations');
  }

  async getTrafficAlerts() {
    return this.request('/traffic-alerts');
  }

  async getOptimizedRoute(routeId: string) {
    return this.request(`/routes/${routeId}/optimized`);
  }

  async getRouteAnalytics() {
    return this.request('/route-analytics');
  }

  async runSimulation(scenario: string, parameters: any) {
    return this.request('/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ scenario, parameters }),
    });
  }

  async getSuppliers() {
    return this.request('/suppliers');
  }

  async getAnomalies() {
    return this.request('/anomalies');
  }
}

export const apiService = new ApiService();