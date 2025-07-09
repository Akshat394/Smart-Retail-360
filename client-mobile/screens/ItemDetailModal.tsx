import React from 'react';
import { Modal, View, Text, Button, StyleSheet, Image } from 'react-native';

interface Props {
  visible: boolean;
  item: any;
  onClose: () => void;
}

const LOW_STOCK_THRESHOLD = 5;

export default function ItemDetailModal({ visible, item, onClose }: Props) {
  if (!item) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{item.name}</Text>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : null}
          <Text style={styles.detail}>Quantity: {item.quantity}</Text>
          <Text style={styles.detail}>Location: {item.location}</Text>
          {item.category && <Text style={styles.detail}>Category: {item.category}</Text>}
          {item.quantity === 0 && <Text style={styles.outBadge}>Out of Stock</Text>}
          {item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD && <Text style={styles.lowBadge}>Low Stock</Text>}
          <Button title="Close" onPress={onClose} color="#007AFF" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 4 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#222', textAlign: 'center' },
  detail: { fontSize: 16, marginBottom: 8, color: '#333' },
  image: { width: 100, height: 100, borderRadius: 8, marginBottom: 12, alignSelf: 'center' },
  outBadge: { color: '#fff', backgroundColor: '#FF3B30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center', marginTop: 4 },
  lowBadge: { color: '#fff', backgroundColor: '#FF9500', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center', marginTop: 4 },
}); 