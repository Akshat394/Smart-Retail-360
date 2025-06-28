import React, { useMemo } from 'react';
import { generateSystemHealthData } from './mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';

type Props = {
  filters: Filters;
};

const statusMap = {
  operational: { icon: CheckCircle, color: 'text-green-400', label: 'Operational' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Degraded' },
  outage: { icon: XCircle, color: 'text-red-400', label: 'Outage' },
};

const SystemHealthPanel: React.FC<Props> = ({ filters }) => {
  const systemHealthData = useMemo(() => generateSystemHealthData(), []);
  const { showNotification } = useNotification();

  // For demo, filter by reducing uptime and increasing avgResponseTime
  const filtered = useMemo(() => {
    let uptime = parseFloat(systemHealthData.uptime);
    let avgResponse = parseInt(systemHealthData.avgResponseTime);
    if (filters.yearRange.min !== 2021 || filters.yearRange.max !== 2024) { uptime -= 0.1; avgResponse += 10; }
    if (filters.month.length > 0) { uptime -= 0.05; avgResponse += 5; }
    if (filters.state.length > 0) { uptime -= 0.05; avgResponse += 5; }
    if (filters.city.length > 0) { uptime -= 0.02; avgResponse += 2; }
    return {
      uptime: uptime.toFixed(2) + '%',
      avgResponseTime: avgResponse + 'ms',
      services: systemHealthData.services,
      responseTimeHistory: systemHealthData.responseTimeHistory.map((d: any) => ({ ...d, ms: d.ms + (avgResponse - 120) })),
    };
  }, [filters, systemHealthData]);

  const { uptime, avgResponseTime, services, responseTimeHistory } = filtered;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-gray-500/40 shadow-xl">
          <CheckCircle className="w-8 h-8 text-gray-400 mb-2" />
          <div className="text-4xl font-bold text-white">{uptime}</div>
          <div className="text-lg text-gray-300 font-semibold">Uptime (24h)</div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-gray-500/40 shadow-xl">
          <Clock className="w-8 h-8 text-gray-400 mb-2" />
          <div className="text-4xl font-bold text-white">{avgResponseTime}</div>
          <div className="text-lg text-gray-300 font-semibold">Avg. API Response</div>
        </div>
      </div>
      {/* Service Status & Response Time */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-gray-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Service Status & Response Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Service List */}
          <div>
            <h4 className="text-md text-gray-300 font-semibold mb-3">Live Status</h4>
            <ul className="space-y-3">
              {services.map((service: any) => {
                const status = service.status as keyof typeof statusMap;
                const { icon: Icon, color, label } = statusMap[status];
                return (
                  <li key={service.name} className="flex items-center gap-4 p-2 rounded-lg bg-gray-700/50">
                    <Icon className={`w-6 h-6 ${color}`} />
                    <div className="font-bold text-white flex-1">{service.name}</div>
                    <div className={`text-xs px-2 py-1 rounded-full font-semibold ${color.replace('text', 'bg').replace('-400', '-500/20')}`}>{label}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Response Time Chart */}
          <div>
            <h4 className="text-md text-gray-300 font-semibold mb-3">API Response Time (ms) - Last Hour</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={responseTimeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 200]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ms" stroke="#8B5CF6" strokeWidth={2} name="Response (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPanel;
export type { Props as SystemHealthPanelProps }; 