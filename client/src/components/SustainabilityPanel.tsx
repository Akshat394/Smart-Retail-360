import React, { useMemo } from 'react';
import { generateSustainabilityData } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';

type Props = {
  filters: Filters;
};

const SustainabilityPanel: React.FC<Props> = ({ filters }) => {
  const { showNotification } = useNotification();

  // For demo, filter only by year/month/category/state/city if present
  // In a real app, this would filter a list of orders or deliveries
  const sustainabilityData = useMemo(() => generateSustainabilityData(), []);

  const filtered = useMemo(() => {
    // Simulate filtering by reducing greenOrders and totalOrders if filters are set
    let factor = 1;
    if (filters.yearRange.min !== 2021 || filters.yearRange.max !== 2024) factor *= 0.8;
    if (filters.month.length > 0) factor *= 0.9;
    if (filters.category.length > 0) factor *= 0.85;
    if (filters.state.length > 0) factor *= 0.9;
    if (filters.city.length > 0) factor *= 0.95;
    return {
      totalOrders: Math.round(sustainabilityData.totalOrders * factor),
      greenOrders: Math.round(sustainabilityData.greenOrders * factor),
      co2Saved: sustainabilityData.co2Saved,
      greenDeliveryRate: Math.round(sustainabilityData.greenDeliveryRate * factor),
      channelData: sustainabilityData.channelData.map((c: any) => ({ ...c, greenRate: Math.round(c.greenRate * factor) })),
    };
  }, [filters, sustainabilityData]);

  const { totalOrders, greenOrders, co2Saved, greenDeliveryRate, channelData } = filtered;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Sustainability Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>
      {/* Green Rate by Channel Bar Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Green Delivery Rate by Channel</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={channelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="channel" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} unit="%" />
            <Tooltip />
            <Legend />
            <Bar dataKey="greenRate" fill="#10B981" name="Green Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SustainabilityPanel;
export type { Props as SustainabilityPanelProps }; 