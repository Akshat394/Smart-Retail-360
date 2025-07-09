import React, { useState, useEffect } from 'react';
import { Cpu, Brain, Activity, TrendingUp, AlertTriangle, Wifi, Battery, BarChart3, Info, RefreshCw, Zap, Shield } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface EdgeAnalytics {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  avg_battery_level: number;
  total_buffer_utilization: number;
  total_clusters: number;
  total_ml_models: number;
  trained_ml_models: number;
  active_emergencies: number;
  timestamp: string;
}

interface MLModelPerformance {
  model_type: string;
  accuracy: number;
  inference_time: number;
  is_trained: boolean;
  last_updated: string;
  predictions_made: number;
  success_rate: number;
}

interface DeviceCluster {
  cluster_id: string;
  location: string;
  device_count: number;
  cluster_head: string;
  status: string;
  created_at: string;
  devices: any[];
}

interface EmergencyEvent {
  id: string;
  cluster_id: string;
  type: string;
  details: any;
  timestamp: string;
  status: string;
  devices_affected: string[];
}

const EdgeAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<EdgeAnalytics | null>(null);
  const [clusters, setClusters] = useState<DeviceCluster[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [mlPerformance, setMlPerformance] = useState<MLModelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    fetchEdgeAnalytics();
    const interval = setInterval(fetchEdgeAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEdgeAnalytics = async () => {
    try {
      const [analyticsRes, clustersRes, emergenciesRes] = await Promise.all([
        fetch('/api/edge/analytics'),
        fetch('/api/edge/clusters'),
        fetch('/api/edge/emergencies')
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      if (clustersRes.ok) {
        const clustersData = await clustersRes.json();
        setClusters(clustersData.clusters || []);
      }

      if (emergenciesRes.ok) {
        const emergenciesData = await emergenciesRes.json();
        setEmergencies(emergenciesData.emergencies || []);
      }

      // Generate mock ML performance data
      const mockMlPerformance: MLModelPerformance[] = [
        {
          model_type: 'anomaly_detection',
          accuracy: 0.92,
          inference_time: 0.15,
          is_trained: true,
          last_updated: new Date(Date.now() - 3600000).toISOString(),
          predictions_made: 1250,
          success_rate: 0.89
        },
        {
          model_type: 'predictive_maintenance',
          accuracy: 0.88,
          inference_time: 0.22,
          is_trained: true,
          last_updated: new Date(Date.now() - 7200000).toISOString(),
          predictions_made: 890,
          success_rate: 0.85
        },
        {
          model_type: 'quality_control',
          accuracy: 0.95,
          inference_time: 0.18,
          is_trained: true,
          last_updated: new Date(Date.now() - 1800000).toISOString(),
          predictions_made: 2100,
          success_rate: 0.93
        }
      ];
      setMlPerformance(mockMlPerformance);

    } catch (error) {
      console.error('Failed to fetch edge analytics:', error);
      // Fallback to mock data
      setAnalytics({
        total_devices: 15,
        online_devices: 13,
        offline_devices: 2,
        avg_battery_level: 78.5,
        total_buffer_utilization: 45.2,
        total_clusters: 3,
        total_ml_models: 8,
        trained_ml_models: 7,
        active_emergencies: 1,
        timestamp: new Date().toISOString()
      });
      setClusters([
        {
          cluster_id: 'cluster-warehouse-a',
          location: 'Warehouse A',
          device_count: 6,
          cluster_head: 'device-001',
          status: 'active',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          devices: []
        },
        {
          cluster_id: 'cluster-warehouse-b',
          location: 'Warehouse B',
          device_count: 5,
          cluster_head: 'device-007',
          status: 'active',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          devices: []
        }
      ]);
      setEmergencies([
        {
          id: 'EMG-001',
          cluster_id: 'cluster-warehouse-a',
          type: 'temperature_anomaly',
          details: { severity: 'high', sensor: 'temperature', value: 35.2 },
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'active',
          devices_affected: ['device-001', 'device-002']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getClusterStatus = async (clusterId: string) => {
    try {
      const response = await fetch(`/api/edge/clusters/${clusterId}`);
      if (response.ok) {
        const data = await response.json();
        showNotification({ message: `Cluster ${clusterId} status retrieved`, type: 'success', orderId: 0, customerName: '' });
        return data;
      }
    } catch (error) {
      showNotification({ message: 'Failed to get cluster status', type: 'error', orderId: 0, customerName: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-red-400';
      case 'maintenance': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getEmergencyColor = (type: string) => {
    switch (type) {
      case 'temperature_anomaly': return 'text-red-400';
      case 'power_outage': return 'text-orange-400';
      case 'security_breach': return 'text-purple-400';
      case 'equipment_failure': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen p-6 flex items-center justify-center">
        <div className="text-white">Loading edge analytics...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="text-blue-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-white">Edge Analytics</h2>
            <button
              className="ml-2 text-gray-400 hover:text-blue-400"
              onClick={() => setShowOnboarding((v) => !v)}
              title="Show onboarding info"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={fetchEdgeAnalytics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Onboarding Info */}
        {showOnboarding && (
          <div className="bg-blue-900/20 border border-blue-500/40 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">Edge Computing Analytics Dashboard</h3>
                <p className="text-gray-300 text-sm mb-2">
                  Monitor edge computing performance, ML model analytics, device clusters, and emergency events.
                  Track real-time device status, battery levels, and buffer utilization across the edge network.
                </p>
                <div className="text-xs text-gray-400">
                  <p>• Real-time device monitoring and analytics</p>
                  <p>• ML model performance and inference tracking</p>
                  <p>• Device clustering and consensus management</p>
                  <p>• Emergency event monitoring and response</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Cpu className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Total Devices</h3>
              </div>
              <div className="text-3xl font-bold text-blue-400">{analytics.total_devices}</div>
              <div className="text-sm text-gray-400">
                {analytics.online_devices} online, {analytics.offline_devices} offline
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">ML Models</h3>
              </div>
              <div className="text-3xl font-bold text-green-400">{analytics.trained_ml_models}</div>
              <div className="text-sm text-gray-400">
                {analytics.trained_ml_models}/{analytics.total_ml_models} trained
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Battery className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Avg Battery</h3>
              </div>
              <div className="text-3xl font-bold text-purple-400">{analytics.avg_battery_level.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Device battery level</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-orange-500/40">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Emergencies</h3>
              </div>
              <div className="text-3xl font-bold text-orange-400">{analytics.active_emergencies}</div>
              <div className="text-sm text-gray-400">Active events</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ML Model Performance */}
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-green-400" />
              ML Model Performance
            </h3>
            <div className="space-y-4">
              {mlPerformance.map((model, index) => (
                <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white capitalize">{model.model_type.replace('_', ' ')}</h4>
                    <div className={`flex items-center gap-1 ${model.is_trained ? 'text-green-400' : 'text-yellow-400'}`}>
                      {model.is_trained ? <Shield className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span className="text-xs">{model.is_trained ? 'Trained' : 'Training'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Accuracy:</span>
                      <span className="text-green-400 ml-2">{(model.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Inference:</span>
                      <span className="text-blue-400 ml-2">{(model.inference_time * 1000).toFixed(1)}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Predictions:</span>
                      <span className="text-purple-400 ml-2">{model.predictions_made}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="text-orange-400 ml-2">{(model.success_rate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Clusters */}
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-400" />
              Device Clusters
            </h3>
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <div key={cluster.cluster_id} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{cluster.location}</h4>
                    <div className={`flex items-center gap-1 ${getStatusColor(cluster.status)}`}>
                      <Activity className="w-4 h-4" />
                      <span className="text-xs capitalize">{cluster.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-400">
                      Devices: <span className="text-blue-400">{cluster.device_count}</span>
                    </div>
                    <div className="text-gray-400">
                      Head: <span className="text-green-400">{cluster.cluster_head}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => getClusterStatus(cluster.cluster_id)}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Events */}
        <div className="mt-8 bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Emergency Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencies.map((emergency) => (
              <div key={emergency.id} className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{emergency.id}</h4>
                  <div className={`flex items-center gap-1 ${getEmergencyColor(emergency.type)}`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs capitalize">{emergency.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-300 mb-2">{emergency.details?.severity || 'Unknown'} severity</div>
                <div className="text-xs text-gray-400 mb-2">
                  Cluster: {emergency.cluster_id}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Devices affected: {emergency.devices_affected.length}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(emergency.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {emergencies.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-8">
                No active emergency events
              </div>
            )}
          </div>
        </div>

        {/* Buffer Utilization */}
        {analytics && (
          <div className="mt-8 bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Buffer Utilization
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-300 ${
                      analytics.total_buffer_utilization > 80 ? 'bg-red-500' :
                      analytics.total_buffer_utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${analytics.total_buffer_utilization}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-400">
                  {analytics.total_buffer_utilization.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Average utilization</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Clusters:</span>
                <span className="text-blue-400 ml-2">{analytics.total_clusters}</span>
              </div>
              <div>
                <span className="text-gray-400">Buffer Size:</span>
                <span className="text-green-400 ml-2">1000 messages</span>
              </div>
              <div>
                <span className="text-gray-400">Network Status:</span>
                <span className="text-green-400 ml-2">Stable</span>
              </div>
              <div>
                <span className="text-gray-400">Last Update:</span>
                <span className="text-purple-400 ml-2">
                  {new Date(analytics.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EdgeAnalytics; 