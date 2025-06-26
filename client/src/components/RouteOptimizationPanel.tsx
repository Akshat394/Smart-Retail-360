import React, { useMemo, useState } from 'react';
import { generateRouteOptimizationData, generateVehicles } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import VehicleMapPanel from './VehicleMapPanel';

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

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">AI Route Optimization</h2>
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