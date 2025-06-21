import { useState, useEffect, useCallback } from 'react';

interface RealTimeData {
  forecastAccuracy: number;
  onTimeDelivery: number;
  carbonFootprint: number;
  inventoryTurnover: number;
  activeOrders: number;
  routesOptimized: number;
  anomaliesDetected: number;
  costSavings: number;
}

export const useRealTimeData = () => {
  const [data, setData] = useState<RealTimeData>({
    forecastAccuracy: 87.4,
    onTimeDelivery: 94.2,
    carbonFootprint: 2.8,
    inventoryTurnover: 12.3,
    activeOrders: 1847,
    routesOptimized: 342,
    anomaliesDetected: 3,
    costSavings: 284750
  });

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const updateData = useCallback(() => {
    setData(prev => ({
      ...prev,
      forecastAccuracy: Math.max(80, Math.min(95, prev.forecastAccuracy + (Math.random() - 0.5) * 0.5)),
      onTimeDelivery: Math.max(90, Math.min(98, prev.onTimeDelivery + (Math.random() - 0.5) * 0.3)),
      carbonFootprint: Math.max(2.0, Math.min(4.0, prev.carbonFootprint + (Math.random() - 0.5) * 0.1)),
      activeOrders: prev.activeOrders + Math.floor((Math.random() - 0.5) * 10),
      routesOptimized: prev.routesOptimized + Math.floor(Math.random() * 3),
      anomaliesDetected: Math.max(0, prev.anomaliesDetected + (Math.random() > 0.9 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0)),
      costSavings: prev.costSavings + Math.floor((Math.random() - 0.5) * 1000)
    }));
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    // Simulate WebSocket connection
    setIsConnected(true);
    
    // Update data every 3 seconds
    const interval = setInterval(updateData, 3000);

    // Simulate occasional connection issues
    const connectionCheck = setInterval(() => {
      if (Math.random() > 0.95) {
        setIsConnected(false);
        setTimeout(() => setIsConnected(true), 2000);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(connectionCheck);
    };
  }, [updateData]);

  return {
    data,
    isConnected,
    lastUpdate,
    refresh: updateData
  };
};