import React, { useMemo } from 'react';
import { generateAnalyticsData, categorySales, channelDistribution, topCustomers, orderVolumeHeatmap } from './mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import type { Filters } from './SidebarFilters_new';

type Props = {
  filters: Filters;
};

const colorPalette = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#F472B6', '#F87171', '#34D399', '#FBBF24'];

const AnalyticsPanel: React.FC<Props> = ({ filters }) => {
  // Filter analytics data by yearRange/month if present
  const analyticsData = useMemo(() => generateAnalyticsData(), []);
  const filteredData = useMemo(() => {
    return analyticsData.filter((d: any) => {
      const dateObj = new Date(d.date);
      const year = dateObj.getFullYear();
      const month = dateObj.toLocaleString('default', { month: 'short' });
      return (
        (filters.month.length === 0 || filters.month.includes(month)) &&
        (year >= filters.yearRange.min && year <= filters.yearRange.max)
      );
    });
  }, [filters]);

  return (
    <div className="bg-gray-900 min-h-screen p-6 space-y-10">
      <h2 className="text-2xl font-bold text-white mb-6">Advanced Analytics</h2>
      {/* Green Score Trend Line Chart with Outliers */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 mb-8 border-2 border-green-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Green Score Trend (90 Days, Outliers Highlighted)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={false} name="Green Score" />
            {/* Outlier dots */}
            {filteredData.map((d, i) => d.outlier && (
              <circle key={i} cx={i * (1000 / filteredData.length)} cy={250 - d.score * 20} r={6} fill="#EF4444" stroke="#fff" strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* CO2 History Bar Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-blue-500/40 shadow-xl mb-8">
        <h3 className="text-lg text-white mb-4">CO₂ Emissions History (kg, 90 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="co2" fill="#6366F1" name="CO₂ (kg)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Category Sales Bar Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-purple-500/40 shadow-xl mb-8">
        <h3 className="text-lg text-white mb-4">Category Sales</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categorySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="category" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#10B981" name="Sales" />
            <Bar dataKey="returns" fill="#EF4444" name="Returns" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Channel Distribution Pie Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl mb-8">
        <h3 className="text-lg text-white mb-4">Order Channel Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={channelDistribution} dataKey="orders" nameKey="channel" cx="50%" cy="50%" outerRadius={80} fill="#F59E0B">
              {channelDistribution.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={colorPalette[idx % colorPalette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Top Customers Bar Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-pink-500/40 shadow-xl mb-8">
        <h3 className="text-lg text-white mb-4">Top Customers (Order Count & Value)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topCustomers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
            <YAxis dataKey="customer" type="category" stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="orders" fill="#6366F1" name="Orders" />
            <Bar dataKey="value" fill="#10B981" name="Order Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Order Volume Heatmap (Calendar) */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-cyan-500/40 shadow-xl mb-8">
        <h3 className="text-lg text-white mb-4">Order Volume Heatmap (90 Days)</h3>
        <div className="flex flex-wrap gap-1">
          {orderVolumeHeatmap.map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${d.orders} orders`}
              className="w-4 h-4 rounded bg-cyan-400"
              style={{ opacity: 0.3 + 0.7 * (d.orders / 150) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel; 