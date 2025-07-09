import React, { useMemo, useEffect, useState } from 'react';
import { generateSustainabilityData } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';

type Props = {
  filters: Filters;
};

const mockSuppliers = [
  { name: 'EcoFresh Foods', score: 92, rating: 'A', cdp: 'Gold' },
  { name: 'GreenLogix', score: 88, rating: 'A-', cdp: 'Silver' },
  { name: 'Urban Organics', score: 81, rating: 'B+', cdp: 'Bronze' },
];

const SustainabilityPanel: React.FC<Props> = ({ filters }) => {
  const { showNotification } = useNotification();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiService.getAdvancedSustainabilityMetrics().then(setMetrics).finally(() => setLoading(false));
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

  const { totalOrders, greenOrders, co2Saved, greenDeliveryRate, totalCO2, totalEnergy, avgEfficiency, byZone, byMode, byMonth } = metrics;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Sustainability Dashboard</h2>
      <button className="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600" onClick={handleExport} disabled={csvLoading}>{csvLoading ? 'Exporting...' : 'Export CSV'}</button>
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
    </div>
  );
};

export default SustainabilityPanel;
export type { Props as SustainabilityPanelProps }; 