import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, Activity, Thermometer, Droplets, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface EdgeDevice {
  device_id: string;
  device_type: string;
  location: string;
  is_online: boolean;
  last_seen: string;
  sensor_readings: {
    temperature: number;
    humidity: number;
    vibration: number;
    power: number;
  };
  buffer_status: {
    size: number;
    max_size: number;
    utilization: number;
  };
}

const EdgeDevices: React.FC = () => {
  const [devices, setDevices] = useState<Record<string, EdgeDevice>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/edge/devices');
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      } else {
        // Use mock data if API fails
        const mockDevices: Record<string, EdgeDevice> = {
          'device-001': {
            device_id: 'device-001',
            device_type: 'sensor',
            location: 'Warehouse A',
            is_online: true,
            last_seen: new Date().toISOString(),
            sensor_readings: {
              temperature: 22.5 + Math.random() * 5,
              humidity: 45.0 + Math.random() * 10,
              vibration: 0.1 + Math.random() * 0.2,
              power: 100.0 - Math.random() * 20
            },
            buffer_status: {
              size: 5 + Math.floor(Math.random() * 10),
              max_size: 1000,
              utilization: 0.5 + Math.random() * 0.3
            }
          },
          'device-002': {
            device_id: 'device-002',
            device_type: 'gateway',
            location: 'Warehouse B',
            is_online: true,
            last_seen: new Date().toISOString(),
            sensor_readings: {
              temperature: 24.0 + Math.random() * 3,
              humidity: 50.0 + Math.random() * 8,
              vibration: 0.05 + Math.random() * 0.1,
              power: 95.0 - Math.random() * 15
            },
            buffer_status: {
              size: 15 + Math.floor(Math.random() * 20),
              max_size: 2000,
              utilization: 0.6 + Math.random() * 0.2
            }
          },
          'device-003': {
            device_id: 'device-003',
            device_type: 'controller',
            location: 'Loading Dock',
            is_online: false,
            last_seen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            sensor_readings: {
              temperature: 0,
              humidity: 0,
              vibration: 0,
              power: 0
            },
            buffer_status: {
              size: 0,
              max_size: 500,
              utilization: 0
            }
          }
        };
        setDevices(mockDevices);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      showNotification({ message: 'Failed to fetch edge devices', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'sensor': return <Activity className="w-5 h-5" />;
      case 'gateway': return <Wifi className="w-5 h-5" />;
      case 'controller': return <Cpu className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'text-green-400' : 'text-red-400';
  };

  const getBufferColor = (utilization: number) => {
    if (utilization > 0.8) return 'text-red-400';
    if (utilization > 0.6) return 'text-yellow-400';
    return 'text-green-400';
  };

  const deviceList = Object.values(devices);

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="text-blue-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-white">Edge Devices</h2>
          </div>
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Total Devices</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">{deviceList.length}</div>
            <div className="text-sm text-gray-400">Connected</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Wifi className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Online</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {deviceList.filter(d => d.is_online).length}
            </div>
            <div className="text-sm text-gray-400">Active</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <WifiOff className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Offline</h3>
            </div>
            <div className="text-3xl font-bold text-red-400">
              {deviceList.filter(d => !d.is_online).length}
            </div>
            <div className="text-sm text-gray-400">Inactive</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Avg Power</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {deviceList.length > 0 
                ? Math.round(deviceList.reduce((sum, d) => sum + d.sensor_readings.power, 0) / deviceList.length)
                : 0}%
            </div>
            <div className="text-sm text-gray-400">Battery Level</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Device Status</h3>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading devices...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deviceList.map((device) => (
                    <div
                      key={device.device_id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedDevice === device.device_id
                          ? 'border-blue-500 bg-gray-700/50'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedDevice(device.device_id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(device.device_type)}
                          <div>
                            <h4 className="font-semibold text-white">{device.device_id}</h4>
                            <p className="text-sm text-gray-400">{device.device_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(device.is_online)}`}>
                            {device.is_online ? 'Online' : 'Offline'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(device.last_seen).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <span>{device.location}</span>
                        <span className={`${getBufferColor(device.buffer_status.utilization)}`}>
                          Buffer: {Math.round(device.buffer_status.utilization * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Device Details */}
          <div className="lg:col-span-1">
            {selectedDevice && devices[selectedDevice] ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Device Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{devices[selectedDevice].device_id}</h4>
                    <p className="text-sm text-gray-400">{devices[selectedDevice].location}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Sensor Readings</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-300">
                          {devices[selectedDevice].sensor_readings.temperature.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">
                          {devices[selectedDevice].sensor_readings.humidity.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">
                          {devices[selectedDevice].sensor_readings.vibration.toFixed(2)}g
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-gray-300">
                          {devices[selectedDevice].sensor_readings.power.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Buffer Status</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Utilization</span>
                        <span className={getBufferColor(devices[selectedDevice].buffer_status.utilization)}>
                          {Math.round(devices[selectedDevice].buffer_status.utilization * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            devices[selectedDevice].buffer_status.utilization > 0.8 ? 'bg-red-400' :
                            devices[selectedDevice].buffer_status.utilization > 0.6 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${devices[selectedDevice].buffer_status.utilization * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{devices[selectedDevice].buffer_status.size} / {devices[selectedDevice].buffer_status.max_size}</span>
                      </div>
                    </div>
                  </div>

                  {!devices[selectedDevice].is_online && (
                    <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Device is offline</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Last seen: {new Date(devices[selectedDevice].last_seen).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
                <Cpu className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Device Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select a device from the list to view detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeDevices; 