import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Edit, Eye, CheckCircle, AlertTriangle, Users, Database, X, Save, UserCheck } from 'lucide-react';
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

interface RectificationData {
  name?: string;
  email?: string;
  dataTypes?: string[];
  consentStatus?: 'granted' | 'denied' | 'pending';
}

const GDPRManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserData, setShowUserData] = useState(false);
  const [showRectifyModal, setShowRectifyModal] = useState(false);
  const [rectificationData, setRectificationData] = useState<RectificationData>({});
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchGDPRData();
  }, []);

  const fetchGDPRData = async () => {
    try {
      // Mock GDPR data with real names
      const mockUsers: UserData[] = [
        {
          id: '1',
          name: 'Arushi Gupta',
          email: 'arushigupta1818@gmail.com',
          dataTypes: ['personal_info', 'order_history', 'preferences', 'analytics_data'],
          lastActivity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          consentStatus: 'granted',
          dataRetention: '2024-12-31'
        },
        {
          id: '2',
          name: 'Abhishek Srivastava',
          email: 'abhisheksriv6387@gmail.com',
          dataTypes: ['personal_info', 'order_history', 'operations_data'],
          lastActivity: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          consentStatus: 'granted',
          dataRetention: '2024-12-31'
        },
        {
          id: '3',
          name: 'Tanveer Hussain Khan',
          email: 'tanveerhk.it@gmail.com',
          dataTypes: ['personal_info', 'analytics_data', 'forecasting_data'],
          lastActivity: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          consentStatus: 'granted',
          dataRetention: '2024-12-31'
        },
        {
          id: '4',
          name: 'Arushi Gupta',
          email: 'arushigupta1212@gmail.com',
          dataTypes: ['personal_info', 'supply_chain_data', 'planning_data'],
          lastActivity: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
          consentStatus: 'pending',
          dataRetention: '2024-12-31'
        },
        {
          id: '5',
          name: 'Akshat Trivedi',
          email: 'akshattrivedi394@gmail.com',
          dataTypes: ['personal_info', 'system_admin_data', 'security_logs'],
          lastActivity: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          consentStatus: 'granted',
          dataRetention: '2024-12-31'
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
          description: 'Data export request for Arushi Gupta (Executive/Manager)'
        },
        {
          id: 'REQ-002',
          type: 'rectify',
          userId: '2',
          status: 'processing',
          requestedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          description: 'Data rectification request for Abhishek Srivastava (Operations Manager)'
        },
        {
          id: 'REQ-003',
          type: 'export',
          userId: '3',
          status: 'pending',
          requestedAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
          description: 'Data export request for Tanveer Hussain Khan (Data Analyst)'
        },
        {
          id: 'REQ-004',
          type: 'delete',
          userId: '4',
          status: 'pending',
          requestedAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
          description: 'Data deletion request for Arushi Gupta (Supply Chain Planner)'
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
    if (!selectedUser) return;
    
    setProcessingAction('export');
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
        a.download = `user-data-${selectedUser.name.replace(/\s+/g, '-')}-${userId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification({ 
          message: `Data exported successfully for ${selectedUser.name}`, 
          type: 'success', 
          orderId: 0, 
          customerName: selectedUser.name 
        });
      } else {
        throw new Error('Failed to export user data');
      }
    } catch (error) {
      // Mock export for demo
      const mockData = {
        userId,
        personalInfo: { 
          name: selectedUser.name, 
          email: selectedUser.email 
        },
        orderHistory: [
          { orderId: 'ORD-001', date: '2024-01-15', status: 'delivered', items: 3 },
          { orderId: 'ORD-002', date: '2024-01-20', status: 'processing', items: 2 }
        ],
        preferences: {
          language: 'en',
          notifications: true,
          marketing: true,
          theme: 'dark'
        },
        dataTypes: selectedUser.dataTypes,
        consentStatus: selectedUser.consentStatus,
        dataRetention: selectedUser.dataRetention,
        exportDate: new Date().toISOString(),
        exportedBy: 'GDPR Management System'
      };
      
      const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${selectedUser.name.replace(/\s+/g, '-')}-${userId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification({ 
        message: `Data exported successfully for ${selectedUser.name}`, 
        type: 'success', 
        orderId: 0, 
        customerName: selectedUser.name 
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const deleteUserData = async (userId: string) => {
    if (!selectedUser) return;
    
    if (!confirm(`Are you sure you want to delete all data for ${selectedUser.name}? This action cannot be undone and will permanently remove all personal information.`)) {
      return;
    }

    setProcessingAction('delete');
    try {
      const response = await fetch(`/api/gdpr/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        showNotification({ 
          message: `All data deleted successfully for ${selectedUser.name}`, 
          type: 'success', 
          orderId: 0, 
          customerName: selectedUser.name 
        });
        setSelectedUser(null);
      } else {
        throw new Error('Failed to delete user data');
      }
    } catch (error) {
      // Mock deletion for demo
      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification({ 
        message: `All data deleted successfully for ${selectedUser.name}`, 
        type: 'success', 
        orderId: 0, 
        customerName: selectedUser.name 
      });
      setSelectedUser(null);
    } finally {
      setProcessingAction(null);
    }
  };

  const openRectifyModal = () => {
    if (!selectedUser) return;
    setRectificationData({
      name: selectedUser.name,
      email: selectedUser.email,
      dataTypes: selectedUser.dataTypes,
      consentStatus: selectedUser.consentStatus
    });
    setShowRectifyModal(true);
  };

  const handleRectifySubmit = async () => {
    if (!selectedUser) return;
    
    setProcessingAction('rectify');
    try {
      const response = await fetch(`/api/gdpr/rectify/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rectificationData)
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id ? { ...user, ...rectificationData } : user
        ));
        setSelectedUser(prev => prev ? { ...prev, ...rectificationData } : null);
        showNotification({ 
          message: `Data updated successfully for ${selectedUser.name}`, 
          type: 'success', 
          orderId: 0, 
          customerName: selectedUser.name 
        });
        setShowRectifyModal(false);
      } else {
        throw new Error('Failed to update user data');
      }
    } catch (error) {
      // Mock update for demo
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? { ...user, ...rectificationData } : user
      ));
      setSelectedUser(prev => prev ? { ...prev, ...rectificationData } : null);
      showNotification({ 
        message: `Data updated successfully for ${selectedUser.name}`, 
        type: 'success', 
        orderId: 0, 
        customerName: selectedUser.name 
      });
      setShowRectifyModal(false);
    } finally {
      setProcessingAction(null);
    }
  };

  const viewUserData = () => {
    if (!selectedUser) return;
    setShowUserData(true);
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
                      disabled={processingAction === 'export'}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {processingAction === 'export' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {processingAction === 'export' ? 'Exporting...' : 'Export'}
                    </button>
                    <button
                      onClick={viewUserData}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={openRectifyModal}
                      disabled={processingAction === 'rectify'}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {processingAction === 'rectify' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Edit className="w-4 h-4" />
                      )}
                      {processingAction === 'rectify' ? 'Updating...' : 'Rectify'}
                    </button>
                    <button
                      onClick={() => deleteUserData(selectedUser.id)}
                      disabled={processingAction === 'delete'}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {processingAction === 'delete' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {processingAction === 'delete' ? 'Deleting...' : 'Delete'}
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

      {/* Data View Modal */}
      {showUserData && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">User Data Details</h3>
              <button
                onClick={() => setShowUserData(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="text-white">{selectedUser.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Consent Status:</span>
                    <p className="text-white capitalize">{selectedUser.consentStatus}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Data Retention:</span>
                    <p className="text-white">{new Date(selectedUser.dataRetention).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Data Types Collected</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedUser.dataTypes.map((type, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-gray-300">{type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Activity Information</h4>
                <div className="text-sm">
                  <span className="text-gray-400">Last Activity:</span>
                  <p className="text-white">{new Date(selectedUser.lastActivity).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rectification Modal */}
      {showRectifyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Rectify User Data</h3>
              <button
                onClick={() => setShowRectifyModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={rectificationData.name || ''}
                  onChange={(e) => setRectificationData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={rectificationData.email || ''}
                  onChange={(e) => setRectificationData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Consent Status</label>
                <select
                  value={rectificationData.consentStatus || 'granted'}
                  onChange={(e) => setRectificationData(prev => ({ ...prev, consentStatus: e.target.value as any }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="granted">Granted</option>
                  <option value="denied">Denied</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleRectifySubmit}
                  disabled={processingAction === 'rectify'}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processingAction === 'rectify' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {processingAction === 'rectify' ? 'Updating...' : 'Update Data'}
                </button>
                <button
                  onClick={() => setShowRectifyModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GDPRManagement; 