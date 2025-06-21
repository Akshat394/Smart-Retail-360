import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Database, 
  Zap, 
  Shield, 
  Bell, 
  User,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'models' | 'alerts' | 'security'>('system');
  const [isSaving, setIsSaving] = useState(false);

  const systemStatus = [
    { service: 'Hadoop HDFS', status: 'healthy', uptime: '99.9%', latency: '12ms' },
    { service: 'Apache Kafka', status: 'healthy', uptime: '99.8%', latency: '8ms' },
    { service: 'HBase', status: 'healthy', uptime: '99.7%', latency: '15ms' },
    { service: 'MongoDB', status: 'healthy', uptime: '99.9%', latency: '6ms' },
    { service: 'Spark Cluster', status: 'warning', uptime: '98.2%', latency: '45ms' },
    { service: 'Redis Cache', status: 'healthy', uptime: '99.9%', latency: '2ms' }
  ];

  const modelConfigs = [
    { 
      name: 'ARIMA Forecasting', 
      version: 'v2.1.0', 
      accuracy: '87.4%', 
      lastTrained: '2 hours ago',
      status: 'active'
    },
    { 
      name: 'LSTM Neural Network', 
      version: 'v1.8.3', 
      accuracy: '92.1%', 
      lastTrained: '6 hours ago',
      status: 'active'
    },
    { 
      name: 'Ensemble Model', 
      version: 'v3.0.1', 
      accuracy: '94.7%', 
      lastTrained: '1 hour ago',
      status: 'active'
    },
    { 
      name: 'Anomaly Detection', 
      version: 'v1.5.2', 
      accuracy: '96.3%', 
      lastTrained: '4 hours ago',
      status: 'training'
    }
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 2000);
  };

  const tabs = [
    { id: 'system', label: 'System', icon: Database },
    { id: 'models', label: 'ML Models', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      case 'active': return 'text-blue-400 bg-blue-400/10';
      case 'training': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
      case 'training':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white">System Configuration</h1>
          <p className="text-gray-400 mt-1">Manage infrastructure, models, and security settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </motion.div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 mr-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'system' && (
              <div className="space-y-6">
                {/* System Overview */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Infrastructure Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemStatus.map((service, index) => (
                      <motion.div
                        key={service.service}
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-white">{service.service}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${getStatusColor(service.status)}`}>
                            {getStatusIcon(service.status)}
                            <span className="capitalize">{service.status}</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Uptime</span>
                            <span className="text-white">{service.uptime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Latency</span>
                            <span className="text-white">{service.latency}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Resource Configuration */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Resource Allocation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Spark Worker Memory</label>
                      <select className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg">
                        <option>2GB</option>
                        <option>4GB</option>
                        <option>8GB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Kafka Partitions</label>
                      <select className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg">
                        <option>3</option>
                        <option>6</option>
                        <option>12</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-6">
                {/* ML Models Status */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Machine Learning Models</h3>
                  <div className="space-y-4">
                    {modelConfigs.map((model, index) => (
                      <motion.div
                        key={model.name}
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-medium text-white">{model.name}</h4>
                            <p className="text-sm text-gray-400">Version {model.version}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm flex items-center space-x-2 ${getStatusColor(model.status)}`}>
                            {getStatusIcon(model.status)}
                            <span className="capitalize">{model.status}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Accuracy</span>
                            <p className="text-white font-medium">{model.accuracy}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Last Trained</span>
                            <p className="text-white font-medium">{model.lastTrained}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                              Retrain
                            </button>
                            <button className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                              Config
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Model Parameters */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Training Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Training Frequency</label>
                      <select className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg">
                        <option>Every 6 hours</option>
                        <option>Every 12 hours</option>
                        <option>Daily</option>
                        <option>Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Validation Split</label>
                      <input
                        type="range"
                        min="10"
                        max="30"
                        defaultValue="20"
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-sm text-gray-300 mt-1">20%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                {/* Alert Configuration */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Alert Thresholds</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Forecast Accuracy Threshold</label>
                        <input
                          type="range"
                          min="70"
                          max="95"
                          defaultValue="85"
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-sm text-gray-300 mt-1">85%</div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Anomaly Detection Sensitivity</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          defaultValue="3"
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-sm text-gray-300 mt-1">Medium</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Notification Preferences</h3>
                  <div className="space-y-4">
                    {[
                      'System Health Alerts',
                      'Model Performance Degradation',
                      'Supply Chain Anomalies',
                      'Route Optimization Updates',
                      'Inventory Threshold Breaches'
                    ].map((alert, index) => (
                      <div key={alert} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-white">{alert}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Security Overview */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Security Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">Network Security</p>
                      <p className="text-sm text-gray-400">All services isolated</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                      <User className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-blue-400 font-medium">Authentication</p>
                      <p className="text-sm text-gray-400">JWT tokens active</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                      <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-purple-400 font-medium">Data Encryption</p>
                      <p className="text-sm text-gray-400">AES-256 enabled</p>
                    </div>
                  </div>
                </div>

                {/* Access Control */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-6">Access Control</h3>
                  <div className="space-y-4">
                    {[
                      { role: 'Admin', permissions: 'Full system access', users: 2 },
                      { role: 'Data Analyst', permissions: 'Read ML models, forecasts', users: 5 },
                      { role: 'Operations', permissions: 'Route management, inventory', users: 8 },
                      { role: 'Viewer', permissions: 'Dashboard viewing only', users: 12 }
                    ].map((role, index) => (
                      <div key={role.role} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{role.role}</p>
                          <p className="text-sm text-gray-400">{role.permissions}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white">{role.users} users</p>
                          <button className="text-blue-400 text-sm hover:underline">Manage</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;