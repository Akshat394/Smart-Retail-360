import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import { Info, RefreshCw } from 'lucide-react';

interface WarehouseZone {
  zone: string;
  products: string[];
  capacity: number;
}

interface InventoryItem {
  id: number;
  productName: string;
  category: string;
  location: string;
  quantity: number;
}

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

const WMSDashboard: React.FC = () => {
  const [warehouse, setWarehouse] = useState<WarehouseZone[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [erpProducts, setErpProducts] = useState<ERPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  const fetchData = async () => {
    setLoading(true);
    try {
      const wh = await apiService.getWarehouseLayout() as WarehouseZone[];
      const inv = await apiService.getInventoryStatus() as InventoryItem[];
      const erp = await apiService.getERPProducts() as ERPProduct[];
      setWarehouse(wh);
      setInventory(inv);
      setErpProducts(erp);
    } catch (e: any) {
      showNotification({ message: e.message || 'Failed to fetch WMS data', type: 'error', orderId: 0, customerName: '' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Fulfillment status: count orders by status
  // For demo, use inventory as proxy (in real app, fetch orders)
  const fulfillment = {
    pending: inventory.filter(i => i.quantity < 20).length,
    completed: inventory.filter(i => i.quantity > 100).length,
    inProgress: inventory.filter(i => i.quantity >= 20 && i.quantity <= 100).length,
  };

  // ERP/WMS reconciliation: highlight products in ERP but not in inventory, and vice versa
  const erpProductNames = new Set(erpProducts.map(p => p.name));
  const inventoryProductNames = new Set(inventory.map(i => i.productName));
  const missingInInventory = erpProducts.filter(p => !inventoryProductNames.has(p.name));
  const missingInERP = inventory.filter(i => !erpProductNames.has(i.productName));

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="flex items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex-1">WMS Dashboard</h2>
        <button className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-sm font-semibold shadow flex items-center gap-2" onClick={fetchData} disabled={loading} title="Refresh warehouse, inventory, and ERP data">
          <RefreshCw className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {/* Warehouse Layout */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border-2 border-blue-500/40 shadow-xl overflow-x-auto">
        <h3 className="text-lg text-white mb-4">Warehouse Zones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouse.map(zone => (
            <div key={zone.zone} className="bg-gray-900 rounded-lg p-4 border border-blue-500/30">
              <div className="text-xl text-blue-300 font-bold mb-1">Zone {zone.zone}</div>
              <div className="text-white">Products: {zone.products.join(', ') || 'None'}</div>
              <div className="text-gray-400 text-sm">Capacity: {zone.capacity}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Fulfillment Status */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8 flex flex-wrap gap-8 justify-between">
        <h3 className="text-lg text-white mb-4 w-full">Fulfillment Status</h3>
        <div className="flex gap-6 flex-wrap">
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="text-3xl text-yellow-400 font-bold">{fulfillment.pending}</div>
            <div className="text-gray-300">Pending</div>
          </div>
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="text-3xl text-green-400 font-bold">{fulfillment.completed}</div>
            <div className="text-gray-300">Completed</div>
          </div>
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="text-3xl text-blue-400 font-bold">{fulfillment.inProgress}</div>
            <div className="text-gray-300">In Progress</div>
          </div>
        </div>
      </div>
      {/* ERP/WMS Reconciliation */}
      <div className="bg-gray-800/80 rounded-xl p-6 mb-8 overflow-x-auto">
        <h3 className="text-lg text-white mb-4 flex items-center gap-2">ERP/WMS Reconciliation <span title="Shows products missing in either ERP or WMS for quick audit."><Info className="w-4 h-4 text-blue-400" /></span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-blue-300 font-semibold mb-2">In ERP, Missing in WMS</div>
            <ul className="text-xs text-red-400">
              {missingInInventory.length === 0 ? <li>None</li> : missingInInventory.map(p => <li key={p.id}>{p.name}</li>)}
            </ul>
          </div>
          <div>
            <div className="text-blue-300 font-semibold mb-2">In WMS, Missing in ERP</div>
            <ul className="text-xs text-yellow-400">
              {missingInERP.length === 0 ? <li>None</li> : missingInERP.map(i => <li key={i.id}>{i.productName}</li>)}
            </ul>
          </div>
        </div>
      </div>
      {loading && <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><span className="animate-spin text-4xl text-blue-400">⏳</span></div>}
    </div>
  );
};

export default WMSDashboard; 