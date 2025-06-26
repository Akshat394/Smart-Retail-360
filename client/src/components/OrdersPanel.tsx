import React, { useState, useMemo } from 'react';
import { generateOrders, Order } from './mockData';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Filters } from './SidebarFilters_new';

const statusColors: Record<string, string> = {
  Pending: '#F59E0B',
  Completed: '#10B981',
  Ready: '#6366F1',
  Cancelled: '#EF4444',
};

const statusList = ['Pending', 'Completed', 'Ready', 'Cancelled'];

const rowsPerPageOptions = [10, 20, 50];

type Props = {
  filters: Filters;
  search?: string;
};

const OrdersPanel: React.FC<Props> = ({ filters, search = '' }) => {
  const [orderSearch, setOrderSearch] = useState(search);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orders, setOrders] = useState<Order[]>(useMemo(() => generateOrders(), []));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filter orders by sidebar filters
  const filteredOrders = useMemo(() => {
    if (showAll) return orders;
    return orders.filter(order => {
      const date = new Date(order.createdAt);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'short' });
      return (
        (filters.month.length === 0 || filters.month.includes(month)) &&
        (year >= filters.yearRange.min && year <= filters.yearRange.max) &&
        (order.productName.toLowerCase().includes(orderSearch.toLowerCase()) ||
          order.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
          order.location.toLowerCase().includes(orderSearch.toLowerCase()) ||
          order.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
          order.channel.toLowerCase().includes(orderSearch.toLowerCase()))
      );
    });
  }, [filters, orderSearch, orders, showAll]);

  // Pie chart data
  const ordersByStatus = useMemo(() =>
    statusList.map(status => ({
      status,
      value: filteredOrders.filter(o => o.status === status).length,
    })).filter(d => d.value > 0),
    [filteredOrders]
  );

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Reset to page 1 when filters/search change
  React.useEffect(() => { setCurrentPage(1); }, [filters, orderSearch]);

  // Add collect handler
  const handleCollect = (orderId: number) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: 'Collected' } : order
    ));
    setSuccessMsg('Order collected successfully!');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  // Add collect all handler
  const handleCollectAll = () => {
    const toCollect = filteredOrders.filter(order => order.status === 'Ready' || order.status === 'Pending');
    if (toCollect.length === 0) return;
    setOrders(prev => prev.map(order =>
      (toCollect.some(o => o.id === order.id) ? { ...order, status: 'Collected' } : order)
    ));
    setSuccessMsg(`${toCollect.length} order(s) collected successfully!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Click-and-Collect Orders</h2>
      {successMsg && (
        <div className="mb-4 px-4 py-2 bg-green-700 text-white rounded shadow-lg flex items-center gap-2 animate-fade-in">
          <span>✔️</span> {successMsg}
        </div>
      )}
      {/* Pie Chart: Orders by Status */}
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 mb-8 border-2 border-purple-500/40 shadow-xl">
        <h3 className="text-lg text-white mb-4">Orders by Status</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={ordersByStatus} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={80} fill="#8B5CF6">
              {ordersByStatus.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={statusColors[entry.status] || '#6366F1'} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Searchable/Filterable Table */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <button
          className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold shadow transition-all duration-200"
          onClick={() => { setShowAll(true); setOrderSearch(''); }}
        >
          Show All Orders
        </button>
        <button
          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-xs font-semibold shadow transition-all duration-200"
          onClick={handleCollectAll}
        >
          Collect All Ready
        </button>
        <input
          type="text"
          placeholder="Search orders..."
          className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          value={orderSearch}
          onChange={e => { setOrderSearch(e.target.value); setShowAll(false); }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-300">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-2 text-left">Order ID</th>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Quantity</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Channel</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-5xl">🗂️</span>
                    <span className="text-lg font-semibold">No orders found</span>
                    <span className="text-sm">Try adjusting your filters or search.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map(order => (
                <tr key={order.id} className={`border-b border-gray-700 ${order.status === 'Collected' ? 'bg-green-900/30' : ''}`}>
                  <td className="px-4 py-2">{order.id}</td>
                  <td className="px-4 py-2">{order.productName}</td>
                  <td className="px-4 py-2">{order.location}</td>
                  <td className="px-4 py-2">{order.quantity}</td>
                  <td className="px-4 py-2">{order.customerName}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusColors[order.status] || '#6366F1' }}>{order.status}</span>
                  </td>
                  <td className="px-4 py-2">{order.channel}</td>
                  <td className="px-4 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {(order.status === 'Ready' || order.status === 'Pending') && (
                      <button
                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow transition-all duration-200"
                        onClick={() => handleCollect(order.id)}
                      >
                        Collect
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-gray-400 text-xs">
          Showing {(filteredOrders.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1)}-
          {Math.min(currentPage * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
        </div>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`px-2 py-1 rounded ${page === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setCurrentPage(page)}
            >{page}</button>
          ))}
          <button
            className="px-2 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-50"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >Next</button>
        </div>
        <div>
          <select
            className="px-2 py-1 rounded bg-gray-700 text-gray-300 border border-gray-600"
            value={rowsPerPage}
            onChange={e => setRowsPerPage(Number(e.target.value))}
          >
            {rowsPerPageOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default OrdersPanel; 