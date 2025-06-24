import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, Truck, AlertCircle, CheckCircle, RefreshCw, Plus } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import DriverManagement from './DriverManagement';
import VehicleMap from './VehicleMap';
import type { Route } from '@shared/schema';
import RouteOptimizer from './RouteOptimizer';

type RouteWithDriver = Route & { driverName: string | null };

const Routes: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<'fastest' | 'eco' | 'balanced'>('balanced');
  const [routes, setRoutes] = useState<RouteWithDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'routes' | 'drivers'>('routes');
  const [routeAnalytics, setRouteAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const canManageRoutes = user && ['admin', 'manager', 'operations'].includes(user.role);

  useEffect(() => {
    loadRoutes();
    loadRouteAnalytics();
    loadTrafficAlerts();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await apiService.getRoutes();
      setRoutes(data as RouteWithDriver[]);
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRouteAnalytics = async () => {
    try {
      const data = await apiService.getRouteAnalytics();
      setRouteAnalytics(data);
    } catch (error) {
      setRouteAnalytics(null);
    }
  };

  const loadTrafficAlerts = async () => {
    try {
      const data = await apiService.getTrafficAlerts();
      setAlerts(data as any[]);
    } catch (error) {
      setAlerts([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'delayed': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'planning': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Navigation className="w-4 h-4" />;
      case 'delayed': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'planning': return <Clock className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (activeView === 'drivers') {
    return <DriverManagement />;
  }

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
          <h1 className="text-3xl font-bold text-white">Route Optimization</h1>
          <p className="text-gray-400 mt-1">AI-powered delivery route planning with real-time traffic integration</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={optimizationMode}
            onChange={(e) => setOptimizationMode(e.target.value as 'fastest' | 'eco' | 'balanced')}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fastest">Fastest Route</option>
            <option value="eco">Eco-Friendly</option>
            <option value="balanced">Balanced</option>
          </select>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Recalculate All</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            className="bg-gray-800 rounded-xl border border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Active Routes</h2>
              <p className="text-sm text-gray-400 mt-1">Real-time route monitoring and optimization</p>
            </div>
            <div className="divide-y divide-gray-700">
              {routes.map((route, index) => (
                <motion.div
                  key={route.id}
                  className={`p-6 cursor-pointer transition-all duration-200 hover:bg-gray-700/50 ${
                    selectedRoute === route.id ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => setSelectedRoute(route.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-white">{route.destination}</span>
                      <span className="text-xs text-gray-400">{route.routeId}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm flex items-center space-x-2 ${getStatusColor(route.status)}`}> 
                      {getStatusIcon(route.status)}
                      <span className="capitalize">{route.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Optimization Savings</p>
                      <p className="text-lg font-bold text-green-400">{route.optimizationSavings}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400">Destination</p>
                      <p className="text-sm text-white font-medium">{route.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Driver</p>
                      <p className="text-sm text-white">{route.driverName || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">ETA</p>
                      <p className="text-sm text-white">{route.estimatedTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Distance</p>
                      <p className="text-sm text-white">{route.distance}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{route.stops} stops</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{route.vehicleId}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-300">Fuel: {route.fuelCost}</span>
                      <span className="text-gray-300">CO₂: {route.co2Emission}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Live Route Map */}
          <motion.div
            className="bg-gray-800 rounded-xl p-4 border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Live Route Map</h3>
            <VehicleMap routeId={selectedRoute !== null ? routes.find(r => r.id === selectedRoute)?.routeId : undefined} />
          </motion.div>

          {/* Traffic Alerts */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Traffic Alerts</h3>
            <div className="space-y-3">
              {alerts.length === 0 && <div className="text-gray-400">No active traffic alerts.</div>}
              {alerts.map((alert, idx) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">{alert.type.toUpperCase()}</p>
                    <p className="text-xs text-gray-400">Impact: {alert.impact} | Delay: {alert.delay}</p>
                    <p className="text-xs text-gray-500 mt-1">Affected Routes: {alert.affectedRoutes?.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Route Analytics */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Today's Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Routes Completed</span>
                <span className="text-white font-semibold">{routeAnalytics?.routesCompleted ?? '...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg. Optimization</span>
                <span className="text-green-400 font-semibold">{routeAnalytics?.avgOptimization ?? '...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fuel Saved</span>
                <span className="text-green-400 font-semibold">{routeAnalytics?.fuelSaved ?? '...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CO₂ Reduced</span>
                <span className="text-green-400 font-semibold">{routeAnalytics?.co2Reduced ?? '...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Time Saved</span>
                <span className="text-blue-400 font-semibold">{routeAnalytics?.timeSaved ?? '...'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Routes;