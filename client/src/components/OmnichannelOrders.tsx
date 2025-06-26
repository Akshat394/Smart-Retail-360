// @jsxImportSource react
import * as React from 'react';
import { useEffect, useState, useRef } from 'react';

const CHANNELS = [
  { value: '', label: 'All', color: '#888', icon: '🌐' },
  { value: 'online', label: 'Online', color: '#007bff', icon: '💻' },
  { value: 'in-store', label: 'In-Store', color: '#28a745', icon: '🏬' },
  { value: 'mobile', label: 'Mobile', color: '#ffc107', icon: '📱' },
  { value: 'partner', label: 'Partner', color: '#6f42c1', icon: '🤝' },
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
};

function channelMeta(channel: string) {
  return CHANNELS.find(c => c.value === channel) || CHANNELS[0];
}

export default function OmnichannelOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [channel, setChannel] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('auth_token');
      const url = channel ? `/api/clickcollect?channel=${channel}` : '/api/clickcollect';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setOrders(await res.json());
      }
    };
    fetchOrders();
  }, [channel]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`);
    wsRef.current = ws;
    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'clickcollect_update') {
        setOrders((prev: Order[]) => {
          // Replace or add the updated order
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

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold flex-1">Omnichannel Orders</h2>
        <select
          className="border rounded px-2 py-1 ml-2"
          value={channel}
          onChange={e => setChannel(e.target.value)}
        >
          {CHANNELS.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">Channel</th>
              <th className="px-2 py-1 text-left">Product</th>
              <th className="px-2 py-1 text-left">Customer</th>
              <th className="px-2 py-1 text-left">Quantity</th>
              <th className="px-2 py-1 text-left">Status</th>
              <th className="px-2 py-1 text-left">Location</th>
              <th className="px-2 py-1 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const meta = channelMeta(order.channel);
              return (
                <tr key={order.id} className="border-b">
                  <td className="px-2 py-1 font-semibold" style={{ color: meta.color }}>
                    <span title={meta.label}>{meta.icon}</span> {meta.label}
                  </td>
                  <td className="px-2 py-1">{order.productName}</td>
                  <td className="px-2 py-1">{order.customerName}</td>
                  <td className="px-2 py-1">{order.quantity}</td>
                  <td className="px-2 py-1">
                    <span className={
                      order.status === 'Pending' ? 'text-yellow-600' :
                      order.status === 'Ready' ? 'text-green-600' :
                      order.status === 'PickedUp' ? 'text-blue-600' :
                      order.status === 'Cancelled' ? 'text-red-600' : ''
                    }>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-2 py-1">{order.location}</td>
                  <td className="px-2 py-1">{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-4">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 