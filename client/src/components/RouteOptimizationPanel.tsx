import React, { useMemo, useState, useEffect } from 'react';
import { generateRouteOptimizationData, generateVehicles } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import VehicleMapPanel from './VehicleMapPanel';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';

type Props = {
  filters: Filters;
};

const regionToStates: Record<string, string[]> = {
  North: ['Delhi'],
  South: ['Karnataka', 'Tamil Nadu'],
  East: ['West Bengal'],
  West: ['Maharashtra'],
  Central: [], // Add more if needed
};

const stateToRegion: Record<string, string> = {};
Object.entries(regionToStates).forEach(([region, states]) => {
  states.forEach(state => {
    stateToRegion[state] = region;
  });
});

const RouteOptimizationPanel: React.FC<Props> = ({ filters }) => {
  const [activeTab, setActiveTab] = useState<'optimization' | 'vehicleMap'>('optimization');
  const [highlightRegion, setHighlightRegion] = useState<string | null>(null);
  const [highlightVehicleId, setHighlightVehicleId] = useState<number | null>(null);

  const routeOptimizationData = useMemo(() => generateRouteOptimizationData(), []) as any[];
  const vehicles = useMemo(() => generateVehicles(), []) as any[];

  const deliveryModes = ['Truck', 'Mini Truck', 'Drone', 'Autonomous Vehicle'];
  const [selectedModes, setSelectedModes] = useState<string[]>(deliveryModes);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v: any) => selectedModes.includes(v.deliveryMode));
  }, [vehicles, selectedModes]);

  // For demo, filter by reducing savings and route counts
  const filtered = useMemo(() => {
    let factor = 1;
    if (filters.yearRange.min !== 2021 || filters.yearRange.max !== 2024) factor *= 0.8;
    if (filters.month.length > 0) factor *= 0.9;
    if (filters.state.length > 0) factor *= 0.9;
    if (filters.city.length > 0) factor *= 0.95;
    return routeOptimizationData.map(d => ({
      ...d,
      traditional: Math.round(d.traditional * factor),
      optimized: Math.round(d.optimized * factor),
      savings: Math.round(d.savings * factor),
    }));
  }, [routeOptimizationData, filters]);

  const totalSavings = filtered.reduce((acc, item) => acc + item.savings, 0);

  // Helper: get vehicle IDs for a region
  const getVehicleIdsForRegion = (region: string) => {
    const states = regionToStates[region] || [];
    return vehicles.filter(v => states.includes(v.state)).map(v => v.id);
  };

  // Helper: get region for a vehicle
  const getRegionForVehicle = (vehicleId: number) => {
    const v = vehicles.find(v => v.id === vehicleId);
    return v ? stateToRegion[v.state] : null;
  };

  // Helper to get bar color for each region
  const getBarColor = (region: string, base: string, highlight: string) => highlightRegion && region === highlightRegion ? highlight : base;

  const { showNotification } = useNotification();

  // Admin state for route optimization
  const [routeGraph, setRouteGraph] = useState<any>({});
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Available cities for route optimization - These are the main cities we serve
  const availableCities: string[] = ['Delhi', 'Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad'];
  
  // Debug: Log cities to ensure they're available
  React.useEffect(() => {
    console.log('Available cities:', availableCities);
  }, []);
  
  // New comprehensive route optimization state
  const [origin, setOrigin] = useState('Delhi');
  const [destination, setDestination] = useState('Pune');
  const [optimizationMode, setOptimizationMode] = useState<'distance' | 'co2' | 'time' | 'balanced'>('balanced');
  const [vehicleType, setVehicleType] = useState('truck');
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCityRoutes, setSelectedCityRoutes] = useState<any[]>([]);
  const [loadingCityRoutes, setLoadingCityRoutes] = useState(false);

  // Admin state for stock optimization
  const [supply, setSupply] = useState<number[]>([]);
  const [demand, setDemand] = useState<number[]>([]);
  const [costMatrix, setCostMatrix] = useState<number[][]>([]);
  const [stockResult, setStockResult] = useState<any>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Handlers for route optimization
  const handleRouteOptimize = async () => {
    setRouteLoading(true); setRouteError(null);
    try {
      const result = await apiService.recommendRoute(routeGraph, routeStart, routeEnd);
      setRouteResult(result);
    } catch (e: any) {
      setRouteError(e.message || 'Route optimization failed');
    } finally {
      setRouteLoading(false);
    }
  };

  // Comprehensive route optimization with CO2 and time
  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    setRouteError(null);
    try {
      const result = await apiService.optimizeRouteWithCO2(origin, destination, optimizationMode, vehicleType);
      setOptimizedRoute(result);
      showNotification({ message: 'Route optimized successfully!', type: 'success', orderId: 0, customerName: '' });
    } catch (e: any) {
      setRouteError(e.message || 'Route optimization failed');
      showNotification({ message: 'Failed to optimize route', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setOptimizing(false);
    }
  };

  // Start delivery - mint token
  const handleStartDelivery = async () => {
    if (!optimizedRoute) {
      showNotification({ message: 'Please optimize a route first', type: 'warning', orderId: 0, customerName: '' });
      return;
    }
    setOptimizing(true);
    try {
      const deliveryId = `DEL-${Date.now()}`;
      const result: any = await apiService.startDelivery(deliveryId, origin, destination, vehicleType, 'team-1');
      showNotification({ message: `Delivery started! Token minted: ${result.tokenMinted}`, type: 'success', orderId: 0, customerName: '' });
      await loadActiveDeliveries();
    } catch (e: any) {
      showNotification({ message: e.message || 'Failed to start delivery', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setOptimizing(false);
    }
  };

  // Complete delivery - burn token and award credits
  const handleCompleteDelivery = async (deliveryId: string) => {
    setOptimizing(true);
    try {
      // Simulate actual values (in real app, these come from tracking)
      const actualTime = optimizedRoute?.estimatedTime * 0.9; // 10% faster
      const actualCO2 = optimizedRoute?.estimatedCO2 * 0.85; // 15% less CO2
      
      const result: any = await apiService.completeDelivery(deliveryId, actualTime, actualCO2);
      showNotification({
        message: `Delivery completed! Credits: ${result.creditsAwarded}, CO2 Saved: ${result.co2Saved?.toFixed(2)}kg`,
        type: 'success',
        orderId: 0,
        customerName: ''
      });
      await loadActiveDeliveries();
      setOptimizedRoute(null);
    } catch (e: any) {
      showNotification({ message: e.message || 'Failed to complete delivery', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setOptimizing(false);
    }
  };

  // Load active deliveries
  const loadActiveDeliveries = async () => {
    try {
      const deliveries: any = await apiService.getActiveDeliveries();
      setActiveDeliveries(Array.isArray(deliveries) ? deliveries : []);
    } catch (e) {
      console.error('Failed to load active deliveries:', e);
    }
  };

  // Load routes for selected city
  const loadCityRoutes = async (city: string) => {
    setLoadingCityRoutes(true);
    try {
      // Get all active deliveries that involve this city
      const deliveries: any = await apiService.getActiveDeliveries();
      const cityRoutes = deliveries.filter((d: any) => 
        d.path?.includes(city) || d.origin === city || d.destination === city
      );
      
      // Also get routes from Delhi (HQ) to this city
      if (city !== 'Delhi') {
        try {
          const route: any = await apiService.optimizeRouteWithCO2('Delhi', city, 'balanced', 'truck');
          setSelectedCityRoutes([...cityRoutes, {
            ...(route || {}),
            origin: 'Delhi',
            destination: city,
            status: 'available',
            deliveryId: `ROUTE-${city}`
          }]);
        } catch (e) {
          setSelectedCityRoutes(cityRoutes);
        }
      } else {
        setSelectedCityRoutes(cityRoutes);
      }
    } catch (e) {
      console.error('Failed to load city routes:', e);
      setSelectedCityRoutes([]);
    } finally {
      setLoadingCityRoutes(false);
    }
  };

  // Handle city selection
  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setDestination(city); // Auto-set as destination
    loadCityRoutes(city);
  };

  // Load active deliveries on mount
  React.useEffect(() => {
    loadActiveDeliveries();
    const interval = setInterval(loadActiveDeliveries, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handlers for stock optimization
  const handleStockOptimize = async () => {
    setStockLoading(true); setStockError(null);
    try {
      const result = await apiService.optimizeStock(supply, demand, costMatrix);
      setStockResult(result);
    } catch (e: any) {
      setStockError(e.message || 'Stock optimization failed');
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">AI Route Optimization</h2>
      
      {/* City Selection and Active Routes - Moved to top for visibility */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border-2 border-indigo-500/30">
        <h3 className="text-xl font-bold text-white mb-4">🗺️ Select City to View Routes</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {availableCities && availableCities.length > 0 ? (
            availableCities.map((city) => (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className={`px-6 py-4 rounded-lg border-2 transition-all text-sm font-semibold min-w-[120px] ${
                  selectedCity === city
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/50 scale-105'
                    : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:scale-105'
                }`}
              >
                <div className="font-semibold text-base">{city}</div>
                {city === 'Delhi' && (
                  <div className="text-xs text-green-400 mt-1 font-bold">📍 HQ</div>
                )}
              </button>
            ))
          ) : (
            <div className="text-gray-400 text-lg">No cities available</div>
          )}
        </div>

        {selectedCity && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-white">
                Routes for {selectedCity}
                {selectedCity === 'Delhi' && <span className="text-green-400 ml-2">(Headquarters)</span>}
              </h4>
              {loadingCityRoutes && <div className="text-indigo-300 text-sm">Loading...</div>}
            </div>

            {selectedCityRoutes.length > 0 ? (
              <div className="space-y-3">
                {selectedCityRoutes.map((route, idx) => (
                  <div key={route.deliveryId || `route-${idx}`} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-white font-semibold">
                            {route.origin || 'Delhi'} → {route.destination || selectedCity}
                          </div>
                          {route.status && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              route.status === 'active' ? 'bg-green-600/20 text-green-400' :
                              route.status === 'available' ? 'bg-blue-600/20 text-blue-400' :
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {route.status}
                            </span>
                          )}
                        </div>
                        {route.path && (
                          <div className="text-sm text-gray-400 mb-1">
                            Path: <span className="text-green-300">{route.path.join(' → ')}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4 text-sm mt-2">
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
                        {route.actualTime && route.actualCO2 && (
                          <div className="grid grid-cols-2 gap-4 text-sm mt-2 pt-2 border-t border-gray-700">
                            <div>
                              <div className="text-gray-400">Actual Time</div>
                              <div className={`font-semibold ${
                                route.actualTime < route.estimatedTime ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {route.actualTime.toFixed(2)} hrs
                                {route.timeSaved && route.timeSaved > 0 && (
                                  <span className="text-green-400 ml-1">(-{route.timeSaved.toFixed(2)} hrs)</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400">Actual CO2</div>
                              <div className={`font-semibold ${
                                route.actualCO2 < route.estimatedCO2 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {route.actualCO2.toFixed(2)} kg
                                {route.co2Saved && route.co2Saved > 0 && (
                                  <span className="text-green-400 ml-1">(-{route.co2Saved.toFixed(2)} kg)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {route.tokenMinted && (
                          <div className="text-sm text-green-400 mt-2">
                            <span className="font-semibold">Token:</span> {route.tokenMinted}
                            {route.tokenBurned && <span className="ml-2 text-red-400">(Burned)</span>}
                          </div>
                        )}
                        {route.creditsAwarded && route.creditsAwarded > 0 && (
                          <div className="text-sm text-yellow-400 mt-1">
                            <span className="font-semibold">Credits Awarded:</span> {route.creditsAwarded}
                          </div>
                        )}
                      </div>
                      {route.status === 'active' && route.deliveryId && (
                        <button
                          className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm whitespace-nowrap"
                          onClick={() => handleCompleteDelivery(route.deliveryId)}
                          disabled={optimizing}
                        >
                          Complete
                        </button>
                      )}
                      {route.status === 'available' && (
                        <button
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm whitespace-nowrap"
                          onClick={async () => {
                            try {
                              const deliveryId = `DEL-${Date.now()}-${selectedCity}`;
                              const result: any = await apiService.startDelivery(deliveryId, 'Delhi', selectedCity, vehicleType, 'team-1');
                              showNotification({ message: `Delivery started! Token minted: ${result.tokenMinted}`, type: 'success', orderId: 0, customerName: '' });
                              await loadCityRoutes(selectedCity);
                              await loadActiveDeliveries();
                            } catch (e: any) {
                              showNotification({ message: e.message || 'Failed to start delivery', type: 'error', orderId: 0, customerName: '' });
                            }
                          }}
                          disabled={optimizing}
                        >
                          Start Delivery
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {loadingCityRoutes ? (
                  <div>Loading routes...</div>
                ) : (
                  <>
                    <div className="mb-2">No active routes to {selectedCity}</div>
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                      onClick={async () => {
                        try {
                          const route = await apiService.optimizeRouteWithCO2('Delhi', selectedCity, 'balanced', 'truck');
                          setOptimizedRoute(route);
                          setDestination(selectedCity);
                          showNotification({ message: `Route optimized for ${selectedCity}!`, type: 'success', orderId: 0, customerName: '' });
                        } catch (e: any) {
                          showNotification({ message: e.message || 'Failed to optimize route', type: 'error', orderId: 0, customerName: '' });
                        }
                      }}
                    >
                      Optimize Route to {selectedCity}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comprehensive Route Optimization with CO2 & Blockchain */}
      <div className="bg-gray-800/80 rounded-xl p-4 mb-6">
        <h3 className="text-lg text-white mb-4">Route Optimization (Delhi HQ → Destination)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Origin (HQ: Delhi)</label>
            <input
              className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder="Delhi"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Destination</label>
            <input
              className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Pune"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Optimization Mode</label>
            <select
              className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700"
              value={optimizationMode}
              onChange={e => setOptimizationMode(e.target.value as any)}
            >
              <option value="balanced">Balanced (CO2 + Time)</option>
              <option value="co2">Minimize CO2</option>
              <option value="time">Minimize Time</option>
              <option value="distance">Minimize Distance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Vehicle Type</label>
            <select
              className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700"
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
            >
              <option value="truck">Truck</option>
              <option value="mini_truck">Mini Truck</option>
              <option value="drone">Drone</option>
              <option value="autonomous_vehicle">Autonomous Vehicle</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleOptimizeRoute}
            disabled={optimizing}
          >
            {optimizing ? 'Optimizing...' : 'Optimize Route'}
          </button>
          {optimizedRoute && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleStartDelivery}
              disabled={optimizing}
            >
              Start Delivery (Mint Token)
            </button>
          )}
        </div>
        {optimizedRoute && (
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Optimized Route Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Path</div>
                <div className="text-green-300">{optimizedRoute.path?.join(' → ')}</div>
              </div>
              <div>
                <div className="text-gray-400">Distance</div>
                <div className="text-white">{optimizedRoute.totalDistance?.toFixed(2)} km</div>
              </div>
              <div>
                <div className="text-gray-400">Estimated Time</div>
                <div className="text-white">{optimizedRoute.estimatedTime?.toFixed(2)} hrs</div>
              </div>
              <div>
                <div className="text-gray-400">Estimated CO2</div>
                <div className="text-white">{optimizedRoute.estimatedCO2?.toFixed(2)} kg</div>
              </div>
            </div>
          </div>
        )}
        {routeError && <div className="mt-2 text-red-400">{routeError}</div>}
      </div>

      {/* Admin Controls for Route Optimization (Legacy) */}
      <div className="bg-gray-800/80 rounded-xl p-4 mb-6">
        <h3 className="text-lg text-white mb-2">Admin: Route Network Optimization (Legacy)</h3>
        <textarea
          className="w-full p-2 mb-2 rounded bg-gray-900 text-white border border-gray-700"
          rows={4}
          placeholder={'Paste route graph as JSON (e.g. {"A":{"B":2,"C":5}, "B":{"C":1}})'}
          value={JSON.stringify(routeGraph, null, 2)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            try { setRouteGraph(JSON.parse(e.target.value)); setRouteError(null); }
            catch { setRouteError('Invalid JSON'); }
          }}
        />
        <div className="flex space-x-2 mb-2">
          <input className="p-2 rounded bg-gray-900 text-white border border-gray-700" placeholder="Start node" value={routeStart} onChange={e => setRouteStart(e.target.value)} />
          <input className="p-2 rounded bg-gray-900 text-white border border-gray-700" placeholder="End node" value={routeEnd} onChange={e => setRouteEnd(e.target.value)} />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleRouteOptimize} disabled={routeLoading}>Optimize Route</button>
        </div>
        {routeLoading && <div className="text-indigo-300">Optimizing...</div>}
        {routeError && <div className="text-red-400">{routeError}</div>}
        {routeResult && (
          <div className="mt-2 text-green-300">
            <div>Path: {routeResult.path?.join(' → ')}</div>
            <div>Total Cost: {routeResult.total_cost}</div>
          </div>
        )}
      </div>
      {/* Admin Controls for Stock Optimization */}
      <div className="bg-gray-800/80 rounded-xl p-4 mb-6">
        <h3 className="text-lg text-white mb-2">Admin: Stock Allocation Optimization</h3>
        <textarea
          className="w-full p-2 mb-2 rounded bg-gray-900 text-white border border-gray-700"
          rows={2}
          placeholder="Supply array (e.g. [20, 30])"
          value={JSON.stringify(supply)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            try { setSupply(JSON.parse(e.target.value)); setStockError(null); }
            catch { setStockError('Invalid supply JSON'); }
          }}
        />
        <textarea
          className="w-full p-2 mb-2 rounded bg-gray-900 text-white border border-gray-700"
          rows={2}
          placeholder="Demand array (e.g. [15, 35])"
          value={JSON.stringify(demand)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            try { setDemand(JSON.parse(e.target.value)); setStockError(null); }
            catch { setStockError('Invalid demand JSON'); }
          }}
        />
        <textarea
          className="w-full p-2 mb-2 rounded bg-gray-900 text-white border border-gray-700"
          rows={4}
          placeholder="Cost matrix (e.g. [[2,3],[4,1]])"
          value={JSON.stringify(costMatrix)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            try { setCostMatrix(JSON.parse(e.target.value)); setStockError(null); }
            catch { setStockError('Invalid cost matrix JSON'); }
          }}
        />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleStockOptimize} disabled={stockLoading}>Optimize Stock</button>
        {stockLoading && <div className="text-indigo-300">Optimizing...</div>}
        {stockError && <div className="text-red-400">{stockError}</div>}
        {stockResult && (
          <div className="mt-2 text-green-300">
            <div>Allocation: <pre className="whitespace-pre-wrap">{JSON.stringify(stockResult.allocation, null, 2)}</pre></div>
            <div>Total Cost: {stockResult.total_cost}</div>
          </div>
        )}
      </div>
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition-all duration-200 ${activeTab === 'optimization' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setActiveTab('optimization')}
        >
          Route Optimization
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition-all duration-200 ${activeTab === 'vehicleMap' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setActiveTab('vehicleMap')}
        >
          Vehicle Map
        </button>
      </div>
      {activeTab === 'optimization' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Metric Cards */}
            <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-indigo-500/40 shadow-xl col-span-1 md:col-span-3">
              <TrendingUp className="w-8 h-8 text-indigo-400 mb-2" />
              <div className="text-4xl font-bold text-white">{totalSavings}%</div>
              <div className="text-lg text-indigo-300 font-semibold">Total Cost & Time Savings</div>
            </div>
          </div>
          {/* Route Comparison Chart */}
          <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-indigo-500/40 shadow-xl">
            <h3 className="text-lg text-white mb-4">Route Costs: Traditional vs. AI Optimized</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filtered}
                onMouseLeave={() => setHighlightRegion(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="region" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="traditional"
                  name="Traditional Route"
                  fill="#8B5CF6"
                  onMouseOver={(_, idx) => setHighlightRegion(filtered[idx].region)}
                />
                <Bar
                  dataKey="optimized"
                  name="AI Optimized Route"
                  fill="#10B981"
                  onMouseOver={(_, idx) => setHighlightRegion(filtered[idx].region)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Show vehicle map below chart, filtered/highlighted by region if hovered */}
          <div className="mt-8">
            <div className="flex space-x-2 mb-4">
              {deliveryModes.map(mode => (
                <button
                  key={mode}
                  className={`px-3 py-1 rounded-full border ${selectedModes.includes(mode) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-gray-300 border-gray-600'}`}
                  onClick={() => setSelectedModes(selectedModes.includes(mode) ? selectedModes.filter(m => m !== mode) : [...selectedModes, mode])}
                >
                  {mode}
                </button>
              ))}
            </div>
            <VehicleMapPanel
              filters={filters}
              highlightVehicleIds={highlightRegion ? getVehicleIdsForRegion(highlightRegion) : []}
              onVehicleHover={(vehicleId: number | null) => setHighlightVehicleId(vehicleId)}
              highlightRegion={highlightVehicleId ? getRegionForVehicle(highlightVehicleId) : null}
              vehicles={filteredVehicles}
            />
          </div>
        </>
      ) : (
        <VehicleMapPanel
          filters={filters}
          highlightVehicleIds={[]}
          onVehicleHover={(vehicleId: number | null) => setHighlightVehicleId(vehicleId)}
          highlightRegion={null}
        />
      )}
    </div>
  );
};

export default RouteOptimizationPanel;
export type { Props as RouteOptimizationPanelProps }; 