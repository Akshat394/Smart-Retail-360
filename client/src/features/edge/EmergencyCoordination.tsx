import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Clock, Users, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface EmergencyEvent {
  id: string;
  type: 'fire' | 'flood' | 'power_outage' | 'security_breach' | 'equipment_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
  assignedTeam: string[];
  coordinates: { lat: number; lng: number };
}

interface ResponseTeam {
  id: string;
  name: string;
  type: 'fire' | 'security' | 'maintenance' | 'medical';
  status: 'available' | 'busy' | 'responding';
  location: string;
  contact: string;
}

const EmergencyCoordination: React.FC = () => {
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchEmergencies();
    fetchResponseTeams();
  }, []);

  const fetchEmergencies = async () => {
    try {
      // Mock emergency data
      const mockEmergencies: EmergencyEvent[] = [
        {
          id: 'EMG-001',
          type: 'fire',
          severity: 'high',
          location: 'Warehouse A - Section 3',
          description: 'Smoke detected in storage area, sprinkler system activated',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          status: 'active',
          assignedTeam: ['fire-team-1', 'security-team-1'],
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        {
          id: 'EMG-002',
          type: 'power_outage',
          severity: 'medium',
          location: 'Loading Dock B',
          description: 'Partial power loss affecting automated systems',
          timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          status: 'investigating',
          assignedTeam: ['maintenance-team-1'],
          coordinates: { lat: 28.6145, lng: 77.2095 }
        }
      ];
      setEmergencies(mockEmergencies);
    } catch (error) {
      console.error('Failed to fetch emergencies:', error);
    }
  };

  const fetchResponseTeams = async () => {
    try {
      // Mock team data
      const mockTeams: ResponseTeam[] = [
        {
          id: 'fire-team-1',
          name: 'Fire Response Team Alpha',
          type: 'fire',
          status: 'responding',
          location: 'Warehouse A',
          contact: '+91-98765-43210'
        },
        {
          id: 'security-team-1',
          name: 'Security Team Bravo',
          type: 'security',
          status: 'responding',
          location: 'Main Gate',
          contact: '+91-98765-43211'
        },
        {
          id: 'maintenance-team-1',
          name: 'Maintenance Team Charlie',
          type: 'maintenance',
          status: 'busy',
          location: 'Loading Dock B',
          contact: '+91-98765-43212'
        },
        {
          id: 'medical-team-1',
          name: 'Medical Response Team Delta',
          type: 'medical',
          status: 'available',
          location: 'Medical Center',
          contact: '+91-98765-43213'
        }
      ];
      setTeams(mockTeams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const triggerEmergencyCoordination = async (clusterId: string, emergencyType: string, details: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/edge/emergency-coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterId,
          emergencyType,
          details,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        showNotification({ message: 'Emergency coordination triggered successfully', type: 'success', orderId: 0, customerName: '' });
        fetchEmergencies();
      } else {
        throw new Error('Failed to trigger emergency coordination');
      }
    } catch (error) {
      showNotification({ message: 'Failed to trigger emergency coordination: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const resolveEmergency = async (emergencyId: string) => {
    try {
      setEmergencies(prev => prev.map(emergency => 
        emergency.id === emergencyId 
          ? { ...emergency, status: 'resolved' as const }
          : emergency
      ));
      showNotification({ message: 'Emergency marked as resolved', type: 'success', orderId: 0, customerName: '' });
    } catch (error) {
      showNotification({ message: 'Failed to resolve emergency', type: 'error', orderId: 0, customerName: '' });
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

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400';
      case 'busy': return 'text-yellow-400';
      case 'responding': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const activeEmergencies = emergencies.filter(e => e.status === 'active');
  const investigatingEmergencies = emergencies.filter(e => e.status === 'investigating');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-white">Emergency Coordination</h2>
          </div>
          <button
            onClick={() => triggerEmergencyCoordination('cluster-1', 'test', { message: 'Test emergency coordination' })}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Triggering...' : 'Test Emergency'}
          </button>
        </div>

        {/* Emergency Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Active</h3>
            </div>
            <div className="text-3xl font-bold text-red-400">{activeEmergencies.length}</div>
            <div className="text-sm text-gray-400">Emergencies</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Investigating</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{investigatingEmergencies.length}</div>
            <div className="text-sm text-gray-400">Incidents</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Resolved</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">{resolvedEmergencies.length}</div>
            <div className="text-sm text-gray-400">Today</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Teams</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">{teams.length}</div>
            <div className="text-sm text-gray-400">Available</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Emergency Events</h3>
              <div className="space-y-4">
                {emergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedEmergency?.id === emergency.id
                        ? 'border-red-500 bg-gray-700/50'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedEmergency(emergency)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                          <h4 className="font-semibold text-white">{emergency.id}</h4>
                          <p className="text-sm text-gray-400 capitalize">{emergency.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(emergency.severity)}`}>
                          {emergency.severity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(emergency.status)}`}>
                          {emergency.status}
                        </span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-white">{emergency.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        {emergency.location}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{new Date(emergency.timestamp).toLocaleString()}</span>
                      <span>{emergency.assignedTeam.length} teams assigned</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Emergency Details & Response Teams */}
          <div className="lg:col-span-1 space-y-6">
            {/* Emergency Details */}
            {selectedEmergency ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Emergency Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{selectedEmergency.id}</h4>
                    <p className="text-sm text-gray-400">{selectedEmergency.description}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Location</h5>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="w-4 h-4" />
                      {selectedEmergency.location}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Assigned Teams</h5>
                    <div className="space-y-2">
                      {selectedEmergency.assignedTeam.map((teamId) => {
                        const team = teams.find(t => t.id === teamId);
                        return team ? (
                          <div key={teamId} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                            <div>
                              <div className="text-sm text-white">{team.name}</div>
                              <div className="text-xs text-gray-400">{team.type}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${getTeamStatusColor(team.status)}`}>
                                {team.status}
                              </span>
                              <button className="p-1 bg-blue-600 rounded hover:bg-blue-700">
                                <Phone className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {selectedEmergency.status === 'active' && (
                    <button
                      onClick={() => resolveEmergency(selectedEmergency.id)}
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
                <AlertTriangle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Emergency Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select an emergency from the list to view details
                </p>
              </div>
            )}

            {/* Response Teams */}
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Response Teams</h3>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white text-sm">{team.name}</h4>
                      <span className={`text-xs ${getTeamStatusColor(team.status)}`}>
                        {team.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{team.location}</div>
                    <div className="flex items-center gap-2">
                      <button className="p-1 bg-blue-600 rounded hover:bg-blue-700">
                        <Phone className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-xs text-gray-300">{team.contact}</span>
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

export default EmergencyCoordination; 