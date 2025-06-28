import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { NotificationToast, Notification } from '../components/Notifications';

// Notification context type
interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'> & { id?: number; createdAt?: string; read?: boolean }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within a NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notif: Omit<Notification, 'id' | 'createdAt' | 'read'> & { id?: number; createdAt?: string; read?: boolean }) => {
    const notification: Notification = {
      id: notif.id ?? Date.now() + Math.random(),
      orderId: notif.orderId ?? 0,
      customerName: notif.customerName ?? '',
      message: notif.message,
      type: notif.type ?? 'info',
      createdAt: notif.createdAt ?? new Date().toISOString(),
      read: notif.read ?? false,
    };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 4000);
  }, []);

  const handleClose = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notifications.map((notification, idx) => (
          <div key={notification.id} style={{ marginTop: idx === 0 ? 0 : 8 }}>
            <NotificationToast notification={notification} onClose={() => handleClose(notification.id)} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}; 