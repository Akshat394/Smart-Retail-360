import React, { useMemo } from 'react';
import { generateRoboticsData, Robot } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Bot, Battery, Zap, AlertTriangle, Wrench } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';

type Props = {
  filters: Filters;
};

const statusMap = {
  active: { icon: Zap, color: 'text-green-400', label: 'Active' },
  charging: { icon: Battery, color: 'text-blue-400', label: 'Charging' },
  maintenance: { icon: Wrench, color: 'text-yellow-400', label: 'Maintenance' },
  error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' },
};

const RoboticsPanel: React.FC<Props> = ({ filters }) => {
  const roboticsData = useMemo(() => generateRoboticsData(), []);

  // For demo, filter by reducing totalTasks, avgEfficiency, and robots count
  const filtered = useMemo(() => {
    let factor = 1;
    if (filters.yearRange.min !== 2021 || filters.yearRange.max !== 2024) factor *= 0.8;
    if (filters.month.length > 0) factor *= 0.9;
    if (filters.state.length > 0) factor *= 0.9;
    if (filters.city.length > 0) factor *= 0.95;
    const robots = roboticsData.robots.slice(0, Math.max(1, Math.round(roboticsData.robots.length * factor)));
    return {
      totalTasks: Math.round(roboticsData.totalTasks * factor),
      avgEfficiency: (parseFloat(roboticsData.avgEfficiency) * factor).toFixed(1) + '%',
      robots,
    };
  }, [filters, roboticsData]);

  const { totalTasks, avgEfficiency, robots } = filtered;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Warehouse Robotics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-yellow-500/40 shadow-xl">
          <Bot className="w-8 h-8 text-yellow-400 mb-2" />
          <div className="text-4xl font-bold text-white">{totalTasks}</div>
          <div className="text-lg text-yellow-300 font-semibold">Tasks Completed Today</div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center border-2 border-yellow-500/40 shadow-xl">
          <div className="text-4xl font-bold text-white">{avgEfficiency}</div>
          <div className="text-lg text-yellow-300 font-semibold">Average Efficiency</div>
        </div>
      </div>
      {/* Robot Status & Performance */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Robot Fleet Status & Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Robot List */}
          <div>
            <h4 className="text-md text-gray-300 font-semibold mb-3">Live Status</h4>
            <ul className="space-y-3">
              {robots.map((robot: Robot) => {
                const { icon: Icon, color } = statusMap[robot.status];
                return (
                  <li key={robot.id} className="flex items-center gap-4 p-2 rounded-lg bg-gray-700/50">
                    <Icon className={`w-6 h-6 ${color}`} />
                    <div className="font-bold text-white">{robot.id}</div>
                    <div className="flex-1 text-right text-gray-300">
                      <Battery className="inline-block w-4 h-4 mr-1" />
                      {robot.battery}%
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full font-semibold ${color.replace('text', 'bg').replace('-400', '-500/20')}`}>{statusMap[robot.status].label}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Performance Chart */}
          <div>
            <h4 className="text-md text-gray-300 font-semibold mb-3">Tasks Completed per Robot</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={robots} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis type="category" dataKey="id" stroke="#9CA3AF" fontSize={12} width={60} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tasksCompleted" fill="#F59E0B" name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoboticsPanel;
export type { Props as RoboticsPanelProps }; 