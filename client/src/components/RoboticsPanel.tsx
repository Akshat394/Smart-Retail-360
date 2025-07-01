import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Bot, Battery, Zap, AlertTriangle, Wrench, Thermometer, Droplets } from 'lucide-react';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  filters: Filters;
};

type Robot = {
  id: string;
  status: string;
  health: number;
  maintenanceDue: boolean;
  battery: number;
  uptime: number;
  zone?: string;
  tasksCompleted?: number;
};

type SensorState = {
  temperature: number;
  humidity: number;
  lastUpdate: string;
};

type Task = {
  id: number;
  type: string;
  status: string;
  assignedRobot?: string;
  startedAt?: string;
  completedAt?: string;
};

const statusMap = {
  active: { icon: Zap, color: 'text-green-400', label: 'Active' },
  charging: { icon: Battery, color: 'text-blue-400', label: 'Charging' },
  maintenance: { icon: Wrench, color: 'text-yellow-400', label: 'Maintenance' },
  error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' },
  idle: { icon: Bot, color: 'text-gray-400', label: 'Idle' },
  'Needs Maintenance': { icon: Wrench, color: 'text-red-400', label: 'Needs Maintenance' },
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyDvT7wST6n7YFSb-Afkt307F2kiX9W_b1o';
const WAREHOUSE_CENTER = { lat: 28.6139, lng: 77.2090 };
const ZONES = [
  { id: 'A', bounds: { north: 28.615, south: 28.613, east: 77.211, west: 77.208 } },
  { id: 'B', bounds: { north: 28.613, south: 28.611, east: 77.211, west: 77.208 } },
  { id: 'C', bounds: { north: 28.615, south: 28.613, east: 77.213, west: 77.211 } },
  { id: 'D', bounds: { north: 28.613, south: 28.611, east: 77.213, west: 77.211 } },
];
const ZONE_COLORS = ['#bae6fd', '#7dd3fc', '#0ea5e9', '#0369a1'];

const RoboticsPanel: React.FC<Props> = ({ filters }) => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [sensors, setSensors] = useState<SensorState>({ temperature: 0, humidity: 0, lastUpdate: '' });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const { showNotification } = useNotification();
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [robotPositions, setRobotPositions] = useState<Record<string, { lat: number; lng: number; trail: { lat: number; lng: number }[] }>>({});
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Memoize robotsWithZone to prevent infinite re-renders
  const robotsWithZone = useMemo(() => {
    return robots.map((r, i) => ({
      ...r,
      zone: r.zone || ZONES[i % ZONES.length].id,
      lat: WAREHOUSE_CENTER.lat + 0.001 * ((i % 2) ? 1 : -1) * (i + 1),
      lng: WAREHOUSE_CENTER.lng + 0.001 * ((i % 2) ? 1 : -1) * (i + 1),
    }));
  }, [robots]);

  // Memoize zone robot counts
  const zoneRobotCounts = useMemo(() => {
    return ZONES.map(z => robotsWithZone.filter(r => r.zone === z.id).length);
  }, [robotsWithZone]);

  // Fetch initial data
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [sensorRes, taskRes, analyticsRes] = await Promise.all([
          apiService.get('/warehouse/sensors') as Promise<any>,
          apiService.get('/warehouse/tasks') as Promise<Task[]>,
          apiService.get('/warehouse/robot-analytics') as Promise<any>,
        ]);
        setSensors({
          temperature: sensorRes.temperature || 0,
          humidity: sensorRes.humidity || 0,
          lastUpdate: sensorRes.lastUpdate || new Date().toISOString(),
        });
        setRobots((sensorRes.robots || []).map((r: any) => ({ ...r, battery: 80 + Math.floor(Math.random() * 20), tasksCompleted: Math.floor(Math.random() * 20) })));
        setTasks(taskRes || []);
        // Show maintenance alerts
        if (analyticsRes?.maintenanceDue && analyticsRes.maintenanceDue.length > 0) {
          analyticsRes.maintenanceDue.forEach((id: string) => showNotification({ message: `Robot ${id} needs maintenance!`, type: 'warning', orderId: 0, customerName: '' }));
        }
      } catch (e: any) {
        showNotification({ message: 'Failed to load robotics data: ' + (e.message || e), type: 'error', orderId: 0, customerName: '' });
      } finally {
        setLoading(false);
      }
    })();
  }, []); // Remove showNotification from dependencies

  // WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws`;
      
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully');
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'warehouse_update' && msg.data) {
              setTasks(msg.data.tasks || []);
              setSensors({
                temperature: msg.data.sensors?.temperature || 0,
                humidity: msg.data.sensors?.humidity || 0,
                lastUpdate: msg.data.sensors?.lastUpdate || new Date().toISOString(),
              });
            }
            if (msg.type === 'robot_health_update' && msg.data) {
              setRobots((msg.data || []).map((r: any) => ({ ...r, battery: 80 + Math.floor(Math.random() * 20), tasksCompleted: Math.floor(Math.random() * 20) })));
            }
            if (msg.type === 'warehouse_alert' && msg.data) {
              showNotification({ message: msg.data.message, type: 'warning', orderId: 0, customerName: '' });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        wsRef.current.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Remove showNotification from dependencies

  // Task action: mark as complete
  const handleCompleteTask = useCallback(async (taskId: number) => {
    try {
      await apiService.updateWarehouseTask(taskId, { status: 'Completed', completedAt: new Date().toISOString() });
      showNotification({ message: `Task #${taskId} marked as completed.`, type: 'success', orderId: 0, customerName: '' });
    } catch (e: any) {
      showNotification({ message: 'Failed to complete task: ' + (e.message || e), type: 'error', orderId: 0, customerName: '' });
    }
  }, [showNotification]);

  // Animate robot positions on update
  useEffect(() => {
    setRobotPositions(prev => {
      const updated: Record<string, { lat: number; lng: number; trail: { lat: number; lng: number }[] }> = { ...prev };
      robotsWithZone.forEach(robot => {
        const prevPos = prev[robot.id] || { lat: robot.lat, lng: robot.lng, trail: [] };
        // If position changed, add to trail
        const moved = prevPos.lat !== robot.lat || prevPos.lng !== robot.lng;
        const newTrail = moved ? [...prevPos.trail.slice(-9), { lat: prevPos.lat, lng: prevPos.lng }] : prevPos.trail;
        updated[robot.id] = { lat: robot.lat, lng: robot.lng, trail: newTrail };
      });
      return updated;
    });
  }, [robotsWithZone]);

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Warehouse Robotics</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading robotics data...</div>
        </div>
      ) : (
        <>
          {/* Sensor Panel */}
          <div className="flex gap-6 mb-8">
            <div className="bg-gray-800/80 rounded-xl p-6 flex flex-col items-center border-2 border-cyan-500/40 shadow-xl min-w-[180px]">
              <Thermometer className="w-7 h-7 text-cyan-400 mb-2" />
              <div className="text-2xl font-bold text-white">{(sensors?.temperature || 0).toFixed(1)}°C</div>
              <div className="text-xs text-cyan-300">Temperature</div>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-6 flex flex-col items-center border-2 border-cyan-500/40 shadow-xl min-w-[180px]">
              <Droplets className="w-7 h-7 text-cyan-400 mb-2" />
              <div className="text-2xl font-bold text-white">{(sensors?.humidity || 0).toFixed(1)}%</div>
              <div className="text-xs text-cyan-300">Humidity</div>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-6 flex flex-col items-center border-2 border-cyan-500/40 shadow-xl min-w-[180px]">
              <Bot className="w-7 h-7 text-cyan-400 mb-2" />
              <div className="text-xs text-cyan-300">Last Update</div>
              <div className="text-white text-sm">{sensors?.lastUpdate ? new Date(sensors.lastUpdate).toLocaleTimeString() : 'N/A'}</div>
            </div>
          </div>
          {/* Robot Status & Performance */}
          <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl mb-8">
            <h3 className="text-lg text-white mb-4">Robot Fleet Status & Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Robot List */}
              <div>
                <h4 className="text-md text-gray-300 font-semibold mb-3">Live Status</h4>
                <ul className="space-y-3">
                  {robots.map((robot: Robot) => {
                    const status = statusMap[robot.status as keyof typeof statusMap] || statusMap.idle;
                    return (
                      <li key={robot.id} className="flex items-center gap-4 p-2 rounded-lg bg-gray-700/50">
                        <status.icon className={`w-6 h-6 ${status.color}`} />
                        <div className="font-bold text-white">{robot.id}</div>
                        <div className="flex-1 text-right text-gray-300">
                          <Battery className="inline-block w-4 h-4 mr-1" />
                          {robot.battery}%
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-semibold ${status.color.replace('text', 'bg').replace('-400', '-500/20')}`}>{status.label}</div>
                        <div className="text-xs text-gray-400 ml-2">Health: {robot.health}%</div>
                        {robot.maintenanceDue && <span className="ml-2 text-yellow-400 font-bold">Maintenance Due</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {/* Performance Chart */}
              <div>
                <h4 className="text-md text-gray-300 font-semibold mb-3">Tasks Completed per Robot</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={robots} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                    <YAxis type="category" dataKey="id" stroke="#9CA3AF" fontSize={12} width={60} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tasksCompleted" fill="#F59E0B" name="Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* Zone Heatmap & Robot Map */}
          <div className="mb-8 rounded-xl overflow-hidden shadow-xl border-2 border-cyan-500/40">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={WAREHOUSE_CENTER}
                defaultZoom={18}
                style={{ width: '100%', height: 400, borderRadius: 16, boxShadow: '0 4px 32px #0008' }}
                gestureHandling="greedy"
                disableDefaultUI={false}
              >
                {/* Draw warehouse zones as rectangles with animated heatmap color */}
                {ZONES.map((zone, idx) => {
                  const count = zoneRobotCounts[idx];
                  const colorIdx = Math.min(count, ZONE_COLORS.length - 1);
                  const isActive = hoveredZone === zone.id || count >= 3;
                  return (
                    <RectangleOverlay
                      key={zone.id}
                      bounds={zone.bounds}
                      fillColor={ZONE_COLORS[colorIdx]}
                      fillOpacity={isActive ? 0.5 : 0.25 + 0.15 * Math.min(count, 3)}
                      strokeColor={isActive ? '#facc15' : '#0ea5e9'}
                      strokeWeight={isActive ? 4 : 2}
                      label={zone.id}
                    />
                  );
                })}
                {/* Zone hover tooltip */}
                <AnimatePresence>
                  {hoveredZone && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: 'absolute',
                        left: 24,
                        top: 24,
                        zIndex: 2000,
                        background: '#0f172a',
                        color: '#fff',
                        padding: '14px 20px',
                        borderRadius: 12,
                        boxShadow: '0 2px 12px #0006',
                        minWidth: 180,
                        pointerEvents: 'none',
                      }}
                    >
                      <div className="font-bold text-cyan-400 mb-1">Zone {hoveredZone}</div>
                      <div>Robots: {robotsWithZone.filter(r => r.zone === hoveredZone).length}</div>
                      <div>Active Tasks: {robotsWithZone.filter(r => r.zone === hoveredZone && r.status === 'Working').length}</div>
                      <div>Maintenance Alerts: {robotsWithZone.filter(r => r.zone === hoveredZone && r.maintenanceDue).length}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Robot path trails */}
                {Object.entries(robotPositions).map(([id, pos]) => (
                  pos.trail.length > 1 && (
                    <RobotTrailOverlay
                      key={`trail-${id}`}
                      path={pos.trail.concat([{ lat: pos.lat, lng: pos.lng }])}
                    />
                  )
                ))}
                {/* Robot markers with smooth animation */}
                {robotsWithZone.map((robot, idx) => {
                  const pos = robotPositions[robot.id] || { lat: robot.lat, lng: robot.lng };
                  return (
                    <motion.div
                      key={robot.id}
                      initial={false}
                      style={{ position: 'absolute' }}
                    >
                      <AdvancedMarker
                        position={{ lat: pos.lat, lng: pos.lng }}
                        onClick={() => setSelectedRobot(robot)}
                      >
                        <Bot className={`w-6 h-6 drop-shadow-lg ${robot.maintenanceDue ? 'text-yellow-400 animate-pulse' : 'text-cyan-400'}`} />
                        {selectedRobot && selectedRobot.id === robot.id && (
                          <InfoWindow onCloseClick={() => setSelectedRobot(null)}>
                            <div>
                              <strong>Robot {robot.id}</strong><br />
                              Status: {robot.status}<br />
                              Battery: {robot.battery}%<br />
                              Health: {robot.health}%<br />
                              Tasks Completed: {robot.tasksCompleted}<br />
                              Zone: {robot.zone}
                              {robot.maintenanceDue && <div className="text-yellow-400 font-bold">Maintenance Due</div>}
                            </div>
                          </InfoWindow>
                        )}
                      </AdvancedMarker>
                    </motion.div>
                  );
                })}
              </Map>
            </APIProvider>
          </div>
          {/* Task Queue */}
          <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-cyan-500/40 shadow-xl">
            <h3 className="text-lg text-white mb-4">Automation Task Queue</h3>
            <table className="min-w-full text-sm text-gray-300">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-2 text-left">Task ID</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Assigned Robot</th>
                  <th className="px-4 py-2 text-left">Started</th>
                  <th className="px-4 py-2 text-left">Completed</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No tasks in queue.</td></tr>
                ) : tasks.map(task => (
                  <tr key={task.id} className="border-b border-gray-700">
                    <td className="px-4 py-2">{task.id}</td>
                    <td className="px-4 py-2">{task.type}</td>
                    <td className="px-4 py-2">{task.status}</td>
                    <td className="px-4 py-2">{task.assignedRobot || '-'}</td>
                    <td className="px-4 py-2">{task.startedAt ? new Date(task.startedAt).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-2">{task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-2">
                      {task.status !== 'Completed' && (
                        <button
                          className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs font-semibold shadow transition-all duration-200"
                          onClick={() => handleCompleteTask(task.id)}
                        >Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// RectangleOverlay component for Google Maps
const RectangleOverlay: React.FC<{
  bounds: { north: number; south: number; east: number; west: number };
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
  label?: string;
}> = ({ bounds, fillColor, fillOpacity, strokeColor, strokeWeight, label }) => {
  const map = useMap();
  const rectRef = useRef<google.maps.Rectangle | null>(null);
  useEffect(() => {
    if (!map) return;
    if (rectRef.current) {
      rectRef.current.setMap(null);
      rectRef.current = null;
    }
    rectRef.current = new window.google.maps.Rectangle({
      bounds,
      fillColor,
      fillOpacity,
      strokeColor,
      strokeWeight,
      map,
    });
    return () => {
      if (rectRef.current) {
        rectRef.current.setMap(null);
        rectRef.current = null;
      }
    };
  }, [map, bounds, fillColor, fillOpacity, strokeColor, strokeWeight]);
  // Label overlay (unchanged)
  useEffect(() => {
    if (!map || !label) return;
    const center = {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    };
    const marker = new window.google.maps.Marker({
      position: center,
      map,
      label: {
        text: label,
        color: '#0ea5e9',
        fontWeight: 'bold',
        fontSize: '16px',
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 0.1,
        fillOpacity: 0,
        strokeOpacity: 0,
      },
      zIndex: 4,
    });
    return () => marker.setMap(null);
  }, [map, bounds, label]);
  return null;
};

// RobotTrailOverlay: draws a polyline for a robot's recent trail
const RobotTrailOverlay: React.FC<{ path: { lat: number; lng: number }[] }> = ({ path }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  useEffect(() => {
    if (!map || !path || path.length < 2) return;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#38bdf8',
      strokeOpacity: 0.7,
      strokeWeight: 3,
      zIndex: 2,
    });
    polylineRef.current.setMap(map);
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path]);
  return null;
};

export default RoboticsPanel;
export type { Props as RoboticsPanelProps }; 