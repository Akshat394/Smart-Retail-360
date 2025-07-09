import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Route, 
  Brain, 
  Settings, 
  Activity,
  Zap,
  Database,
  TrendingUp,
  LogOut,
  User,
  Shield,
  Cpu,
  Link,
  FileText,
  Eye,
  Lock,
  Globe,
  Leaf,
  Truck,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  ClipboardList,
  Code,
  Camera,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ai-command', label: 'AI Command Center', icon: Zap },
  { id: 'analytics', label: 'Forecasting', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory', icon: Database },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse }, // merged with AR/VR
  { id: 'wms-dashboard', label: 'WMS Dashboard', icon: ClipboardList },
  { id: 'orders', label: 'Orders', icon: Activity },
  { id: 'omnichannel-analytics', label: 'Channel Analytics', icon: Users },
  { id: 'route-optimization', label: 'Route Optimization', icon: Route }, // merged with logistics
  { id: 'iot', label: 'IoT Dashboard', icon: Activity },
  { id: 'robotics', label: 'Robotics', icon: Cpu },
  { id: 'video-analytics', label: 'Video Analytics', icon: Camera },
  { id: 'digital-twin', label: 'Digital Twin', icon: Brain },
  { id: 'blockchain', label: 'Blockchain', icon: Link },
  { id: 'edge-computing', label: 'Edge Computing', icon: Cpu },
  { id: 'sustainability', label: 'Sustainability', icon: Leaf },
  { id: 'compliance', label: 'Compliance', icon: FileText },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'erp-products', label: 'ERP Products', icon: ShoppingCart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'developer-portal', label: 'Developer Portal', icon: Code },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  // Filter menu items based on user role
  const getFilteredMenuItems = () => {
    if (!user) return [];
    
    const rolePermissions = {
      admin: [
        'dashboard', 'ai-command', 'routes', 'analytics', 'digital-twin', 
        'blockchain', 'edge-computing', 'security', 'compliance', 
        'sustainability', 'warehouse', 'logistics', 'inventory', 
        'orders', 'omnichannel-analytics', 'robotics', 'video-analytics', 'ar-vr', 'settings', 'erp-products', 'wms-dashboard'
      ],
      manager: [
        'dashboard', 'ai-command', 'routes', 'analytics', 'digital-twin',
        'blockchain', 'edge-computing', 'security', 'compliance',
        'sustainability', 'warehouse', 'logistics', 'inventory',
        'orders', 'omnichannel-analytics', 'robotics', 'video-analytics', 'ar-vr', 'settings', 'erp-products', 'wms-dashboard'
      ],
      operations: [
        'dashboard', 'ai-command', 'routes', 'warehouse', 'logistics',
        'inventory', 'orders', 'omnichannel-analytics', 'robotics', 'video-analytics', 'settings'
      ],
      analyst: [
        'dashboard', 'ai-command', 'analytics', 'digital-twin',
        'blockchain', 'sustainability', 'omnichannel-analytics', 'ar-vr'
      ],
      planner: [
        'dashboard', 'ai-command', 'analytics', 'digital-twin',
        'routes', 'logistics', 'inventory', 'sustainability', 'omnichannel-analytics'
      ],
      viewer: [
        'dashboard', 'ai-command', 'analytics', 'sustainability', 'omnichannel-analytics'
      ]
    };

    const allowedTabs = rolePermissions[user.role as keyof typeof rolePermissions] || ['dashboard'];
    return menuItems.filter(item => allowedTabs.includes(item.id));
  };

  const filteredMenuItems = getFilteredMenuItems();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SmartRetail360</h1>
            <p className="text-xs text-gray-400">Supply Chain AI</p>
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <div className="p-4 border-b border-gray-700">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">System Status</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Kafka Streams</span>
              <Zap className="w-3 h-3 text-green-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Spark Jobs</span>
              <Activity className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">ML Models</span>
              <Brain className="w-3 h-3 text-purple-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Blockchain</span>
              <Link className="w-3 h-3 text-green-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Edge Devices</span>
              <Cpu className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Security</span>
              <Shield className="w-3 h-3 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <motion.li 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-white rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Active Alerts</span>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400">3</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>System Health</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-green-400">98%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <motion.button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;