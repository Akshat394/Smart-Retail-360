import React, { useState, useMemo } from 'react';
import { generateInventory, InventoryItem } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Filters } from './SidebarFilters_new';
import { useNotification } from '../hooks/useNotification';
import { apiService } from '../services/api';
import { FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [erpLogs, setErpLogs] = useState<string[]>([]);
  const [erpLoading, setErpLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Enhanced filter: search by product, category, location, quantity, status
  const filteredInventory = useMemo(() =>
    generateInventory().filter(item => {
      const searchLower = inventorySearch.toLowerCase();
      const status = getStockStatus(item.quantity).label.toLowerCase();
      return (
        (filters.state.length === 0 || filters.state.includes(item.state)) &&
        (filters.city.length === 0 || filters.city.includes(item.city)) &&
        (filters.category.length === 0 || filters.category.includes(item.category)) &&
        (filters.month.length === 0 || filters.month.includes(item.month)) &&
        (item.year >= filters.yearRange.min && item.year <= filters.yearRange.max) &&
        (
          item.productName.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower) ||
          String(item.quantity).includes(searchLower) ||
          status.includes(searchLower)
        )
      );
    }),
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

  const handleErpSync = async () => {
    setErpLoading(true);
    try {
      const result = await apiService.syncERPInventory() as { success?: boolean; error?: string };
      if (result.success) {
        showNotification({ message: 'ERP Inventory Sync Successful', type: 'success', orderId: 0, customerName: '' });
      } else {
        showNotification({ message: result.error || 'ERP Sync Failed', type: 'error', orderId: 0, customerName: '' });
      }
    } catch (e: any) {
      showNotification({ message: e.message || 'ERP Sync Failed', type: 'error', orderId: 0, customerName: '' });
    }
    setErpLoading(false);
  };

  const fetchErpLogs = async () => {
    setErpLoading(true);
    try {
      const result = await apiService.getERPSyncLogs() as { logs?: string[] };
      setErpLogs(result.logs || []);
      setShowLogs(true);
    } catch {
      showNotification({ message: 'Failed to fetch ERP sync logs', type: 'error', orderId: 0, customerName: '' });
    }
    setErpLoading(false);
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Inventory Management</h2>
      {/* ERP Sync Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm font-semibold shadow"
          onClick={handleErpSync}
          disabled={erpLoading}
          title="Sync inventory with ERP system"
        >
          {erpLoading ? <span className="animate-spin">⏳</span> : null} Sync ERP Inventory
        </button>
        <button
          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm font-semibold shadow"
          onClick={fetchErpLogs}
          disabled={erpLoading}
          title="View recent ERP sync logs"
        >
          View ERP Sync Logs
        </button>
      </div>
      {showLogs && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-semibold">ERP Sync Logs</div>
            <button className="text-gray-400 hover:text-white" onClick={() => setShowLogs(false)}>✖</button>
          </div>
          <ul className="text-xs text-gray-300 max-h-40 overflow-y-auto">
            {erpLogs.length === 0 ? <li>No logs found.</li> : erpLogs.slice(-10).reverse().map((log, i) => <li key={i}>{log}</li>)}
          </ul>
        </div>
      )}
      {/* Bar Chart: Inventory by Category */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 mb-8 border-2 border-blue-500/40 shadow-xl overflow-x-auto">
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
        <div className="relative w-full max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-300 group-focus-within:scale-110" size={20} />
          <motion.input
            type="text"
            placeholder="Search by Product, Category, Location, Quantity, Status..."
            className="pl-10 pr-3 py-2 rounded-xl bg-gray-800 border-2 border-gray-700 text-gray-200 shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none transition-all duration-200 group w-full"
            value={inventorySearch}
            onChange={e => setInventorySearch(e.target.value)}
            whileFocus={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </div>
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
            <AnimatePresence>
            {filteredInventory.map(item => {
              const status = getStockStatus(item.quantity);
              return (
                <motion.tr
                  key={item.id}
                  className="border-b border-gray-700 hover:bg-gray-800/60 transition-colors duration-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  layout
                >
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2">{item.category}</td>
                  <td className="px-4 py-2">{item.location}</td>
                  <td className="px-4 py-2">{item.quantity}</td>
                  <td className="px-4 py-2">
                    <motion.span
                      className="px-2 py-1 rounded-full text-xs font-semibold shadow"
                      style={{ backgroundColor: status.color }}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {status.label}
                    </motion.span>
                  </td>
                </motion.tr>
              );
            })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {erpLoading && <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><span className="animate-spin text-4xl text-green-400">⏳</span></div>}
    </div>
  );
};

export default InventoryPanel; 