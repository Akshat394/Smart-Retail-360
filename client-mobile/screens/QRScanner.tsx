import React, { useRef, useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api, { get, patch } from '../services/api';

// Route type
type QRScannerRouteProp = RouteProp<{ QRScanner: { orderId: string } }, 'QRScanner'>;

export default function QRScanner() {
  const route = useRoute<QRScannerRouteProp>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLoading(true);
    try {
      const result = await get<{ valid: boolean }>(`/packages/verify/${data}`);
      if (result.valid) {
        await patch(`/deliveries/${orderId}/status`, { status: 'Delivered', code: data });
        Toast.show({ type: 'success', text1: 'Package verified and delivered!' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Invalid package code' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to verify package' });
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      {loading && <ActivityIndicator style={{ flex: 1 }} size="large" />}
      {!loading && (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ flex: 1 }}
        />
      )}
      {scanned && !loading && (
        <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
      )}
    </View>
  );
} 