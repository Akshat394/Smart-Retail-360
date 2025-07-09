// @jsxImportSource react
import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Leaf, 
  Clock, 
  MapPin, 
  Filter, 
  Search, 
  BarChart3, 
  Users, 
  Package,
  Smartphone,
  Monitor,
  Store,
  Handshake,
  Zap,
  Target,
  Award
} from 'lucide-react';

const CHANNELS = [
  { value: '', label: 'All', color: '#888', icon: '🌐', description: 'All channels combined' },
  { value: 'online', label: 'Online', color: '#007bff', icon: '💻', description: 'Web-based orders' },
  { value: 'in-store', label: 'In-Store', color: '#28a745', icon: '🏬', description: 'Physical store orders' },
  { value: 'mobile', label: 'Mobile', color: '#ffc107', icon: '📱', description: 'Mobile app orders' },
  { value: 'partner', label: 'Partner', color: '#6f42c1', icon: '🤝', description: 'Third-party partner orders' },
];

const STATUSES = [
  { value: '', label: 'All Statuses', color: '#888' },
  { value: 'Pending', label: 'Pending', color: '#f59e0b' },
  { value: 'Ready', label: 'Ready', color: '#10b981' },
  { value: 'PickedUp', label: 'Picked Up', color: '#3b82f6' },
  { value: 'Cancelled', label: 'Cancelled', color: '#ef4444' },
];

export type Order = {
  id: number;
  productName: string;
  customerName: string;
  customerContact: string;
  quantity: number;
  location: string;
  status: string;
  channel: string;
  createdAt: string;
  greenDelivery?: boolean;
  co2Emission?: number;
  energyUsage?: number;
  deliveryEfficiencyScore?: number;
  updatedAt?: string;
};

interface ChannelAnalytics {
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  carbonFootprint: number;
  averageProcessingTime: number;
  peakHours: string[];
  topProducts: { name: string; count: number }[];
}

function channelMeta(channel: string) {
  return CHANNELS.find(c => c.value === channel) || CHANNELS[0];
}

function statusMeta(status: string) {
  return STATUSES.find(s => s.value === status) || STATUSES[0];
}

export default function OmnichannelOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [channel, setChannel] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<ChannelAnalytics | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const url = channel ? `/api/clickcollect?channel=${channel}` : '/api/clickcollect';
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };
    fetchOrders();
  }, [channel]);

  // Filter and sort orders
  useEffect(() => {
    let filtered = orders;

    // Filter by status
    if (status) {
      filtered = filtered.filter(order => order.status === status);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Order];
      let bValue: any = b[sortBy as keyof Order];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, status, searchTerm, sortBy, sortOrder]);

  // Calculate analytics
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const totalOrders = filteredOrders.length;
      const totalValue = filteredOrders.reduce((sum, order) => sum + (order.quantity * 100), 0); // Assume $100 per unit
      const averageOrderValue = totalValue / totalOrders;
      
      // Calculate conversion rate (simplified)
      const completedOrders = filteredOrders.filter(order => order.status === 'PickedUp').length;
      const conversionRate = (completedOrders / totalOrders) * 100;
      
      // Calculate customer satisfaction (simplified)
      const customerSatisfaction = 85 + Math.random() * 10; // 85-95%
      
      // Calculate carbon footprint
      const totalCarbon = filteredOrders.reduce((sum, order) => sum + (order.co2Emission || 0), 0);
      
      // Calculate average processing time
      const processingTimes = filteredOrders
        .filter(order => order.updatedAt)
        .map(order => {
          const created = new Date(order.createdAt).getTime();
          const updated = new Date(order.updatedAt!).getTime();
          return (updated - created) / (1000 * 60 * 60); // hours
        });
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      // Calculate peak hours (simplified)
      const peakHours = ['10:00-12:00', '14:00-16:00', '18:00-20:00'];

      // Calculate top products
      const productCounts: { [key: string]: number } = {};
      filteredOrders.forEach(order => {
        productCounts[order.productName] = (productCounts[order.productName] || 0) + 1;
      });
      const topProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalOrders,
        averageOrderValue,
        conversionRate,
        customerSatisfaction,
        carbonFootprint: totalCarbon,
        averageProcessingTime,
        peakHours,
        topProducts
      });
    }
  }, [filteredOrders]);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port || '5000';
    const ws = new WebSocket(`${wsProtocol}://${wsHost}:${wsPort}/ws`);
    wsRef.current = ws;
    
    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'clickcollect_update') {
        setOrders((prev: Order[]) => {
          const idx = prev.findIndex(o => o.id === msg.data.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = msg.data;
            return updated;
          } else {
            return [msg.data, ...prev];
          }
        });
      }
    };
    
    return () => ws.close();
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'online': return <Monitor className="w-4 h-4" />;
      case 'in-store': return <Store className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'partner': return <Handshake className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-400" />
            Omnichannel Orders
          </h2>
          <p className="text-gray-400 mt-1">Unified view across all customer touchpoints</p>
        </div>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
        </button>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && analytics && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Order Value</p>
                <p className="text-2xl font-bold">${analytics.averageOrderValue.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Carbon Footprint</p>
                <p className="text-2xl font-bold">{analytics.carbonFootprint.toFixed(1)}kg</p>
              </div>
              <Leaf className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            value={channel}
            onChange={e => setChannel(e.target.value)}
          >
            {CHANNELS.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('channel')}>
                <div className="flex items-center gap-2">
                  Channel
                  {sortBy === 'channel' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('productName')}>
                <div className="flex items-center gap-2">
                  Product
                  {sortBy === 'productName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('customerName')}>
                <div className="flex items-center gap-2">
                  Customer
                  {sortBy === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('quantity')}>
                <div className="flex items-center gap-2">
                  Quantity
                  {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">
                  Status
                  {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                  {sortBy === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Created
                  {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-4 py-3 text-left">Sustainability</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const channelInfo = channelMeta(order.channel);
              const statusInfo = statusMeta(order.status);
              return (
                <motion.tr
                  key={order.id}
                  className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                  whileHover={{ backgroundColor: '#374151' }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(order.channel)}
                      <span className="font-semibold" style={{ color: channelInfo.color }}>
                        {channelInfo.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{order.productName}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-gray-400 text-xs">{order.customerContact}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{order.quantity}</td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{order.location}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {order.greenDelivery && (
                        <span className="px-2 py-1 bg-green-600 text-white rounded-full text-xs">
                          <Leaf className="w-3 h-3 inline mr-1" />
                          Green
                        </span>
                      )}
                      {order.co2Emission && (
                        <span className="text-xs text-gray-400">
                          {order.co2Emission.toFixed(1)}kg CO₂
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-12 h-12" />
                    <span className="text-lg font-semibold">No orders found</span>
                    <span className="text-sm">Try adjusting your filters or search criteria.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Order ID:</span> #{selectedOrder.id}</div>
                  <div><span className="text-gray-400">Product:</span> {selectedOrder.productName}</div>
                  <div><span className="text-gray-400">Quantity:</span> {selectedOrder.quantity}</div>
                  <div><span className="text-gray-400">Status:</span> {selectedOrder.status}</div>
                  <div><span className="text-gray-400">Channel:</span> {channelMeta(selectedOrder.channel).label}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Name:</span> {selectedOrder.customerName}</div>
                  <div><span className="text-gray-400">Contact:</span> {selectedOrder.customerContact}</div>
                  <div><span className="text-gray-400">Location:</span> {selectedOrder.location}</div>
                  <div><span className="text-gray-400">Created:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            {selectedOrder.greenDelivery && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  Sustainability Metrics
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">CO₂ Emission:</span>
                    <div className="font-semibold">{selectedOrder.co2Emission?.toFixed(2) || 'N/A'} kg</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Energy Usage:</span>
                    <div className="font-semibold">{selectedOrder.energyUsage?.toFixed(2) || 'N/A'} kWh</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Efficiency Score:</span>
                    <div className="font-semibold">{selectedOrder.deliveryEfficiencyScore?.toFixed(1) || 'N/A'}/100</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 