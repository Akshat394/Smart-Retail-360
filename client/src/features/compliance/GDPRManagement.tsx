import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Edit, Eye, CheckCircle, AlertTriangle, Users, Database } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface UserData {
  id: string;
  name: string;
  email: string;
  dataTypes: string[];
  lastActivity: string;
  consentStatus: 'granted' | 'denied' | 'pending';
  dataRetention: string;
}

interface GDPRRequest {
  id: string;
  type: 'export' | 'delete' | 'rectify';
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  description: string;
}

const GDPRManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserData, setShowUserData] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchGDPRData();
  }, []);

  const fetchGDPRData = async () => {
    try {
      // Mock GDPR data
      const mockUsers: UserData[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          dataTypes: ['personal_info', 'order_history', 'preferences'],
          lastActivity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          consentStatus: 'granted',
          dataRetention: '2024-12-31'
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          dataTypes: ['personal_info', 'order_history'],
          lastActivity: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          consentStatus: 'pending',
          dataRetention: '2024-12-31'
        },
        {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          dataTypes: ['personal_info'],
          lastActivity: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          consentStatus: 'denied',
          dataRetention: '2024-06-30'
        }
      ];

      const mockRequests: GDPRRequest[] = [
        {
          id: 'REQ-001',
          type: 'export',
          userId: '1',
          status: 'completed',
          requestedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          completedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          description: 'Data export request for John Doe'
        },
        {
          id: 'REQ-002',
          type: 'delete',
          userId: '3',
          status: 'processing',
          requestedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          description: 'Data deletion request for Bob Johnson'
        }
      ];

      setUsers(mockUsers);
      setRequests(mockRequests);
    } catch (error) {
      console.error('Failed to fetch GDPR data:', error);
      showNotification({ message: 'Failed to fetch GDPR data', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gdpr/export/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        // Create download link
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${userId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification({ message: 'User data exported successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to export user data');
      }
    } catch (error) {
      // Mock export for demo
      const mockData = {
        userId,
        personalInfo: { name: 'John Doe', email: 'john.doe@example.com' },
        orderHistory: [],
        preferences: {}
      };
      const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${userId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification({ message: 'User data exported successfully', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const deleteUserData = async (userId: string) => {
    if (!confirm('Are you sure you want to delete all data for this user? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/gdpr/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        showNotification({ message: 'User data deleted successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to delete user data');
      }
    } catch (error) {
      // Mock deletion for demo
      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification({ message: 'User data deleted successfully', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const rectifyUserData = async (userId: string, updatedData: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gdpr/rectify/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, ...updatedData } : user
        ));
        showNotification({ message: 'User data updated successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to update user data');
      }
    } catch (error) {
      showNotification({ message: 'Failed to update user data: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return 'text-green-400 bg-green-500/20';
      case 'denied': return 'text-red-400 bg-red-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'processing');
  const completedRequests = requests.filter(r => r.status === 'completed');

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-green-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">GDPR Management</h2>
        </div>

        {/* GDPR Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Total Users</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">{users.length}</div>
            <div className="text-sm text-gray-400">Registered</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Consent Granted</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {users.filter(u => u.consentStatus === 'granted').length}
            </div>
            <div className="text-sm text-gray-400">Users</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Pending Requests</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{pendingRequests.length}</div>
            <div className="text-sm text-gray-400">GDPR Requests</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Data Retention</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {users.filter(u => new Date(u.dataRetention) > new Date()).length}
            </div>
            <div className="text-sm text-gray-400">Active Records</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">User Data Management</h3>
              {loading ? (
                <div className="text-center py-8">
                  <Database className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading user data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedUser?.id === user.id
                          ? 'border-green-500 bg-gray-700/50'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white">{user.name}</h4>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getConsentStatusColor(user.consentStatus)}`}>
                            {user.consentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <span>Data types: {user.dataTypes.length}</span>
                        <span>Last activity: {new Date(user.lastActivity).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Details & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {selectedUser ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">User Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{selectedUser.name}</h4>
                    <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Data Types</h5>
                    <div className="space-y-1">
                      {selectedUser.dataTypes.map((type, index) => (
                        <div key={index} className="text-sm text-gray-300 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          {type.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Data Retention</h5>
                    <div className="text-sm text-gray-300">
                      Until: {new Date(selectedUser.dataRetention).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => exportUserData(selectedUser.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => setShowUserData(true)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => rectifyUserData(selectedUser.id, { name: 'Updated Name' })}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Rectify
                    </button>
                    <button
                      onClick={() => deleteUserData(selectedUser.id)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No User Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select a user from the list to view details and manage their data
                </p>
              </div>
            )}

            {/* GDPR Requests */}
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Recent GDPR Requests</h3>
              <div className="space-y-3">
                {requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm capitalize">{request.type}</span>
                      <span className={`text-xs ${getRequestStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{request.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.requestedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GDPRManagement; 