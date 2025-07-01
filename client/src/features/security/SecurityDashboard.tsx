import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, XCircle, Activity, Users } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface SecurityThreat {
  id: string;
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'ddos' | 'physical_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  source: string;
  affectedSystems: string[];
}

interface SecurityMetric {
  totalThreats: number;
  activeThreats: number;
  resolvedThreats: number;
  securityScore: number;
  lastScan: string;
  encryptionStatus: 'enabled' | 'disabled';
  twoFactorEnabled: boolean;
  activeUsers: number;
}

const SecurityDashboard: React.FC = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetric | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<SecurityThreat | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Mock security data
      const mockThreats: SecurityThreat[] = [
        {
          id: 'THREAT-001',
          type: 'unauthorized_access',
          severity: 'high',
          description: 'Multiple failed login attempts detected from unknown IP',
          timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          status: 'investigating',
          source: '192.168.1.100',
          affectedSystems: ['User Authentication', 'Admin Panel']
        },
        {
          id: 'THREAT-002',
          type: 'malware',
          severity: 'medium',
          description: 'Suspicious file detected in upload directory',
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          status: 'active',
          source: 'File Upload System',
          affectedSystems: ['File Storage', 'Upload Service']
        },
        {
          id: 'THREAT-003',
          type: 'ddos',
          severity: 'critical',
          description: 'Distributed denial of service attack detected',
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          status: 'resolved',
          source: 'Multiple IPs',
          affectedSystems: ['Web Server', 'API Gateway']
        }
      ];

      const mockMetrics: SecurityMetric = {
        totalThreats: 15,
        activeThreats: 2,
        resolvedThreats: 13,
        securityScore: 87,
        lastScan: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        encryptionStatus: 'enabled',
        twoFactorEnabled: true,
        activeUsers: 24
      };

      setThreats(mockThreats);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      showNotification({ message: 'Failed to fetch security data', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const resolveThreat = async (threatId: string) => {
    try {
      setThreats(prev => prev.map(threat => 
        threat.id === threatId 
          ? { ...threat, status: 'resolved' as const }
          : threat
      ));
      showNotification({ message: 'Threat marked as resolved', type: 'success', orderId: 0, customerName: '' });
    } catch (error) {
      showNotification({ message: 'Failed to resolve threat', type: 'error', orderId: 0, customerName: '' });
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'unauthorized_access': return <Users className="w-4 h-4" />;
      case 'data_breach': return <Eye className="w-4 h-4" />;
      case 'malware': return <AlertTriangle className="w-4 h-4" />;
      case 'ddos': return <Activity className="w-4 h-4" />;
      case 'physical_breach': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400';
      case 'investigating': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const activeThreats = threats.filter(t => t.status === 'active');
  const investigatingThreats = threats.filter(t => t.status === 'investigating');
  const resolvedThreats = threats.filter(t => t.status === 'resolved');

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-blue-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Security Dashboard</h2>
        </div>

        {/* Security Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Security Score</h3>
              </div>
              <div className={`text-3xl font-bold ${getSecurityScoreColor(metrics.securityScore)}`}>
                {metrics.securityScore}/100
              </div>
              <div className="text-sm text-gray-400">Overall Rating</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Active Threats</h3>
              </div>
              <div className="text-3xl font-bold text-red-400">{activeThreats.length}</div>
              <div className="text-sm text-gray-400">Require Attention</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Investigating</h3>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{investigatingThreats.length}</div>
              <div className="text-sm text-gray-400">Under Review</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Resolved</h3>
              </div>
              <div className="text-3xl font-bold text-green-400">{resolvedThreats.length}</div>
              <div className="text-sm text-gray-400">Today</div>
            </div>
          </div>
        )}

        {/* Security Status */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Encryption</h3>
              </div>
              <div className="flex items-center gap-2">
                {metrics.encryptionStatus === 'enabled' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-semibold ${
                  metrics.encryptionStatus === 'enabled' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metrics.encryptionStatus === 'enabled' ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">Data Protection</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">2FA Status</h3>
              </div>
              <div className="flex items-center gap-2">
                {metrics.twoFactorEnabled ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-semibold ${
                  metrics.twoFactorEnabled ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metrics.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">Multi-Factor Auth</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Active Users</h3>
              </div>
              <div className="text-3xl font-bold text-purple-400">{metrics.activeUsers}</div>
              <div className="text-sm text-gray-400">Currently Online</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Threats List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Security Threats</h3>
              {loading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading security data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {threats.map((threat) => (
                    <div
                      key={threat.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedThreat?.id === threat.id
                          ? 'border-red-500 bg-gray-700/50'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedThreat(threat)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getThreatIcon(threat.type)}
                          <div>
                            <h4 className="font-semibold text-white">{threat.id}</h4>
                            <p className="text-sm text-gray-400 capitalize">{threat.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(threat.severity)}`}>
                            {threat.severity}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(threat.status)}`}>
                            {threat.status}
                          </span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm text-white">{threat.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>Source: {threat.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{new Date(threat.timestamp).toLocaleString()}</span>
                        <span>{threat.affectedSystems.length} systems affected</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Threat Details */}
          <div className="lg:col-span-1">
            {selectedThreat ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Threat Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{selectedThreat.id}</h4>
                    <p className="text-sm text-gray-400">{selectedThreat.description}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Source</h5>
                    <div className="text-sm text-gray-300">{selectedThreat.source}</div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Affected Systems</h5>
                    <div className="space-y-1">
                      {selectedThreat.affectedSystems.map((system, index) => (
                        <div key={index} className="text-sm text-gray-300 flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          {system}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Timeline</h5>
                    <div className="text-sm text-gray-300">
                      Detected: {new Date(selectedThreat.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {selectedThreat.status === 'active' && (
                    <button
                      onClick={() => resolveThreat(selectedThreat.id)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Threat Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select a threat from the list to view detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard; 