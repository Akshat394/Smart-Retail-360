import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Leaf,
  Zap,
  Target,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const { data: realTimeData, isConnected, lastUpdate } = useRealTimeData();
  const [demandForecastData, setDemandForecastData] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [forecastData, healthData] = await Promise.all([
          apiService.getDemandForecast(),
          apiService.getSystemHealth()
        ]);
        
        setDemandForecastData(forecastData.forecast);
        setSystemHealth(healthData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    {
      title: 'Forecast Accuracy',
      value: `${realTimeData.forecastAccuracy.toFixed(1)}%`,
      change: '+2.3%',
      changeType: 'positive',
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      description: 'MAPE score across all SKUs'
    },
    {
      title: 'On-Time Delivery',
      value: `${realTimeData.onTimeDelivery.toFixed(1)}%`,
      change: '+1.8%',
      changeType: 'positive',
      icon: Truck,
      color: 'from-green-500 to-green-600',
      description: 'SLA compliance rate'
    },
    {
      title: 'Carbon Footprint',
      value: `${realTimeData.carbonFootprint.toFixed(1)} kg CO₂`,
      change: '-12%',
      changeType: 'positive',
      icon: Leaf,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Per delivery optimization'
    },
    {
      title: 'Cost Savings',
      value: `$${realTimeData.costSavings.toLocaleString()}`,
      change: '+18.4%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      description: 'Monthly optimization gains'
    }
  ];

  const routeOptimizationData = [
    { region: 'North', traditional: 120, optimized: 89, savings: 26 },
    { region: 'South', traditional: 98, optimized: 76, savings: 22 },
    { region: 'East', traditional: 145, optimized: 112, savings: 23 },
    { region: 'West', traditional: 87, optimized: 68, savings: 22 },
    { region: 'Central', traditional: 156, optimized: 118, savings: 24 }
  ];

  const inventoryDistribution = [
    { name: 'In Stock', value: 68, color: '#10B981' },
    { name: 'Low Stock', value: 22, color: '#F59E0B' },
    { name: 'Out of Stock', value: 7, color: '#EF4444' },
    { name: 'Overstock', value: 3, color: '#8B5CF6' }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Supply Chain Command Center</h1>
          <p className="text-gray-400 mt-1">Real-time orchestration and AI-powered insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 rounded-lg px-4 py-2 border border-gray-700">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-300">Live Data Stream</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-sm text-gray-300">Reconnecting...</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Last Updated</p>
            <p className="text-sm text-white">{lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  kpi.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {kpi.changeType === 'positive' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{kpi.change}</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg text-gray-300 mb-1">{kpi.title}</h3>
                <p className="text-3xl font-bold text-white mb-2">{kpi.value}</p>
                <p className="text-sm text-gray-500">{kpi.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Forecasting Chart */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Demand Forecasting</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-400">Predicted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-400">Actual</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Route Optimization */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Route Optimization Impact</h3>
            <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm">
              24% Avg. Savings
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeOptimizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="region" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Bar dataKey="traditional" fill="#6B7280" name="Traditional" />
                <Bar dataKey="optimized" fill="#10B981" name="AI Optimized" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Status */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">Inventory Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {inventoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {inventoryDistribution.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Alerts */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">Active Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">High Demand Spike</p>
                <p className="text-xs text-gray-400">SKU-1847 exceeding forecast by 34%</p>
                <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Delivery Delay</p>
                <p className="text-xs text-gray-400">Route NE-42 experiencing traffic delays</p>
                <p className="text-xs text-gray-500 mt-1">12 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400">Auto-Rebalance Complete</p>
                <p className="text-xs text-gray-400">Inventory redistributed across 5 warehouses</p>
                <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Performance */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">System Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Forecast Accuracy</span>
              <span className="text-white font-semibold">{systemHealth?.forecastAccuracy ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">On-Time Delivery</span>
              <span className="text-white font-semibold">{systemHealth?.onTimeDelivery ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Carbon Footprint</span>
              <span className="text-white font-semibold">{systemHealth?.carbonFootprint ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Inventory Turnover</span>
              <span className="text-white font-semibold">{systemHealth?.inventoryTurnover ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Active Orders</span>
              <span className="text-white font-semibold">{systemHealth?.activeOrders ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Routes Optimized</span>
              <span className="text-white font-semibold">{systemHealth?.routesOptimized ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Anomalies Detected</span>
              <span className="text-white font-semibold">{systemHealth?.anomaliesDetected ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Cost Savings</span>
              <span className="text-white font-semibold">{systemHealth?.costSavings ?? '...'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;