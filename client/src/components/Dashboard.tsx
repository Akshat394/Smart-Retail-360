import React, { useState, useMemo } from 'react';
import { 
  BarChart3,
  Package, 
  Truck, 
  Brain,
  Map,
  AlertTriangle,
  Leaf,
  Bot,
  TrendingUp,
  CheckCircle,
  Zap,
} from 'lucide-react';

// Import all panel components
import KPIGrid from './KPIGrid';
import SidebarFilters_new, { Filters } from './SidebarFilters_new';
import InventoryPanel from './InventoryPanel';
import OrdersPanel from './OrdersPanel';
import AnalyticsPanel from './AnalyticsPanel';
import VehicleMapPanel from './VehicleMapPanel';
import NotificationsPanel from './NotificationsPanel';
import SustainabilityPanel from './SustainabilityPanel';
import RoboticsPanel from './RoboticsPanel';
import RouteOptimizationPanel from './RouteOptimizationPanel';
import SystemHealthPanel from './SystemHealthPanel';
import AICommandCenterPanel from './AICommandCenterPanel';

// Import mock data to show stats on summary cards
import { generateInventory, generateOrders } from './mockData';

const initialFilters: Filters = {
  state: [],
  city: [],
  category: [],
  month: [],
  yearRange: { min: 2021, max: 2024 },
};

const Dashboard: React.FC = () => {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const handleFilterChange = (newFilters: Filters) => setFilters(newFilters);

  const inventory = useMemo(() => generateInventory(), []);
  const orders = useMemo(() => generateOrders(500, inventory), [inventory]);

  const panelCards = [
    { id: 'aiCommand', title: 'AI Command Center', icon: Zap, description: 'AI-powered recommendations', stat: 'Live' },
    { id: 'inventory', title: 'Inventory', icon: Package, description: 'Manage inventory', stat: `${inventory.length} items` },
    { id: 'orders', title: 'Orders', icon: Truck, description: 'Manage orders', stat: `${orders.length} orders` },
    { id: 'analytics', title: 'Analytics', icon: Brain, description: 'View AI insights', stat: 'Advanced' },
    { id: 'vehicleMap', title: 'Vehicle Map', icon: Map, description: 'View live vehicles', stat: 'Live', routeTo: 'routeOpt' },
    { id: 'notifications', title: 'Notifications', icon: AlertTriangle, description: 'View recent alerts', stat: '6 new' },
    { id: 'sustainability', title: 'Sustainability', icon: Leaf, description: 'Track green data', stat: 'Eco' },
    { id: 'robotics', title: 'Robotics', icon: Bot, description: 'Monitor fleet', stat: 'Auto' },
    { id: 'routeOpt', title: 'Route Opt.', icon: TrendingUp, description: 'View AI routes', stat: 'AI' },
    { id: 'systemHealth', title: 'System Health', icon: CheckCircle, description: 'Check service status', stat: 'OK' },
  ];

  const BackButton = () => (
    <button
      className="mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
      onClick={() => setExpandedPanel(null)}
    >
      ← Back to Dashboard
    </button>
  );

  const renderExpandedPanel = () => {
    const PanelWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="p-8">
        <BackButton />
        {children}
      </div>
    );

    switch (expandedPanel) {
      case 'aiCommand': return <PanelWrapper><AICommandCenterPanel /></PanelWrapper>;
      case 'inventory': return <PanelWrapper><InventoryPanel filters={filters} /></PanelWrapper>;
      case 'orders': return <PanelWrapper><OrdersPanel filters={filters} /></PanelWrapper>;
      case 'analytics': return <PanelWrapper><AnalyticsPanel filters={filters} /></PanelWrapper>;
      case 'vehicleMap': return <PanelWrapper><RouteOptimizationPanel filters={filters} /></PanelWrapper>;
      case 'notifications': return <PanelWrapper><NotificationsPanel filters={filters} /></PanelWrapper>;
      case 'sustainability': return <PanelWrapper><SustainabilityPanel filters={filters} /></PanelWrapper>;
      case 'robotics': return <PanelWrapper><RoboticsPanel filters={filters} /></PanelWrapper>;
      case 'routeOpt': return <PanelWrapper><RouteOptimizationPanel filters={filters} /></PanelWrapper>;
      case 'systemHealth': return <PanelWrapper><SystemHealthPanel filters={filters} /></PanelWrapper>;
      default: return null;
    }
  };

  if (expandedPanel) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900">
        <SidebarFilters_new filters={filters} onChange={handleFilterChange} initialFilters={initialFilters} />
        <main className="flex-1">
          {renderExpandedPanel()}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900">
      <SidebarFilters_new filters={filters} onChange={handleFilterChange} initialFilters={initialFilters} />
      <main className="flex-1 p-8 space-y-8">
        <KPIGrid />
        <h2 className="text-2xl font-bold text-white mt-8 border-t border-white/10 pt-6">Dashboard Panels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {panelCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="cursor-pointer" onClick={() => setExpandedPanel(card.id)}>
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl flex flex-col items-center justify-center hover:scale-105 transition-transform duration-300 h-full">
                  <Icon className="w-8 h-8 mb-2 text-purple-300" />
                  <h3 className="text-lg text-white font-semibold mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold text-white mb-2">{card.stat}</p>
                  <p className="text-sm text-center text-gray-400">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;