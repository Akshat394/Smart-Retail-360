import React, { useMemo, useEffect, useState, useRef } from 'react';
import { generateSustainabilityData } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf, TrendingUp, TrendingDown, Activity, Zap, RefreshCw } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';

type Props = {
  filters: Filters;
};

interface SustainabilityMetrics {
  totalOrders: number;
  greenOrders: number;
  co2Saved: string;
  greenDeliveryRate: string;
  totalCO2: string;
  totalEnergy: string;
  avgEfficiency: string;
  byZone: Record<string, { co2: number; energy: number; count: number }>;
  byMode: Record<string, { co2: number; energy: number; count: number }>;
  byMonth: Record<string, { co2: number; energy: number; count: number }>;
  blockchainMetrics?: {
    totalCarbonOffset: number;
    totalGreenTokens: number;
    carbonProjects: number;
    sustainabilityScore: number;
  };
}

const mockSuppliers = [
  { name: 'EcoFresh Foods', score: 92, rating: 'A', cdp: 'Gold' },
  { name: 'GreenLogix', score: 88, rating: 'A-', cdp: 'Silver' },
  { name: 'Urban Organics', score: 81, rating: 'B+', cdp: 'Bronze' },
];

// Add mock initiatives for demo
const mockInitiatives = [
  {
    title: 'Solar-Powered Fulfillment Center',
    badge: 'Energy',
    description: 'Installed rooftop solar panels, reducing grid energy use by 30%.',
    color: 'bg-yellow-400 text-yellow-900',
  },
  {
    title: 'EV Delivery Fleet',
    badge: 'Transport',
    description: 'Deployed 50+ electric vehicles for last-mile delivery.',
    color: 'bg-green-400 text-green-900',
  },
  {
    title: 'Zero-Waste Packaging',
    badge: 'Packaging',
    description: 'Switched to compostable and recyclable packaging for all shipments.',
    color: 'bg-blue-400 text-blue-900',
  },
];

const SustainabilityPanel: React.FC<Props> = ({ filters }) => {
  const { showNotification } = useNotification();
  const [metrics, setMetrics] = useState<SustainabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = window.location.port || '5000';
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws`;
      
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('Sustainability WebSocket connected');
          setIsConnected(true);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            // Handle different types of sustainability updates
            if (msg.type === 'sustainability_update' && msg.data) {
              setMetrics(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  ...msg.data,
                  totalOrders: msg.data.totalOrders || prev.totalOrders,
                  greenOrders: msg.data.greenOrders || prev.greenOrders,
                  greenDeliveryRate: msg.data.greenDeliveryRate || prev.greenDeliveryRate
                };
              });
              setLastUpdate(new Date());
              
              // Show notification for significant changes
              if (msg.data.greenDeliveryRate && metrics?.greenDeliveryRate) {
                const oldRate = parseFloat(metrics.greenDeliveryRate);
                const newRate = parseFloat(msg.data.greenDeliveryRate);
                if (newRate > oldRate) {
                  showNotification({ 
                    message: `Green delivery rate improved to ${newRate.toFixed(1)}%!`, 
                    type: 'success', 
                    orderId: 0, 
                    customerName: '' 
                  });
                }
              }
            }
            
            // Handle blockchain sustainability updates
            if (msg.type === 'blockchain_sustainability_update' && msg.data) {
              setMetrics(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  blockchainMetrics: msg.data
                };
              });
              setLastUpdate(new Date());
              
              showNotification({ 
                message: `Carbon offset updated: ${msg.data.totalCarbonOffset}kg CO₂`, 
                type: 'info', 
                orderId: 0, 
                customerName: '' 
              });
            }
            
            // Handle order updates that affect sustainability
            if (msg.type === 'clickcollect_update' && msg.data) {
              // Recalculate sustainability metrics when orders change
              fetchSustainabilityMetrics();
            }
            
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.error('Sustainability WebSocket error:', error);
          setIsConnected(false);
        };
        
        wsRef.current.onclose = () => {
          console.log('Sustainability WebSocket disconnected');
          setIsConnected(false);
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [showNotification, metrics]);

  const fetchSustainabilityMetrics = async () => {
    setLoading(true);
    try {
      // Fetch both regular sustainability metrics and blockchain metrics
      const [sustainabilityRes, blockchainRes] = await Promise.all([
        apiService.getAdvancedSustainabilityMetrics(),
        fetch('/api/blockchain/sustainability/metrics').then(res => res.ok ? res.json() : null)
      ]);
      
      // Ensure sustainabilityRes is properly typed
      const sustainabilityData = sustainabilityRes as any;
      
      const combinedMetrics: SustainabilityMetrics = {
        totalOrders: sustainabilityData.totalOrders || 0,
        greenOrders: sustainabilityData.greenOrders || 0,
        co2Saved: sustainabilityData.co2Saved || '0.0',
        greenDeliveryRate: sustainabilityData.greenDeliveryRate || '0.0',
        totalCO2: sustainabilityData.totalCO2 || '0.0',
        totalEnergy: sustainabilityData.totalEnergy || '0.0',
        avgEfficiency: sustainabilityData.avgEfficiency || '0.0',
        byZone: sustainabilityData.byZone || {},
        byMode: sustainabilityData.byMode || {},
        byMonth: sustainabilityData.byMonth || {},
        blockchainMetrics: blockchainRes ? {
          totalCarbonOffset: blockchainRes.totalCarbonOffset || 0,
          totalGreenTokens: blockchainRes.totalGreenTokens || 0,
          carbonProjects: blockchainRes.totalProjects || 0,
          sustainabilityScore: blockchainRes.averageSustainabilityScore || 0
        } : undefined
      };
      
      setMetrics(combinedMetrics);
    } catch (error) {
      console.error('Failed to fetch sustainability metrics:', error);
      // Fallback to mock data
      setMetrics({
        totalOrders: 1500,
        greenOrders: 450,
        co2Saved: '1.2 tons',
        greenDeliveryRate: '30.0',
        totalCO2: '4.2 tons',
        totalEnergy: '12.5 MWh',
        avgEfficiency: '87.5',
        byZone: { 'Zone A': { co2: 1200, energy: 3500, count: 500 }, 'Zone B': { co2: 800, energy: 2400, count: 300 } },
        byMode: { 'Electric': { co2: 400, energy: 1200, count: 200 }, 'Hybrid': { co2: 600, energy: 1800, count: 150 } },
        byMonth: { '2024-01': { co2: 800, energy: 2400, count: 300 }, '2024-02': { co2: 1200, energy: 3600, count: 450 } }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSustainabilityMetrics();
  }, [filters]);

  const handleExport = async () => {
    setCsvLoading(true);
    try {
      const csv = await apiService.exportSustainabilityMetricsCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sustainability_metrics.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      showNotification({ message: 'Failed to export CSV', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setCsvLoading(false);
    }
  };

  if (loading || !metrics) return <div className="text-white p-8">Loading sustainability metrics...</div>;

  const { totalOrders, greenOrders, co2Saved, greenDeliveryRate, totalCO2, totalEnergy, avgEfficiency, byZone, byMode, byMonth, blockchainMetrics } = metrics;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Sustainability Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <button 
            onClick={fetchSustainabilityMetrics}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button 
            className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600" 
            onClick={handleExport} 
            disabled={csvLoading}
          >
            {csvLoading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-400 mb-4">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-green-500/40 shadow-xl">
          <Leaf className="w-8 h-8 text-green-400 mb-2" />
          <div className="text-4xl font-bold text-white">{greenDeliveryRate}%</div>
          <div className="text-lg text-green-300 font-semibold">Green Delivery Rate</div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-green-500/40 shadow-xl">
          <div className="text-4xl font-bold text-white">{greenOrders}</div>
          <div className="text-lg text-green-300 font-semibold">Green Orders</div>
          <div className="text-sm text-gray-400">out of {totalOrders} total</div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-green-500/40 shadow-xl">
          <div className="text-4xl font-bold text-white">{co2Saved}</div>
          <div className="text-lg text-green-300 font-semibold">CO₂ Saved</div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-green-500/40 shadow-xl">
          <div className="text-4xl font-bold text-white">{totalCO2}</div>
          <div className="text-lg text-green-300 font-semibold">Total CO₂ Emitted</div>
        </div>
      </div>

      {/* Blockchain Sustainability Metrics */}
      {blockchainMetrics && (
        <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border-2 border-purple-500/40">
          <h3 className="text-lg text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Blockchain Sustainability Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{blockchainMetrics.totalCarbonOffset}kg</div>
              <div className="text-sm text-gray-300">Total Carbon Offset</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{blockchainMetrics.totalGreenTokens}</div>
              <div className="text-sm text-gray-300">Green Tokens Minted</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{blockchainMetrics.carbonProjects}</div>
              <div className="text-sm text-gray-300">Carbon Projects</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{blockchainMetrics.sustainabilityScore}</div>
              <div className="text-sm text-gray-300">Sustainability Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Sustainability Scorecards */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4">Supplier Sustainability Scorecards (EcoVadis/CDP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockSuppliers.map(s => (
            <div key={s.name} className="bg-gray-900 rounded-lg p-4 border border-green-500/30">
              <div className="text-xl text-green-300 font-bold mb-1">{s.name}</div>
              <div className="text-lg text-white">Score: <span className="font-bold">{s.score}</span> ({s.rating})</div>
              <div className="text-sm text-gray-400">CDP: {s.cdp}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Breakdown by Zone */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4">CO₂ Emissions by Zone</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={Object.entries(byZone).map(([zone, d]: any) => ({ zone, co2: d.co2, energy: d.energy }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="zone" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="co2" fill="#10B981" name="CO₂ (kg)" />
            <Bar dataKey="energy" fill="#3B82F6" name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Breakdown by Delivery Mode */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4">CO₂ Emissions by Delivery Mode</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={Object.entries(byMode).map(([mode, d]: any) => ({ mode, co2: d.co2, energy: d.energy }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="mode" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="co2" fill="#10B981" name="CO₂ (kg)" />
            <Bar dataKey="energy" fill="#3B82F6" name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Breakdown by Month */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4">CO₂ Emissions by Month</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={Object.entries(byMonth).map(([month, d]: any) => ({ month, co2: d.co2, energy: d.energy }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="co2" fill="#10B981" name="CO₂ (kg)" />
            <Bar dataKey="energy" fill="#3B82F6" name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Efficiency Score */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4">Average Delivery Efficiency Score</h3>
        <div className="text-3xl text-green-300 font-bold">{avgEfficiency}</div>
      </div>

      {/* Recent Green Initiatives (Demo) */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8">
        <h3 className="text-lg text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Recent Green Initiatives
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockInitiatives.map((i) => (
            <div key={i.title} className="bg-gray-900 rounded-lg p-4 border border-green-500/30 flex flex-col gap-2 shadow-md">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${i.color}`}>{i.badge}</span>
              <div className="text-lg text-white font-semibold">{i.title}</div>
              <div className="text-sm text-gray-300">{i.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SustainabilityPanel;
export type { Props as SustainabilityPanelProps }; 