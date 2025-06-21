const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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
}

export const apiService = new ApiService();