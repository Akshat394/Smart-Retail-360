import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, StyleSheet, Button, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api, { get } from '../services/api';
import { setItem, getItem } from '../utils/storage';
import { useWebSocket } from '../hooks/useWebSocket';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';
import ItemDetailModal from './ItemDetailModal';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  location: string;
  imageUrl?: string;
  category?: string;
}

const USER_ID = 'demo-user'; // Replace with real user auth
const IS_MANAGER = true; // Simulate role for now
const LOW_STOCK_THRESHOLD = 5;

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('name');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<InventoryItem[]>(`/inventory`);
      setItems(Array.isArray(data) ? data : []);
      await setItem('inventory', Array.isArray(data) ? data : []);
    } catch (e) {
      const cached = await getItem<InventoryItem[]>('inventory');
      setItems(Array.isArray(cached) ? cached : []);
      if (cached && Array.isArray(cached)) {
        Toast.show({ type: 'info', text1: 'Offline mode', text2: 'Loaded cached inventory.' });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to load inventory' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useWebSocket('ws://localhost:5000/ws/inventory', (data) => {
    if (data.type === 'update') {
      fetchItems();
      Toast.show({ type: 'success', text1: 'Inventory updated', text2: data.message });
    }
  });

  // Filtering
  const filtered = items.filter(item => {
    if (filter === 'low') return item.quantity <= LOW_STOCK_THRESHOLD;
    if (filter === 'out') return item.quantity === 0;
    if (filter !== 'all' && item.category) return item.category === filter;
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'quantity') return a.quantity - b.quantity;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // Delete item
  const handleDelete = (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete '${item.name}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await api.delete(`/inventory/${item.id}`);
              Toast.show({ type: 'success', text1: 'Item deleted' });
              fetchItems();
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to delete item' });
            }
          }
        }
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📦 Smart Retail 360 Inventory ERP</Text>
      <View style={styles.filterRow}>
        <TextInput
          placeholder="Search by name or location"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <Button title="All" onPress={() => setFilter('all')} color={filter==='all' ? '#007AFF' : '#aaa'} />
        <Button title="Low" onPress={() => setFilter('low')} color={filter==='low' ? '#FF9500' : '#aaa'} />
        <Button title="Out" onPress={() => setFilter('out')} color={filter==='out' ? '#FF3B30' : '#aaa'} />
        <Button title="Sort: Name" onPress={() => setSort('name')} color={sort==='name' ? '#007AFF' : '#aaa'} />
        <Button title="Sort: Qty" onPress={() => setSort('quantity')} color={sort==='quantity' ? '#007AFF' : '#aaa'} />
      </View>
      {IS_MANAGER && (
        <Button title="Add Item" onPress={() => setShowAddModal(true)} color="#007AFF" />
      )}
      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchItems} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => { setSelectedItem(item); setShowDetailModal(true); }}
            onLongPress={() => {
              if (IS_MANAGER) {
                setSelectedItem(item);
                setShowEditModal(true);
              }
            }}
          >
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text>Qty: {item.quantity} | Location: {item.location}</Text>
              {item.quantity === 0 && <Text style={styles.outBadge}>Out of Stock</Text>}
              {item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD && <Text style={styles.lowBadge}>Low Stock</Text>}
            </View>
            {IS_MANAGER && (
              <Button title="Edit" onPress={() => { setSelectedItem(item); setShowEditModal(true); }} color="#007AFF" />
            )}
            {IS_MANAGER && (
              <Button title="Delete" onPress={() => handleDelete(item)} color="#FF3B30" />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No inventory items found.</Text>}
      />
      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchItems}
      />
      <EditItemModal
        visible={showEditModal}
        item={selectedItem}
        onClose={() => setShowEditModal(false)}
        onSaved={fetchItems}
      />
      <ItemDetailModal
        visible={showDetailModal}
        item={selectedItem}
        onClose={() => setShowDetailModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f9fa' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#222' },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 },
  search: { borderWidth: 1, borderRadius: 8, marginBottom: 12, padding: 8, borderColor: '#ddd', backgroundColor: '#fff', flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 },
  itemTitle: { fontWeight: 'bold', fontSize: 16, color: '#007AFF' },
  itemImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  outBadge: { color: '#fff', backgroundColor: '#FF3B30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  lowBadge: { color: '#fff', backgroundColor: '#FF9500', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
}); 