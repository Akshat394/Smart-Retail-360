import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, Truck, AlertCircle, CheckCircle, RefreshCw, Plus } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import DriverManagement from './DriverManagement';
import VehicleMap from './VehicleMap';
import type { Route } from '@shared/schema';
import RouteOptimizer from './RouteOptimizer';
import AICommandCenterPanel from './AICommandCenterPanel';

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
  const [activeTab, setActiveTab] = useState<'routes' | 'drivers' | 'ai-command'>('routes');
  
  // City selection and route optimization
  const availableCities = ['Delhi', 'Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad'];
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityRoutes, setCityRoutes] = useState<any[]>([]);
  const [loadingCityRoutes, setLoadingCityRoutes] = useState(false);

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
      
      // ROOT CAUSE FIX: Routes are now properly persisted to database when deliveries start
      // No need for fallback conversion - routes come directly from database
      // This ensures data consistency and proper route management
    } catch (error) {
      console.error('Failed to load routes:', error);
      // On error, show empty state with helpful message
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load routes for selected city
  const loadCityRoutes = async (city: string) => {
    setLoadingCityRoutes(true);
    try {
      // Get active deliveries
      const deliveries: any = await apiService.getActiveDeliveries();
      const cityDeliveries = deliveries.filter((d: any) => 
        d.path?.includes(city) || d.origin === city || d.destination === city
      );
      
      // Also optimize route from Delhi to this city
      if (city !== 'Delhi') {
        try {
          const route: any = await apiService.optimizeRouteWithCO2('Delhi', city, 'balanced', 'truck');
          setCityRoutes([...cityDeliveries, {
            ...route,
            origin: 'Delhi',
            destination: city,
            status: 'available',
            deliveryId: `ROUTE-${city}`,
            path: route.path || ['Delhi', city]
          }]);
        } catch (e) {
          setCityRoutes(cityDeliveries);
        }
      } else {
        setCityRoutes(cityDeliveries);
      }
    } catch (e) {
      console.error('Failed to load city routes:', e);
      setCityRoutes([]);
    } finally {
      setLoadingCityRoutes(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    loadCityRoutes(city);
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

  if (activeTab === 'ai-command') {
    return <AICommandCenterPanel />;
  }

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

      {/* City Selection */}
      <motion.div
        className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">🗺️ Select City to View Routes</h3>
        <div className="flex flex-wrap gap-3">
          {availableCities.map((city) => (
            <button
              key={city}
              onClick={() => handleCitySelect(city)}
              className={`px-6 py-3 rounded-lg border-2 transition-all text-sm font-semibold min-w-[120px] ${
                selectedCity === city
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/50 scale-105'
                  : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:scale-105'
              }`}
            >
              <div className="font-semibold">{city}</div>
              {city === 'Delhi' && <div className="text-xs text-green-400 mt-1 font-bold">📍 HQ</div>}
            </button>
          ))}
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
              {isLoading ? (
                <div className="p-6 text-center text-gray-400">Loading routes...</div>
              ) : routes.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-400 mb-4">No active routes found. Select a city above to view available routes.</p>
                  {selectedCity && cityRoutes.length === 0 && !loadingCityRoutes && (
                    <button
                      onClick={async () => {
                        try {
                          const route: any = await apiService.optimizeRouteWithCO2('Delhi', selectedCity, 'balanced', 'truck');
                          setCityRoutes([{ ...(route || {}), origin: 'Delhi', destination: selectedCity, status: 'available' }]);
                        } catch (e) {
                          console.error('Failed to optimize route:', e);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Optimize Route to {selectedCity}
                    </button>
                  )}
                </div>
              ) : (
                routes.map((route, index) => (
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
                ))
              )}
              
              {/* Show city-specific routes if a city is selected */}
              {selectedCity && cityRoutes.length > 0 && (
                <div className="p-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Routes for {selectedCity}</h3>
                  {cityRoutes.map((route: any, idx: number) => (
                    <div key={route.deliveryId || `city-route-${idx}`} className="bg-gray-900/50 p-4 rounded-lg mb-3 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {route.origin || 'Delhi'} → {route.destination || selectedCity}
                          </div>
                          {route.path && (
                            <div className="text-sm text-gray-400 mt-1">
                              Path: <span className="text-green-300">{route.path.join(' → ')}</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          route.status === 'active' ? 'bg-green-600/20 text-green-400' :
                          route.status === 'available' ? 'bg-blue-600/20 text-blue-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {route.status || 'available'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Distance</div>
                          <div className="text-white font-semibold">{route.totalDistance?.toFixed(2) || 'N/A'} km</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Est. Time</div>
                          <div className="text-white font-semibold">{route.estimatedTime?.toFixed(2) || 'N/A'} hrs</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Est. CO2</div>
                          <div className="text-white font-semibold">{route.estimatedCO2?.toFixed(2) || 'N/A'} kg</div>
                        </div>
                      </div>
                      {route.status === 'available' && (
                        <button
                          onClick={async () => {
                            try {
                              const deliveryId = `DEL-${Date.now()}-${selectedCity}`;
                              await apiService.startDelivery(deliveryId, 'Delhi', selectedCity, 'truck', 'team-1');
                              await loadRoutes();
                              await loadCityRoutes(selectedCity);
                            } catch (e) {
                              console.error('Failed to start delivery:', e);
                            }
                          }}
                          className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Start Delivery
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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