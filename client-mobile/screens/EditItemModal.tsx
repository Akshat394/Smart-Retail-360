import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';

interface Props {
  visible: boolean;
  item: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditItemModal({ visible, item, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setQuantity(item.quantity?.toString() || '');
      setLocation(item.location || '');
      setImageUrl(item.imageUrl || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!name || !quantity || !location) {
      Toast.show({ type: 'error', text1: 'All fields are required' });
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/inventory/${item.id}`, { name, quantity: Number(quantity), location, imageUrl });
      Toast.show({ type: 'success', text1: 'Item updated!' });
      onSaved();
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to update item' });
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for image upload (can be replaced with real picker)
  const handleImageUpload = () => {
    Toast.show({ type: 'info', text1: 'Image upload not implemented' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Edit Inventory Item</Text>
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
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : null}
          <Button title="Upload Image" onPress={handleImageUpload} color="#007AFF" />
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : (
            <Button title="Save Changes" onPress={handleSave} color="#007AFF" />
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
  image: { width: 80, height: 80, borderRadius: 8, marginBottom: 12, alignSelf: 'center' },
}); 