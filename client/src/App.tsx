import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Routes from './components/Routes';
import Analytics from './components/Analytics';
import DigitalTwin from './components/DigitalTwin';
import Settings from './components/Settings';
import AICommandCenterPanel from './components/AICommandCenterPanel';
import { NotificationProvider } from './hooks/useNotification';

// Import feature components
import { BlockchainTraceability } from './features/blockchain';
import { SecurityDashboard, TwoFactorAuth } from './features/security';
import { EdgeDevices, EmergencyCoordination } from './features/edge';
import { GDPRManagement, AuditLogs } from './features/compliance';
import { SustainabilityPanel } from './features/sustainability';
import { InventoryPanel } from './features/inventory';
import { OrdersPanel } from './features/orders';
import { RoboticsPanel } from './features/robotics';
import { Warehouse3D } from './features/ar-vr';

// Import types
import { Filters } from './components/SidebarFilters_new';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Initialize default filters
  const defaultFilters: Filters = {
    state: [],
    city: [],
    category: [],
    month: [],
    yearRange: { min: 2021, max: 2024 },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <motion.div
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 w-16 h-16 border-4 border-green-500 border-b-transparent rounded-full mx-auto opacity-60"
                 style={{ animationDelay: '0.5s' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SmartRetail360</h2>
          <p className="text-gray-400">Initializing supply chain orchestrator...</p>
          <div className="mt-4 flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'ai-command':
        return <AICommandCenterPanel />;
      case 'routes':
        return <Routes />;
      case 'analytics':
        return <Analytics />;
      case 'digital-twin':
        return <DigitalTwin />;
      case 'blockchain':
        return <BlockchainTraceability />;
      case 'edge-computing':
        return <EdgeDevices />;
      case 'security':
        return <SecurityDashboard />;
      case 'compliance':
        return <GDPRManagement />;
      case 'sustainability':
        return <SustainabilityPanel filters={defaultFilters} />;
      case 'warehouse':
        return <Warehouse3D />;
      case 'logistics':
        return <Routes />; // Reuse Routes component for logistics
      case 'inventory':
        return <InventoryPanel filters={defaultFilters} />;
      case 'orders':
        return <OrdersPanel filters={defaultFilters} />;
      case 'robotics':
        return <RoboticsPanel filters={defaultFilters} />;
      case 'ar-vr':
        return <Warehouse3D />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;