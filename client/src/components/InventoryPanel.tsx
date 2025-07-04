import React, { useState, useMemo } from 'react';
import { generateInventory, InventoryItem } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';

const getStockStatus = (quantity: number) => {
  if (quantity === 0) return { label: 'Out of Stock', color: '#EF4444' };
  if (quantity < 20) return { label: 'Low Stock', color: '#F59E0B' };
  if (quantity > 200) return { label: 'Overstock', color: '#8B5CF6' };
  return { label: 'In Stock', color: '#10B981' };
};

type Props = {
  filters: Filters;
  search?: string;
};

const InventoryPanel: React.FC<Props> = ({ filters, search = '' }) => {
  const [inventorySearch, setInventorySearch] = useState(search);
  const { showNotification } = useNotification();

  // Filter inventory by sidebar filters
  const filteredInventory = useMemo(() =>
    generateInventory().filter(item =>
      (filters.state.length === 0 || filters.state.includes(item.state)) &&
      (filters.city.length === 0 || filters.city.includes(item.city)) &&
      (filters.category.length === 0 || filters.category.includes(item.category)) &&
      (filters.month.length === 0 || filters.month.includes(item.month)) &&
      (item.year >= filters.yearRange.min && item.year <= filters.yearRange.max) &&
      (item.productName.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.location.toLowerCase().includes(inventorySearch.toLowerCase()))
    ),
    [filters, inventorySearch]
  );

  // Prepare data for bar chart
  const inventoryByCategory = useMemo(() =>
    Object.entries(
      filteredInventory.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, quantity]) => ({ category, quantity })),
    [filteredInventory]
  );

  const inventory = useMemo(() => generateInventory(), []);

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Inventory Management</h2>
      {/* Bar Chart: Inventory by Category */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 mb-8 border-2 border-blue-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Inventory by Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={inventoryByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="category" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
            <Bar dataKey="quantity" fill="#6366F1" name="Quantity" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Searchable/Filterable Table */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search inventory..."
          className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          value={inventorySearch}
          onChange={e => setInventorySearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-300">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Quantity</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => {
              const status = getStockStatus(item.quantity);
              return (
                <tr key={item.id} className="border-b border-gray-700">
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2">{item.category}</td>
                  <td className="px-4 py-2">{item.location}</td>
                  <td className="px-4 py-2">{item.quantity}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: status.color }}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryPanel; 