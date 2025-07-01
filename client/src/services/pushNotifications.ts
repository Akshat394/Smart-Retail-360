import { apiService } from './api';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (this.isSupported) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        this.permission = await this.requestPermission();
        console.log('Push notification service initialized');
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    } else {
      console.warn('Push notifications not supported in this browser');
    }
  }

  private async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return 'denied';

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.registration || this.permission !== 'granted') {
      console.warn('Push notifications not available or permission denied');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      console.log('Successfully subscribed to push notifications');
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  public async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription);
        console.log('Successfully unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  public async showLocalNotification(notification: PushNotification): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification - not supported or permission denied');
      return;
    }

    try {
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction || false,
        silent: notification.silent || false
      };

      if (this.registration) {
        await this.registration.showNotification(notification.title, options);
      } else {
        new Notification(notification.title, options);
      }

      console.log('Local notification shown:', notification.title);
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  public async showLowStockAlert(productName: string, location: string, currentStock: number): Promise<void> {
    const notification: PushNotification = {
      id: `low-stock-${Date.now()}`,
      title: 'Low Stock Alert',
      body: `${productName} is running low at ${location}. Current stock: ${currentStock}`,
      icon: '/icons/inventory-96x96.png',
      tag: 'low-stock',
      data: {
        type: 'low_stock',
        productName,
        location,
        currentStock
      },
      actions: [
        {
          action: 'restock',
          title: 'Create Order',
          icon: '/icons/restock-32x32.png'
        },
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-32x32.png'
        }
      ],
      requireInteraction: true,
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  public async showDeliveryFailureAlert(orderId: string, customerName: string, reason: string): Promise<void> {
    const notification: PushNotification = {
      id: `delivery-failure-${Date.now()}`,
      title: 'Delivery Failed',
      body: `Order #${orderId} for ${customerName} failed: ${reason}`,
      icon: '/icons/delivery-96x96.png',
      tag: 'delivery-failure',
      data: {
        type: 'delivery_failure',
        orderId,
        customerName,
        reason
      },
      actions: [
        {
          action: 'retry',
          title: 'Retry Delivery',
          icon: '/icons/retry-32x32.png'
        },
        {
          action: 'contact',
          title: 'Contact Customer',
          icon: '/icons/contact-32x32.png'
        }
      ],
      requireInteraction: true,
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  public async showRobotMaintenanceAlert(robotId: string, issue: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const notification: PushNotification = {
      id: `robot-maintenance-${Date.now()}`,
      title: `Robot Maintenance Required`,
      body: `Robot ${robotId} needs attention: ${issue}`,
      icon: '/icons/robot-96x96.png',
      badge: severity === 'critical' ? '/icons/critical-72x72.png' : '/icons/warning-72x72.png',
      tag: 'robot-maintenance',
      data: {
        type: 'robot_maintenance',
        robotId,
        issue,
        severity
      },
      actions: [
        {
          action: 'schedule',
          title: 'Schedule Maintenance',
          icon: '/icons/schedule-32x32.png'
        },
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-32x32.png'
        }
      ],
      requireInteraction: severity === 'critical',
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  public async showAnomalyAlert(metric: string, value: number, threshold: number): Promise<void> {
    const notification: PushNotification = {
      id: `anomaly-${Date.now()}`,
      title: 'System Anomaly Detected',
      body: `${metric} value (${value}) exceeds threshold (${threshold})`,
      icon: '/icons/anomaly-96x96.png',
      tag: 'anomaly',
      data: {
        type: 'anomaly',
        metric,
        value,
        threshold
      },
      actions: [
        {
          action: 'investigate',
          title: 'Investigate',
          icon: '/icons/investigate-32x32.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-32x32.png'
        }
      ],
      requireInteraction: false,
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  public async showAIRecommendationAlert(recommendation: string, actionType: string): Promise<void> {
    const notification: PushNotification = {
      id: `ai-recommendation-${Date.now()}`,
      title: 'AI Recommendation',
      body: recommendation,
      icon: '/icons/ai-96x96.png',
      tag: 'ai-recommendation',
      data: {
        type: 'ai_recommendation',
        actionType,
        recommendation
      },
      actions: [
        {
          action: 'approve',
          title: 'Approve',
          icon: '/icons/approve-32x32.png'
        },
        {
          action: 'reject',
          title: 'Reject',
          icon: '/icons/reject-32x32.png'
        }
      ],
      requireInteraction: true,
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  public async showWeatherAlert(location: string, weatherCondition: string, impact: string): Promise<void> {
    const notification: PushNotification = {
      id: `weather-${Date.now()}`,
      title: 'Weather Alert',
      body: `${weatherCondition} in ${location}. Impact: ${impact}`,
      icon: '/icons/weather-96x96.png',
      tag: 'weather-alert',
      data: {
        type: 'weather_alert',
        location,
        weatherCondition,
        impact
      },
      actions: [
        {
          action: 'reroute',
          title: 'Reroute Deliveries',
          icon: '/icons/reroute-32x32.png'
        },
        {
          action: 'view',
          title: 'View Forecast',
          icon: '/icons/forecast-32x32.png'
        }
      ],
      requireInteraction: false,
      timestamp: Date.now()
    };

    await this.showLocalNotification(notification);
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await apiService.createPushSubscription({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await apiService.deletePushSubscription(subscription.endpoint);
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  public async getSubscriptionStatus(): Promise<{
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
  }> {
    if (!this.isSupported) {
      return {
        isSupported: false,
        permission: 'denied',
        isSubscribed: false
      };
    }

    let isSubscribed = false;
    if (this.registration) {
      const subscription = await this.registration.pushManager.getSubscription();
      isSubscribed = !!subscription;
    }

    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isSubscribed
    };
  }

  public async clearAllNotifications(): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  public async getNotificationHistory(): Promise<PushNotification[]> {
    try {
      const response = await apiService.getNotificationHistory();
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  public async updateNotificationPreferences(preferences: {
    lowStock: boolean;
    deliveryFailures: boolean;
    robotMaintenance: boolean;
    anomalies: boolean;
    aiRecommendations: boolean;
    weatherAlerts: boolean;
  }): Promise<void> {
    try {
      await apiService.updateNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();

// Export individual functions for easier use
export const showLowStockAlert = (productName: string, location: string, currentStock: number) =>
  pushNotificationService.showLowStockAlert(productName, location, currentStock);

export const showDeliveryFailureAlert = (orderId: string, customerName: string, reason: string) =>
  pushNotificationService.showDeliveryFailureAlert(orderId, customerName, reason);

export const showRobotMaintenanceAlert = (robotId: string, issue: string, severity: 'low' | 'medium' | 'high' | 'critical') =>
  pushNotificationService.showRobotMaintenanceAlert(robotId, issue, severity);

export const showAnomalyAlert = (metric: string, value: number, threshold: number) =>
  pushNotificationService.showAnomalyAlert(metric, value, threshold);

export const showAIRecommendationAlert = (recommendation: string, actionType: string) =>
  pushNotificationService.showAIRecommendationAlert(recommendation, actionType);

export const showWeatherAlert = (location: string, weatherCondition: string, impact: string) =>
  pushNotificationService.showWeatherAlert(location, weatherCondition, impact); 