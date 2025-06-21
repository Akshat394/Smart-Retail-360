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
  TrendingUp
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'routes', label: 'Route Optimization', icon: Route },
  { id: 'analytics', label: 'Forecasting', icon: TrendingUp },
  { id: 'digital-twin', label: 'Digital Twin', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => {
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

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          <p>v1.0.0 • Production</p>
          <p className="mt-1">© 2024 SmartRetail360</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;