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
import IoTDashboard from './components/IoTDashboard';
import { Link, Search, Leaf, FileText, Info } from 'lucide-react';
import ChatbotWidget from './components/ChatbotWidget';
import DeveloperPortal from './components/DeveloperPortal';

// Import feature components
import { BlockchainTraceability, GreenTokens, SmartContracts } from './features/blockchain';
import { SecurityDashboard, TwoFactorAuth } from './features/security';
import { EdgeDevices, EmergencyCoordination } from './features/edge';
import { GDPRManagement, AuditLogs } from './features/compliance';
import { SustainabilityPanel } from './features/sustainability';
import { InventoryPanel } from './features/inventory';
import { OrdersPanel } from './features/orders';
import { RoboticsPanel } from './features/robotics';
import { Warehouse3D } from './features/ar-vr';
import { VideoAnalyticsPanel } from './features/vision';
import ERPProductManagement from './components/ERPProductManagement';
import WMSDashboard from './features/inventory/WMSDashboard';
import OmnichannelAnalytics from './components/OmnichannelAnalytics';

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

  const BlockchainPanel: React.FC = () => {
    const [tab, setTab] = useState<'traceability' | 'tokens' | 'contracts'>('traceability');
    const [showInfo, setShowInfo] = useState(false);
    const tabConfig = [
      {
        key: 'traceability',
        label: 'Traceability',
        icon: <Search className="w-5 h-5 mr-2" />,
        color: 'text-blue-400',
        activeBg: 'bg-blue-900/60',
        border: 'border-blue-500'
      },
      {
        key: 'tokens',
        label: 'Green Tokens',
        icon: <Leaf className="w-5 h-5 mr-2" />,
        color: 'text-green-400',
        activeBg: 'bg-green-900/60',
        border: 'border-green-500'
      },
      {
        key: 'contracts',
        label: 'Smart Contracts',
        icon: <FileText className="w-5 h-5 mr-2" />,
        color: 'text-purple-400',
        activeBg: 'bg-purple-900/60',
        border: 'border-purple-500'
      }
    ];
    return (
      <div className="p-0 md:p-6 flex flex-col items-center w-full">
        {/* Header */}
        <div className="w-full max-w-5xl flex items-center justify-between mb-6 mt-6 md:mt-0 px-4 md:px-0">
          <div className="flex items-center gap-3">
            <Link className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Blockchain Control Center</h2>
          </div>
          <button
            className="text-gray-400 hover:text-blue-400 transition-colors"
            onClick={() => setShowInfo((v) => !v)}
            title="Show info"
          >
            <Info className="w-6 h-6" />
          </button>
        </div>
        {showInfo && (
          <div className="w-full max-w-5xl bg-blue-900/80 border border-blue-500 rounded-lg p-4 mb-4 text-blue-200 text-sm flex items-center gap-2 shadow-lg">
            <Info className="w-4 h-4" />
            Welcome to the Blockchain Control Center! Use the tabs below to explore product traceability, manage green tokens, and automate supply chain actions with smart contracts. Each panel is color-coded and fully interactive for demo and real use.
          </div>
        )}
        {/* Tab Bar */}
        <div className="w-full max-w-5xl flex space-x-2 md:space-x-4 border-b border-gray-700 px-4 md:px-0 mb-0 md:mb-6 overflow-x-auto">
          {tabConfig.map((t) => (
            <button
              key={t.key}
              className={`flex items-center px-4 py-2 font-semibold rounded-t-lg transition-all duration-200 focus:outline-none ${
                tab === t.key
                  ? `${t.activeBg} shadow-lg ${t.color} ${t.border} border-b-2 z-10`
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
              onClick={() => setTab(t.key as typeof tab)}
              style={{ minWidth: 140 }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {/* Panel Container */}
        <div className="w-full max-w-5xl bg-gray-900/80 rounded-b-xl rounded-tr-xl shadow-xl border border-gray-700 p-0 md:p-8 mt-0">
          {tab === 'traceability' && <BlockchainTraceability />}
          {tab === 'tokens' && <GreenTokens />}
          {tab === 'contracts' && <SmartContracts />}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'ai-command':
        return <AICommandCenterPanel />;
      case 'analytics':
        return <Analytics />;
      case 'inventory':
        return <InventoryPanel filters={defaultFilters} />;
      case 'warehouse':
        return <Warehouse3D />; // merged AR/VR and warehouse
      case 'wms-dashboard':
        return <WMSDashboard />;
      case 'orders':
        return <OrdersPanel filters={defaultFilters} />;
      case 'omnichannel-analytics':
        return <OmnichannelAnalytics />;
      case 'route-optimization':
        return <Routes />; // merged route optimization and logistics
      case 'iot':
        return <IoTDashboard />;
      case 'robotics':
        return <RoboticsPanel filters={defaultFilters} />;
      case 'video-analytics':
        return <VideoAnalyticsPanel />;
      case 'digital-twin':
        return <DigitalTwin />;
      case 'blockchain':
        return <BlockchainPanel />;
      case 'edge-computing':
        return <EdgeDevices />;
      case 'sustainability':
        return <SustainabilityPanel filters={defaultFilters} />;
      case 'compliance':
        return <GDPRManagement />;
      case 'security':
        return <SecurityDashboard />;
      case 'erp-products':
        return <ERPProductManagement />;
      case 'settings':
        return <Settings />;
      case 'developer-portal':
        return <DeveloperPortal />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1">
        {renderContent()}
      </main>
      <ChatbotWidget />
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