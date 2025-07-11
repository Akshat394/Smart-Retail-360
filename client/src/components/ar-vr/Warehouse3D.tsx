import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Truck, 
  Users, 
  Activity, 
  Thermometer, 
  Zap, 
  AlertTriangle,
  MapPin,
  Clock,
  TrendingUp,
  Battery,
  Wifi,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import RobotView3D from './RobotView3D';

interface Zone {
  id: string;
  name: string;
  type: 'storage' | 'packing' | 'shipping' | 'receiving' | 'robotics';
  status: 'active' | 'warning' | 'error' | 'maintenance';
  occupancy: number;
  capacity: number;
  temperature: number;
  humidity: number;
  co2Level: number;
  robots: number;
  efficiency: number;
  lastUpdated: string;
}

interface Robot {
  id: string;
  name: string;
  type: 'picker' | 'mover' | 'sorter';
  status: 'active' | 'charging' | 'maintenance' | 'idle';
  battery: number;
  location: { x: number; y: number };
  currentTask: string;
  efficiency: number;
}

interface Sensor {
  id: string;
  type: 'temperature' | 'humidity' | 'co2' | 'motion' | 'light';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  location: { x: number; y: number };
}

const Warehouse2D: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showSensors, setShowSensors] = useState(true);
  const [showRobots, setShowRobots] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'analytics'>('overview');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
  const [viewType, setViewType] = useState<'overview' | 'robot'>('overview');

  useEffect(() => {
    initializeWarehouse();
    const interval = setInterval(updateWarehouseData, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeWarehouse = () => {
    const mockZones: Zone[] = [
      {
        id: 'zone-1',
        name: 'Storage A',
        type: 'storage',
        status: 'active',
        occupancy: 85,
        capacity: 100,
        temperature: 22,
        humidity: 45,
        co2Level: 450,
        robots: 3,
        efficiency: 92,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'zone-2',
        name: 'Storage B',
        type: 'storage',
        status: 'warning',
        occupancy: 95,
        capacity: 100,
        temperature: 24,
        humidity: 52,
        co2Level: 520,
        robots: 2,
        efficiency: 87,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'zone-3',
        name: 'Packing Station',
        type: 'packing',
        status: 'active',
        occupancy: 60,
        capacity: 80,
        temperature: 23,
        humidity: 48,
        co2Level: 480,
        robots: 4,
        efficiency: 94,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'zone-4',
        name: 'Shipping Dock',
        type: 'shipping',
        status: 'active',
        occupancy: 40,
        capacity: 60,
        temperature: 21,
        humidity: 42,
        co2Level: 410,
        robots: 2,
        efficiency: 89,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'zone-5',
        name: 'Receiving Bay',
        type: 'receiving',
        status: 'active',
        occupancy: 30,
        capacity: 50,
        temperature: 20,
        humidity: 40,
        co2Level: 390,
        robots: 1,
        efficiency: 91,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'zone-6',
        name: 'Robotics Hub',
        type: 'robotics',
        status: 'active',
        occupancy: 70,
        capacity: 90,
        temperature: 25,
        humidity: 55,
        co2Level: 550,
        robots: 6,
        efficiency: 96,
        lastUpdated: new Date().toISOString()
      }
    ];

    const mockRobots: Robot[] = [
      {
        id: 'robot-1',
        name: 'Picker-01',
        type: 'picker',
        status: 'active',
        battery: 85,
        location: { x: 25, y: 30 },
        currentTask: 'Picking items for order #12345',
        efficiency: 94
      },
      {
        id: 'robot-2',
        name: 'Mover-02',
        type: 'mover',
        status: 'charging',
        battery: 45,
        location: { x: 75, y: 40 },
        currentTask: 'Moving pallets to storage',
        efficiency: 88
      },
      {
        id: 'robot-3',
        name: 'Sorter-03',
        type: 'sorter',
        status: 'active',
        battery: 92,
        location: { x: 50, y: 70 },
        currentTask: 'Sorting packages by destination',
        efficiency: 96
      },
      {
        id: 'robot-4',
        name: 'Picker-04',
        type: 'picker',
        status: 'maintenance',
        battery: 20,
        location: { x: 80, y: 80 },
        currentTask: 'Maintenance scheduled',
        efficiency: 78
      }
    ];

    const mockSensors: Sensor[] = [
      { id: 'temp-1', type: 'temperature', value: 22, unit: '°C', status: 'normal', location: { x: 20, y: 25 } },
      { id: 'hum-1', type: 'humidity', value: 45, unit: '%', status: 'normal', location: { x: 30, y: 35 } },
      { id: 'co2-1', type: 'co2', value: 450, unit: 'ppm', status: 'normal', location: { x: 40, y: 45 } },
      { id: 'motion-1', type: 'motion', value: 1, unit: 'detected', status: 'normal', location: { x: 60, y: 55 } },
      { id: 'light-1', type: 'light', value: 85, unit: '%', status: 'normal', location: { x: 70, y: 65 } }
    ];

    setZones(mockZones);
    setRobots(mockRobots);
    setSensors(mockSensors);
  };

  const updateWarehouseData = () => {
    setZones(prev => prev.map(zone => ({
      ...zone,
      occupancy: Math.max(0, Math.min(100, zone.occupancy + (Math.random() - 0.5) * 10)),
      temperature: zone.temperature + (Math.random() - 0.5) * 2,
      humidity: zone.humidity + (Math.random() - 0.5) * 5,
      co2Level: zone.co2Level + (Math.random() - 0.5) * 20,
      efficiency: Math.max(70, Math.min(100, zone.efficiency + (Math.random() - 0.5) * 5)),
      lastUpdated: new Date().toISOString()
    })));

    setRobots(prev => prev.map(robot => ({
      ...robot,
      battery: Math.max(0, Math.min(100, robot.battery + (Math.random() - 0.5) * 10)),
      efficiency: Math.max(70, Math.min(100, robot.efficiency + (Math.random() - 0.5) * 3)),
      location: {
        x: Math.max(10, Math.min(90, robot.location.x + (Math.random() - 0.5) * 10)),
        y: Math.max(10, Math.min(90, robot.location.y + (Math.random() - 0.5) * 10))
      }
    })));
  };

  const getZoneColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'storage': return <Package className="w-4 h-4" />;
      case 'packing': return <Truck className="w-4 h-4" />;
      case 'shipping': return <MapPin className="w-4 h-4" />;
      case 'receiving': return <Clock className="w-4 h-4" />;
      case 'robotics': return <Settings className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getRobotStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'charging': return 'text-blue-400';
      case 'maintenance': return 'text-yellow-400';
      case 'idle': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-3 h-3" />;
      case 'humidity': return <Activity className="w-3 h-3" />;
      case 'co2': return <AlertTriangle className="w-3 h-3" />;
      case 'motion': return <Users className="w-3 h-3" />;
      case 'light': return <Zap className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Warehouse 2D Layout</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewType(viewType === 'overview' ? 'robot' : 'overview')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${viewType === 'robot' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-blue-200'}`}
            >
              {viewType === 'robot' ? "Switch to Overview" : "Robot's Eye View"}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSensors(!showSensors)}
                className={`p-2 rounded-lg ${showSensors ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                {showSensors ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-white" />}
              </button>
              <span className="text-sm text-gray-300">Sensors</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRobots(!showRobots)}
                className={`p-2 rounded-lg ${showRobots ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                {showRobots ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-white" />}
              </button>
              <span className="text-sm text-gray-300">Robots</span>
            </div>

            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="overview">Overview</option>
              <option value="detailed">Detailed</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
        </div>

        {/* Warehouse Layout or Robot View */}
        {viewType === 'overview' ? (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <div className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
              {/* Grid Background */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Zones */}
              <div className="absolute inset-0">
                {zones.map((zone, index) => {
                  const positions = [
                    { x: 10, y: 10, w: 35, h: 25 }, // Storage A
                    { x: 55, y: 10, w: 35, h: 25 }, // Storage B
                    { x: 10, y: 40, w: 35, h: 25 }, // Packing Station
                    { x: 55, y: 40, w: 35, h: 25 }, // Shipping Dock
                    { x: 10, y: 70, w: 35, h: 25 }, // Receiving Bay
                    { x: 55, y: 70, w: 35, h: 25 }  // Robotics Hub
                  ];
                  const pos = positions[index] || { x: 10, y: 10, w: 35, h: 25 };

                  return (
                    <motion.div
                      key={zone.id}
                      className={`absolute border-2 border-white/30 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 ${
                        selectedZone?.id === zone.id ? 'ring-4 ring-blue-400' : ''
                      }`}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: `${pos.w}%`,
                        height: `${pos.h}%`,
                        backgroundColor: `rgba(34, 197, 94, ${zone.occupancy / 100 * 0.3})`
                      }}
                      onClick={() => setSelectedZone(zone)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="p-2 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {getZoneTypeIcon(zone.type)}
                            <span className="text-xs font-medium text-white">{zone.name}</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${getZoneColor(zone.status)}`} />
                        </div>
                        
                        <div className="text-xs text-gray-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Occupancy:</span>
                            <span className="text-white">{Math.round(zone.occupancy)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Efficiency:</span>
                            <span className="text-white">{Math.round(zone.efficiency)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Robots:</span>
                            <span className="text-white">{zone.robots}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Robots */}
              {showRobots && robots.map((robot) => (
                <motion.div
                  key={robot.id}
                  className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer"
                  style={{
                    left: `${robot.location.x}%`,
                    top: `${robot.location.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    x: [0, 5, 0],
                    y: [0, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  title={`${robot.name} - ${robot.currentTask}`}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${getRobotStatusColor(robot.status)}`}>
                    <Battery className="w-3 h-3" />
                  </div>
                </motion.div>
              ))}

              {/* Sensors */}
              {showSensors && sensors.map((sensor) => (
                <motion.div
                  key={sensor.id}
                  className="absolute w-4 h-4 bg-purple-500 rounded-full border border-white shadow-md cursor-pointer"
                  style={{
                    left: `${sensor.location.x}%`,
                    top: `${sensor.location.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  title={`${sensor.type}: ${sensor.value}${sensor.unit}`}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${getSensorStatusColor(sensor.status)}`}>
                    {getSensorIcon(sensor.type)}
                  </div>
                </motion.div>
              ))}

              {/* Conveyor Lines */}
              <svg className="absolute inset-0 pointer-events-none">
                <defs>
                  <pattern id="conveyor" patternUnits="userSpaceOnUse" width="20" height="4">
                    <rect width="20" height="4" fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,2"/>
                  </pattern>
                </defs>
                <path d="M 40 210 L 360 210" stroke="url(#conveyor)" strokeWidth="3" fill="none"/>
                <path d="M 200 60 L 200 340" stroke="url(#conveyor)" strokeWidth="3" fill="none"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl flex justify-center">
            <RobotView3D />
          </div>
        )}

        {/* Zone Details Panel */}
        {selectedZone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{selectedZone.name}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedZone.status === 'active' ? 'bg-green-500/20 text-green-400' :
                selectedZone.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                selectedZone.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {selectedZone.status}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Occupancy</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(selectedZone.occupancy)}%</div>
                <div className="text-xs text-gray-400">Capacity: {selectedZone.capacity}</div>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-300">Temperature</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(selectedZone.temperature)}°C</div>
                <div className="text-xs text-gray-400">Humidity: {Math.round(selectedZone.humidity)}%</div>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(selectedZone.efficiency)}%</div>
                <div className="text-xs text-gray-400">Robots: {selectedZone.robots}</div>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">CO2 Level</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(selectedZone.co2Level)} ppm</div>
                <div className="text-xs text-gray-400">Last updated: {new Date(selectedZone.lastUpdated).toLocaleTimeString()}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Overall Efficiency</h3>
                <p className="text-sm text-gray-400">Warehouse Performance</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {Math.round(zones.reduce((acc, zone) => acc + zone.efficiency, 0) / zones.length)}%
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Active Robots</h3>
                <p className="text-sm text-gray-400">Currently Operating</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {robots.filter(r => r.status === 'active').length}/{robots.length}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Sensor Status</h3>
                <p className="text-sm text-gray-400">Environmental Monitoring</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {sensors.filter(s => s.status === 'normal').length}/{sensors.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warehouse2D;
