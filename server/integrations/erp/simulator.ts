import { storage } from '../../src/utils/storage';

// In-memory ERP state for simulation
let erpInventory: any[] = [];
let erpOrders: any[] = [];
let lastSync: string = new Date().toISOString();
let syncLogs: string[] = [];

export async function syncInventoryWithERP() {
  // Simulate pulling inventory from ERP and updating local DB
  const localInventory = await storage.getAllInventory();
  erpInventory = localInventory.map((i: any) => ({ ...i }));
  lastSync = new Date().toISOString();
  syncLogs.push(`[${lastSync}] Inventory sync: ${erpInventory.length} items`);
  return erpInventory;
}

export async function syncOrdersWithERP() {
  // Simulate pulling orders from ERP and updating local DB
  const localOrders = await storage.getAllClickCollectOrders();
  erpOrders = localOrders.map((o: any) => ({ ...o }));
  lastSync = new Date().toISOString();
  syncLogs.push(`[${lastSync}] Orders sync: ${erpOrders.length} orders`);
  return erpOrders;
}

export function getERPSyncLogs() {
  return syncLogs.slice(-20); // last 20 logs
}

export function getLastERPSyncTime() {
  return lastSync;
} 