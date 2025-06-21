import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, Truck, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const Routes: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<'fastest' | 'eco' | 'balanced'>('balanced');

  const routes = [
    {
      id: 'RT-001',
      destination: 'Downtown Distribution Center',
      status: 'active',
      driver: 'Mike Johnson',
      vehicle: 'TRK-4521',
      estimatedTime: '45 min',
      distance: '28.5 km',
      fuelCost: '$12.40',
      co2Emission: '6.8 kg',
      stops: 8,
      optimizationSavings: '18%',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    {
      id: 'RT-002', 
      destination: 'North Regional Hub',
      status: 'delayed',
      driver: 'Sarah Chen',
      vehicle: 'TRK-7834',
      estimatedTime: '72 min',
      distance: '45.2 km',
      fuelCost: '$19.80',
      co2Emission: '11.2 kg',
      stops: 12,
      optimizationSavings: '24%',
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    {
      id: 'RT-003',
      destination: 'East Coast Warehouse',
      status: 'completed',
      driver: 'Carlos Rodriguez',
      vehicle: 'TRK-2156',
      estimatedTime: 'Completed',
      distance: '52.1 km',
      fuelCost: '$22.30',
      co2Emission: '13.5 kg',
      stops: 15,
      optimizationSavings: '31%',
      coordinates: { lat: 40.6782, lng: -73.9442 }
    },
    {
      id: 'RT-004',
      destination: 'South Industrial Zone',
      status: 'planning',
      driver: 'Emma Thompson',
      vehicle: 'TRK-9387',
      estimatedTime: '38 min',
      distance: '22.8 km',
      fuelCost: '$9.90',
      co2Emission: '5.4 kg',
      stops: 6,
      optimizationSavings: '15%',
      coordinates: { lat: 40.6892, lng: -74.0445 }
    }
  ];

  const trafficAlerts = [
    {
      id: 'ALT-001',
      type: 'construction',
      location: 'Highway 95, Mile 42',
      impact: 'High',
      delay: '15-20 min',
      affectedRoutes: ['RT-001', 'RT-002']
    },
    {
      id: 'ALT-002',
      type: 'accident',
      location: 'Main St & 5th Ave',
      impact: 'Medium',
      delay: '8-12 min',
      affectedRoutes: ['RT-003']
    },
    {
      id: 'ALT-003',
      type: 'weather',
      location: 'Interstate 287',
      impact: 'Low',
      delay: '3-5 min',
      affectedRoutes: ['RT-004']
    }
  ];

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
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full border text-sm flex items-center space-x-2 ${getStatusColor(route.status)}`}>
                        {getStatusIcon(route.status)}
                        <span className="capitalize">{route.status}</span>
                      </div>
                      <span className="text-lg font-semibold text-white">{route.id}</span>
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
                      <p className="text-sm text-white">{route.driver}</p>
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
                        <span className="text-gray-300">{route.vehicle}</span>
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
          {/* Traffic Alerts */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Traffic Alerts</h3>
            <div className="space-y-3">
              {trafficAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.impact === 'High' ? 'bg-red-500/10 text-red-400' :
                      alert.impact === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {alert.type.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">{alert.delay}</span>
                  </div>
                  <p className="text-sm text-white mb-2">{alert.location}</p>
                  <div className="flex flex-wrap gap-1">
                    {alert.affectedRoutes.map((routeId) => (
                      <span key={routeId} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                        {routeId}
                      </span>
                    ))}
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
                <span className="text-white font-semibold">23/28</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg. Optimization</span>
                <span className="text-green-400 font-semibold">22%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fuel Saved</span>
                <span className="text-green-400 font-semibold">$184.50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CO₂ Reduced</span>
                <span className="text-green-400 font-semibold">89.2 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Time Saved</span>
                <span className="text-blue-400 font-semibold">4.2 hours</span>
              </div>
            </div>
          </motion.div>

          {/* Map Placeholder */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-64"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Live Route Map</h3>
            <div className="h-44 bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Interactive map with real-time</p>
                <p className="text-gray-400">vehicle tracking would appear here</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Routes;