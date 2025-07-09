import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { Info } from 'lucide-react';

interface ERPProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  cost: number;
  price: number;
  minStock: number;
  maxStock: number;
  leadTime: number;
}

const ERPProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ERPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ERPProduct | null>(null);
  const [poQuantity, setPoQuantity] = useState(1);
  const [poSupplier, setPoSupplier] = useState('');
  const [poExpectedDelivery, setPoExpectedDelivery] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const data = await apiService.getERPProducts() as ERPProduct[];
        setProducts(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPOModal = (product: ERPProduct) => {
    setSelectedProduct(product);
    setPoQuantity(1);
    setPoSupplier(product.supplier);
    setPoExpectedDelivery('');
    setModalOpen(true);
  };

  const handleCreatePO = async () => {
    if (!selectedProduct) return;
    setPoLoading(true);
    try {
      await apiService.createERPPurchaseOrder({
        supplierId: poSupplier,
        items: [{ productId: selectedProduct.id, quantity: poQuantity, unitCost: selectedProduct.cost }],
        totalAmount: poQuantity * selectedProduct.cost,
        expectedDelivery: poExpectedDelivery,
      });
      showNotification({ message: 'Purchase order created successfully!', type: 'success', orderId: 0, customerName: '' });
      setModalOpen(false);
    } catch (e: any) {
      showNotification({ message: e.message || 'Failed to create purchase order', type: 'error', orderId: 0, customerName: '' });
    }
    setPoLoading(false);
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">ERP Product Management</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-white"><span className="animate-spin">⏳</span> Loading ERP products...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-2 text-left">Name <span title="Product name from ERP"><Info className="inline w-4 h-4 text-blue-400 ml-1" /></span></th>
                <th className="px-4 py-2 text-left">SKU <span title="Stock Keeping Unit"><Info className="inline w-4 h-4 text-blue-400 ml-1" /></span></th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Supplier</th>
                <th className="px-4 py-2 text-left">Cost</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Min/Max Stock <span title="Minimum/Maximum stock levels in ERP"><Info className="inline w-4 h-4 text-blue-400 ml-1" /></span></th>
                <th className="px-4 py-2 text-left">Lead Time <span title="Lead time in days"><Info className="inline w-4 h-4 text-blue-400 ml-1" /></span></th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-gray-700">
                  <td className="px-4 py-2">{product.name}</td>
                  <td className="px-4 py-2">{product.sku}</td>
                  <td className="px-4 py-2">{product.category}</td>
                  <td className="px-4 py-2">{product.supplier}</td>
                  <td className="px-4 py-2">₹{product.cost}</td>
                  <td className="px-4 py-2">₹{product.price}</td>
                  <td className="px-4 py-2">{product.minStock} / {product.maxStock}</td>
                  <td className="px-4 py-2">{product.leadTime}</td>
                  <td className="px-4 py-2">
                    <button
                      className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-xs font-semibold shadow"
                      onClick={() => openPOModal(product)}
                      title="Create a purchase order for this product"
                    >
                      Create PO
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 py-4">No ERP products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Purchase Order Modal */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-lg text-white font-bold mb-4">Create Purchase Order</h3>
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="text-gray-300 mb-1">Product: <span className="font-semibold">{selectedProduct.name}</span></div>
              <div className="text-gray-300 mb-1">Supplier: <input className="bg-gray-700 rounded px-2 py-1 text-white w-full" value={poSupplier} onChange={e => setPoSupplier(e.target.value)} /></div>
              <div className="text-gray-300 mb-1">Quantity: <input type="number" min={1} className="bg-gray-700 rounded px-2 py-1 text-white w-full" value={poQuantity} onChange={e => setPoQuantity(Number(e.target.value))} /></div>
              <div className="text-gray-300 mb-1">Expected Delivery: <input type="date" className="bg-gray-700 rounded px-2 py-1 text-white w-full" value={poExpectedDelivery} onChange={e => setPoExpectedDelivery(e.target.value)} /></div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600 font-semibold flex items-center gap-2"
                onClick={handleCreatePO}
                disabled={poLoading}
                title="Submit purchase order to ERP"
              >
                {poLoading ? <span className="animate-spin">⏳</span> : null} {poLoading ? 'Creating...' : 'Create PO'}
              </button>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold"
                onClick={() => setModalOpen(false)}
                disabled={poLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPProductManagement; 