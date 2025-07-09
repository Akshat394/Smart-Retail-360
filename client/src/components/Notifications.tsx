import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { apiRequest, useAuth } from '../hooks/useAuth';

export type Notification = {
  id: number;
  orderId: number;
  customerName: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
};

export const NotificationToast: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 bg-blue-700 text-white px-4 py-3 rounded shadow-lg z-50 animate-fade-in">
      <div className="font-semibold mb-1">Notification</div>
      <div>{notification.message}</div>
      <div className="text-xs text-gray-200 mt-1">{new Date(notification.createdAt).toLocaleString()}</div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiRequest(`/api/notifications?customerName=${encodeURIComponent(user.firstName + ' ' + user.lastName)}`);
      setNotifications(data);
    } catch {}
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  // WebSocket for real-time notification popups
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname;
    // Use port 5000 explicitly since window.location.host might not include the port in development
    const wsPort = window.location.port || '5000';
    const ws = new WebSocket(`${wsProtocol}://${wsHost}:${wsPort}/ws`);
    wsRef.current = ws;
    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'clickcollect_update' && msg.data && msg.data.customerName === user?.firstName + ' ' + user?.lastName) {
          // Refetch notifications and show toast
          fetchNotifications();
          setToast({
            id: Date.now(),
            orderId: msg.data.id,
            customerName: msg.data.customerName,
            message: `Order status updated: ${msg.data.status}`,
            type: 'OrderUpdate',
            createdAt: new Date().toISOString(),
            read: false
          });
        }
      } catch {}
    };
    return () => ws.close();
  }, [user]);

  const handleMarkRead = async (id: number) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button className="relative focus:outline-none" title="Notifications">
        <span className="material-icons text-2xl text-blue-600">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">{unreadCount}</span>
        )}
      </button>
      <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg z-40 max-h-96 overflow-y-auto">
        <div className="p-4 border-b font-bold text-gray-700">Notifications</div>
        {notifications.length === 0 ? (
          <div className="p-4 text-gray-400">No notifications yet.</div>
        ) : notifications.map(n => (
          <div key={n.id} className={`p-4 border-b ${n.read ? 'bg-gray-100' : 'bg-blue-50'}`}>
            <div className="font-medium text-gray-800">{n.message}</div>
            <div className="text-xs text-gray-500 mb-2">{new Date(n.createdAt).toLocaleString()}</div>
            {!n.read && (
              <button className="text-blue-600 text-xs underline" onClick={() => handleMarkRead(n.id)}>Mark as read</button>
            )}
          </div>
        ))}
      </div>
      {toast && <NotificationToast notification={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Notifications; 