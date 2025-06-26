import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';

type Props = {
  filters: Filters;
};

const notifications = [
  { id: 1, type: 'alert', message: 'Low stock for Product A in Warehouse 2', time: '2 min ago', state: 'Maharashtra', city: 'Mumbai', category: 'Groceries', year: '2024', month: 'May' },
  { id: 2, type: 'success', message: 'Order #1002 completed successfully', time: '10 min ago', state: 'Delhi', city: 'Delhi', category: 'Electronics', year: '2024', month: 'May' },
  { id: 3, type: 'info', message: 'New delivery mode "Drone" now available', time: '30 min ago', state: 'Maharashtra', city: 'Mumbai', category: 'Electronics', year: '2023', month: 'Apr' },
  { id: 4, type: 'warning', message: 'Autonomous vehicle delayed due to traffic', time: '1 hr ago', state: 'Karnataka', city: 'Bengaluru', category: 'Groceries', year: '2024', month: 'May' },
  { id: 5, type: 'alert', message: 'System health check: anomaly detected', time: '2 hr ago', state: 'West Bengal', city: 'Kolkata', category: 'Apparel', year: '2022', month: 'Mar' },
  { id: 6, type: 'success', message: 'Inventory restocked for Product C', time: '3 hr ago', state: 'Delhi', city: 'Delhi', category: 'Groceries', year: '2024', month: 'May' },
];

const typeMap = {
  alert: { icon: AlertTriangle, color: 'bg-red-500/20 text-red-400', label: 'Alert' },
  success: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', label: 'Success' },
  info: { icon: Info, color: 'bg-blue-500/20 text-blue-400', label: 'Info' },
  warning: { icon: XCircle, color: 'bg-yellow-500/20 text-yellow-400', label: 'Warning' },
};

const NotificationsPanel: React.FC<Props> = ({ filters }) => {
  const filteredNotifications = useMemo(() =>
    notifications.filter(n => {
      const year = parseInt(n.year, 10);
      return (
        (filters.state.length === 0 || filters.state.includes(n.state)) &&
        (filters.city.length === 0 || filters.city.includes(n.city)) &&
        (filters.category.length === 0 || filters.category.includes(n.category)) &&
        (filters.month.length === 0 || filters.month.includes(n.month)) &&
        (year >= filters.yearRange.min && year <= filters.yearRange.max)
      );
    }),
    [filters]
  );

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Recent Alerts & Updates</h3>
        <ul className="divide-y divide-gray-700">
          {filteredNotifications.map(n => {
            const { icon: Icon, color, label } = typeMap[n.type as keyof typeof typeMap];
            return (
              <li key={n.id} className="flex items-center gap-4 py-4">
                <span className={`rounded-full p-2 ${color}`}><Icon className="w-6 h-6" /></span>
                <div className="flex-1">
                  <div className="text-white font-medium">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{n.time}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${color}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default NotificationsPanel;
export type { Props as NotificationsPanelProps }; 