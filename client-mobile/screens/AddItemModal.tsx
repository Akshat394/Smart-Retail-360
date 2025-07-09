import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddItemModal({ visible, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name || !quantity || !location) {
      Toast.show({ type: 'error', text1: 'All fields are required' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/inventory', { name, quantity: Number(quantity), location });
      Toast.show({ type: 'success', text1: 'Item added!' });
      setName(''); setQuantity(''); setLocation('');
      onAdded();
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to add item' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Add Inventory Item</Text>
          <TextInput
            placeholder="Item Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : (
            <Button title="Add Item" onPress={handleAdd} color="#007AFF" />
          )}
          <Button title="Cancel" onPress={onClose} color="#888" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 4 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#222' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 12, backgroundColor: '#f7f9fa' },
}); 