import React, { useMemo, useState, useEffect } from 'react';
import { generateAnalyticsData, categorySales, channelDistribution, topCustomers, orderVolumeHeatmap } from './mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';

type Props = {
  filters: Filters;
};

const colorPalette = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#F472B6', '#F87171', '#34D399', '#FBBF24'];

const AnalyticsPanel: React.FC<Props> = ({ filters }) => {
  const { showNotification } = useNotification();
  const [selectedMetric, setSelectedMetric] = useState<'order_volume' | 'co2' | 'inventory'>('order_volume');
  const [forecast, setForecast] = useState<number[]>([]);
  const [confInt, setConfInt] = useState<[number, number][]>([]);
  const [anomalies, setAnomalies] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [actualData, setActualData] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);

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

  // Prepare data for selected metric
  useEffect(() => {
    // For demo, use mockData; in real app, fetch from backend
    const analyticsData = generateAnalyticsData();
    let data: number[] = [];
    let dateArr: string[] = analyticsData.map((d: any) => d.date);
    if (selectedMetric === 'order_volume') {
      data = analyticsData.map((d: any) => d.orders ?? 0);
    } else if (selectedMetric === 'co2') {
      data = analyticsData.map((d: any) => d.co2 ?? 0);
    } else if (selectedMetric === 'inventory') {
      data = analyticsData.map((d: any) => d.inventory ?? 0);
    }
    setActualData(data);
    setDates(dateArr);
  }, [selectedMetric]);

  // Fetch forecast and anomalies when metric or data changes
  useEffect(() => {
    if (actualData.length === 0) return;
    setLoading(true);
    (async () => {
      try {
        // Forecast next 14 days
        const predRes: any = await apiService.getMLPrediction(actualData, { n_periods: 14 });
        setForecast(predRes.forecast || []);
        setConfInt(predRes.conf_int || []);
        // Anomaly detection
        const anomRes: any = await apiService.getMLPrediction(actualData, { detect_anomalies: true });
        setAnomalies(anomRes.anomalies || []);
        if ((anomRes.anomalies || []).length > 0) {
          showNotification({ message: `Anomalies detected in ${selectedMetric.replace('_', ' ')}!`, type: 'warning', orderId: 0, customerName: '' });
        }
      } catch (e: any) {
        showNotification({ message: 'ML prediction failed: ' + (e.message || e), type: 'error', orderId: 0, customerName: '' });
      } finally {
        setLoading(false);
      }
    })();
  }, [actualData, selectedMetric]);

  return (
    <div className="bg-gray-900 min-h-screen p-6 space-y-10">
      <h2 className="text-2xl font-bold text-white mb-6">Advanced Analytics</h2>
      {/* Metric Selector */}
      <div className="mb-6 flex gap-4 items-center">
        <label className="text-white font-semibold">Forecast Metric:</label>
        <select
          className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600"
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value as any)}
        >
          <option value="order_volume">Order Volume</option>
          <option value="co2">CO₂ Emissions</option>
          <option value="inventory">Inventory</option>
        </select>
      </div>
      {/* Forecast Line Chart */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 mb-8 border-2 border-green-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">{selectedMetric === 'order_volume' ? 'Order Volume Forecast' : selectedMetric === 'co2' ? 'CO₂ Emissions Forecast' : 'Inventory Forecast'} (Next 14 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={[
            ...dates.map((date: string, i: number) => ({
              date,
              actual: actualData[i],
              forecast: i >= actualData.length ? forecast[i - actualData.length] : null,
              lower: i >= actualData.length && confInt[i - actualData.length] ? confInt[i - actualData.length][0] : null,
              upper: i >= actualData.length && confInt[i - actualData.length] ? confInt[i - actualData.length][1] : null,
              anomaly: anomalies.includes(i) ? actualData[i] : null
            })),
            ...forecast.map((f: number, i: number) => ({
              date: `+${i + 1}d`,
              actual: NaN,
              forecast: f,
              lower: confInt[i] ? confInt[i][0] : null,
              upper: confInt[i] ? confInt[i][1] : null,
              anomaly: null
            }))
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={3} dot={false} name="Actual" />
            <Line type="monotone" dataKey="forecast" stroke="#6366F1" strokeWidth={3} dot={false} name="Forecast" />
            <Area type="monotone" dataKey="upper" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} name="Confidence Upper" />
            <Area type="monotone" dataKey="lower" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} name="Confidence Lower" />
            {/* Anomaly markers */}
            {anomalies.map((idx: number) => (
              <Line key={idx} type="monotone" dataKey="anomaly" stroke="#EF4444" strokeWidth={0} dot={{ r: 6, fill: '#EF4444' }} name="Anomaly" />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {loading && <div className="text-blue-400 mt-2">Loading forecast...</div>}
      </div>
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