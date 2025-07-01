import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Eye, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  category: 'authentication' | 'data_access' | 'system_change' | 'security' | 'compliance';
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    dateRange: '24h'
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/audit-logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        // Mock audit logs for demo
        const mockLogs: AuditLog[] = [
          {
            id: '1',
            timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            userId: 'user-1',
            userName: 'john.doe',
            action: 'LOGIN',
            resource: '/api/auth/login',
            details: 'Successful login from IP 192.168.1.100',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'success',
            category: 'authentication'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
            userId: 'user-2',
            userName: 'jane.smith',
            action: 'DATA_EXPORT',
            resource: '/api/gdpr/export/123',
            details: 'GDPR data export requested',
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            status: 'success',
            category: 'compliance'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
            userId: 'user-3',
            userName: 'bob.johnson',
            action: 'FAILED_LOGIN',
            resource: '/api/auth/login',
            details: 'Failed login attempt - invalid credentials',
            ipAddress: '192.168.1.102',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'failure',
            category: 'security'
          },
          {
            id: '4',
            timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
            userId: 'user-1',
            userName: 'john.doe',
            action: 'DATA_ACCESS',
            resource: '/api/inventory',
            details: 'Accessed inventory data',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'success',
            category: 'data_access'
          },
          {
            id: '5',
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            userId: 'admin-1',
            userName: 'admin',
            action: 'SYSTEM_CONFIG_CHANGE',
            resource: '/api/system/config',
            details: 'Updated system configuration',
            ipAddress: '192.168.1.50',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'success',
            category: 'system_change'
          }
        ];
        setLogs(mockLogs);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showNotification({ message: 'Failed to fetch audit logs', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.details.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    // Date range filter
    const now = new Date();
    switch (filters.dateRange) {
      case '1h':
        filtered = filtered.filter(log => new Date(log.timestamp) > new Date(now.getTime() - 3600000));
        break;
      case '24h':
        filtered = filtered.filter(log => new Date(log.timestamp) > new Date(now.getTime() - 86400000));
        break;
      case '7d':
        filtered = filtered.filter(log => new Date(log.timestamp) > new Date(now.getTime() - 604800000));
        break;
      case '30d':
        filtered = filtered.filter(log => new Date(log.timestamp) > new Date(now.getTime() - 2592000000));
        break;
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,User,Action,Resource,Details,IP Address,Status,Category',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.userName}","${log.action}","${log.resource}","${log.details}","${log.ipAddress}","${log.status}","${log.category}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification({ message: 'Audit logs exported successfully', type: 'success', orderId: 0, customerName: '' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failure': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'authentication': return 'bg-blue-500/20 text-blue-400';
      case 'data_access': return 'bg-green-500/20 text-green-400';
      case 'system_change': return 'bg-purple-500/20 text-purple-400';
      case 'security': return 'bg-red-500/20 text-red-400';
      case 'compliance': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const successCount = logs.filter(log => log.status === 'success').length;
  const failureCount = logs.filter(log => log.status === 'failure').length;
  const warningCount = logs.filter(log => log.status === 'warning').length;

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          </div>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        {/* Audit Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Total Logs</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">{logs.length}</div>
            <div className="text-sm text-gray-400">Today</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Success</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">{successCount}</div>
            <div className="text-sm text-gray-400">Events</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Failures</h3>
            </div>
            <div className="text-3xl font-bold text-red-400">{failureCount}</div>
            <div className="text-sm text-gray-400">Events</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Warnings</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{warningCount}</div>
            <div className="text-sm text-gray-400">Events</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="authentication">Authentication</option>
                <option value="data_access">Data Access</option>
                <option value="system_change">System Change</option>
                <option value="security">Security</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logs List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Audit Events ({filteredLogs.length})</h3>
              {loading ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading audit logs...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedLog?.id === log.id
                          ? 'border-blue-500 bg-gray-700/50'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(log.status)}
                          <div>
                            <h4 className="font-semibold text-white">{log.action}</h4>
                            <p className="text-sm text-gray-400">{log.userName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(log.category)}`}>
                            {log.category.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm text-white">{log.details}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>{log.resource}</span>
                          <span>•</span>
                          <span>{log.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Log Details */}
          <div className="lg:col-span-1">
            {selectedLog ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Log Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{selectedLog.action}</h4>
                    <p className="text-sm text-gray-400">{selectedLog.details}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">User Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{selectedLog.userName}</span>
                      </div>
                      <div className="text-gray-400">ID: {selectedLog.userId}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Technical Details</h5>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Resource:</span>
                        <span className="text-gray-300 ml-2">{selectedLog.resource}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">IP Address:</span>
                        <span className="text-gray-300 ml-2">{selectedLog.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">User Agent:</span>
                        <span className="text-gray-300 ml-2 text-xs">{selectedLog.userAgent}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Timeline</h5>
                    <div className="text-sm text-gray-300">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
                <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Log Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select a log entry from the list to view detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs; 