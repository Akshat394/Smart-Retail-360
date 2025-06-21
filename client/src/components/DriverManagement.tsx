import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, User, Phone, Mail, Truck, Circle } from 'lucide-react';
import { apiService } from '../services/api';
import AddDriverModal from './AddDriverModal';
import { useAuth } from '../hooks/useAuth';

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleId: string;
  status: 'available' | 'assigned' | 'off_duty';
  createdAt: string;
}

const DriverManagement: React.FC = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canManageDrivers = user && ['admin', 'manager', 'operations'].includes(user.role);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const data = await apiService.getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDriver = async (driverData: any) => {
    try {
      await apiService.createDriver(driverData);
      await loadDrivers();
    } catch (error) {
      console.error('Failed to add driver:', error);
      throw error;
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await apiService.updateDriver(id, { status });
      await loadDrivers();
    } catch (error) {
      console.error('Failed to update driver status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-400';
      case 'assigned':
        return 'text-blue-400';
      case 'off_duty':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'assigned':
        return 'Assigned';
      case 'off_duty':
        return 'Off Duty';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Driver Management</h1>
          <p className="text-gray-400 mt-1">Manage your delivery team and assignments</p>
        </div>
        {canManageDrivers && (
          <motion.button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-green-600 transition-all duration-200 flex items-center space-x-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Driver</span>
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {drivers.filter(d => d.status === 'available').length}
              </p>
              <p className="text-sm text-gray-400">Available</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {drivers.filter(d => d.status === 'assigned').length}
              </p>
              <p className="text-sm text-gray-400">Assigned</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-500/20 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {drivers.filter(d => d.status === 'off_duty').length}
              </p>
              <p className="text-sm text-gray-400">Off Duty</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{drivers.length}</p>
              <p className="text-sm text-gray-400">Total Drivers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Drivers List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Drivers</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  License
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                {canManageDrivers && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {drivers.map((driver) => (
                <motion.tr
                  key={driver.id}
                  className="hover:bg-gray-700/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{driver.name}</p>
                        <p className="text-xs text-gray-400">ID: {driver.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {driver.email && (
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Mail className="w-4 h-4" />
                          <span>{driver.email}</span>
                        </div>
                      )}
                      {driver.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Phone className="w-4 h-4" />
                          <span>{driver.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{driver.licenseNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{driver.vehicleId || 'Not assigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManageDrivers ? (
                      <select
                        value={driver.status}
                        onChange={(e) => handleUpdateStatus(driver.id, e.target.value)}
                        className={`text-sm px-2 py-1 rounded-full border-0 bg-gray-700 ${getStatusColor(driver.status)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="off_duty">Off Duty</option>
                      </select>
                    ) : (
                      <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(driver.status)}`}>
                        {getStatusLabel(driver.status)}
                      </span>
                    )}
                  </td>
                  {canManageDrivers && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Driver Modal */}
      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddDriver}
      />
    </div>
  );
};

export default DriverManagement;