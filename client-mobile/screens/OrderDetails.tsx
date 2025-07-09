import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api, { get, patch } from '../services/api';
import { addToQueue, getItem, setItem } from '../utils/storage';

interface Delivery {
  id: string;
  status: 'Pending' | 'Picked' | 'Delivered';
  eta: string;
  location: string;
  address: string;
  packageCode: string;
}

type OrderDetailsRouteProp = RouteProp<{ OrderDetails: { orderId: string } }, 'OrderDetails'>;

export default function OrderDetails() {
  const route = useRoute<OrderDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await get<Delivery>(`/deliveries/${orderId}`);
        setDelivery(data);
        await setItem(`delivery_${orderId}`, data);
      } catch (e) {
        const cached = await getItem<Delivery>(`delivery_${orderId}`);
        if (cached) {
          setDelivery(cached);
          Toast.show({ type: 'info', text1: 'Offline mode', text2: 'Loaded cached order.' });
        } else {
          Toast.show({ type: 'error', text1: 'Failed to load order details' });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const updateStatus = async (newStatus: 'Picked' | 'Delivered') => {
    Alert.alert(
      `Mark as ${newStatus}?`,
      `Are you sure you want to mark this delivery as ${newStatus.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              await patch(`/deliveries/${orderId}/status`, { status: newStatus });
              Toast.show({ type: 'success', text1: `Marked as ${newStatus}` });
              setDelivery(delivery => delivery ? { ...delivery, status: newStatus } : delivery);
              // Log activity locally
              await setItem(`delivery_${orderId}`, { ...delivery, status: newStatus });
            } catch (e) {
              // Queue for offline sync
              await addToQueue({ type: 'status_update', orderId, status: newStatus });
              Toast.show({ type: 'info', text1: 'Offline', text2: 'Update queued for sync.' });
              setDelivery(delivery => delivery ? { ...delivery, status: newStatus } : delivery);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  if (!delivery) return <Text>Order not found.</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{delivery.location}</Text>
      <Text>Status: {delivery.status}</Text>
      <Text>ETA: {delivery.eta}</Text>
      <Text>Address: {delivery.address}</Text>
      <Text>Package: {delivery.packageCode}</Text>
      <View style={{ marginVertical: 16 }}>
        {delivery.status === 'Pending' && (
          <Button title="Mark as Picked Up" onPress={() => updateStatus('Picked')} disabled={updating} />
        )}
        {delivery.status === 'Picked' && (
          <Button title="Mark as Delivered" onPress={() => updateStatus('Delivered')} disabled={updating} />
        )}
        <Button title="Scan QR" onPress={() => navigation.navigate('QRScanner', { orderId })} />
      </View>
    </View>
  );
} 