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

  async getMLPrediction(data: number[], params: any = {}) {
    return this.request('/ml-predict', {
      method: 'POST',
      body: JSON.stringify({ data, params }),
    });
  }

  async getMLExplanation(data: number[], params: any = {}) {
    return this.request('/ml-explain', {
      method: 'POST',
      body: JSON.stringify({ data, params }),
    });
  }

  async optimizeRoute(stops: string[]) {
    return this.request('/route-optimize', {
      method: 'POST',
      body: JSON.stringify({ stops }),
    });
  }

  async assignAutonomousDelivery(orderId: number, mode: string) {
    return this.request('/autonomous-deliveries/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, mode }),
    });
  }

  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    return this.request(`/geocode?address=${encodeURIComponent(address)}`);
  }

  async getAutonomousDeliveries() {
    return this.request('/autonomous-deliveries');
  }

  // Generic GET method for any endpoint
  async get(endpoint: string) {
    return this.request(endpoint);
  }

  // Warehouse 3D layout
  async getWarehouseLayout() {
    return this.request('/warehouse/3d-layout');
  }

  // Robot health data
  async getRobotHealthData() {
    return this.request('/real-time/robot-health');
  }

  // Click and collect orders
  async getClickCollectOrders(channel?: string) {
    const url = channel ? `/clickcollect?channel=${channel}` : '/clickcollect';
    return this.request(url);
  }

  async createClickCollectOrder(order: any) {
    return this.request('/clickcollect', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async updateClickCollectOrder(id: number, updates: any) {
    return this.request(`/clickcollect/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // AI recommendations
  async getAIRecommendations() {
    return this.request('/ai-recommendations');
  }

  async executeAIAction(action: string, data: any) {
    return this.request(`/ai-action/${action}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Sustainability metrics
  async getSustainabilityMetrics() {
    return this.request('/sustainability-metrics?demo=1');
  }

  async getGreenLeaderboard() {
    return this.request('/green-leaderboard');
  }

  // Warehouse tasks
  async getWarehouseTasks() {
    return this.request('/warehouse/tasks');
  }

  async createWarehouseTask(task: any) {
    return this.request('/warehouse/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateWarehouseTask(id: number, updates: any) {
    return this.request(`/warehouse/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Notifications
  async getNotifications(customerName: string) {
    return this.request(`/notifications?customerName=${encodeURIComponent(customerName)}`);
  }

  async markNotificationRead(id: number) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Push notification methods
  async createPushSubscription(subscription: any) {
    return this.request('/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  async deletePushSubscription(endpoint: string) {
    return this.request('/push-subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  }

  async getNotificationHistory() {
    return this.request('/notification-history');
  }

  async updateNotificationPreferences(preferences: any) {
    return this.request('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async recommendRoute(graph: any, start: string, end: string) {
    return this.request('/recommend/route', {
      method: 'POST',
      body: JSON.stringify({ graph, start, end }),
    });
  }

  async optimizeStock(supply: number[], demand: number[], cost_matrix: number[][]) {
    return this.request('/optimize/stock', {
      method: 'POST',
      body: JSON.stringify({ supply, demand, cost_matrix }),
    });
  }

  async getAdvancedSustainabilityMetrics() {
    return this.request('/sustainability-metrics?demo=1');
  }

  async exportSustainabilityMetricsCSV() {
    const response = await fetch(`${API_BASE_URL}/sustainability-metrics/export`, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    return response.text();
  }

  async getERPProducts() {
    return this.request('/erp/products');
  }

  async createERPPurchaseOrder(order: any) {
    return this.request('/erp/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async syncERPInventory() {
    return this.request('/erp/sync-inventory', { method: 'POST' });
  }

  async syncERPOrders() {
    return this.request('/erp/sync-orders', { method: 'POST' });
  }

  async getERPSyncLogs() {
    return this.request('/erp/sync-logs');
  }
}

export const apiService = new ApiService();