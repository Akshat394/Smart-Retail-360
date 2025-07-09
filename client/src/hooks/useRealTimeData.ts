import { useState, useEffect, useCallback, useRef } from 'react';

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.hostname;
      // Use port 5000 explicitly since window.location.host might not include the port in development
      const wsPort = window.location.port || '5000';
      const wsUrl = `${protocol}//${wsHost}:${wsPort}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'data_update' && message.data) {
            const { table, operation, data: updateData } = message.data;
            
            if (table === 'system_metrics' && operation === 'INSERT') {
              setData({
                forecastAccuracy: updateData.forecast_accuracy || 87.4,
                onTimeDelivery: updateData.on_time_delivery || 94.2,
                carbonFootprint: updateData.carbon_footprint || 2.8,
                inventoryTurnover: updateData.inventory_turnover || 12.3,
                activeOrders: updateData.active_orders || 1847,
                routesOptimized: updateData.routes_optimized || 342,
                anomaliesDetected: updateData.anomalies_detected || 3,
                costSavings: updateData.cost_savings || 284750
              });
              setLastUpdate(new Date());
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

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

  // Fallback: Update data every 5 seconds when not connected
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(updateData, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, updateData]);

  return {
    data,
    isConnected,
    lastUpdate,
    reconnect: connectWebSocket
  };
};