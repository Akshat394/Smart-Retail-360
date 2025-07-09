import React, { useState, useEffect } from 'react';
import { Leaf, TrendingUp, TrendingDown, BarChart3, Globe, Target, Award, Info, AlertTriangle, Calendar, Package, Clock, CheckCircle } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface SustainabilityMetrics {
  totalCarbonOffset: number;
  totalGreenTokens: number;
  totalProjects: number;
  averageSustainabilityScore: number;
  carbonFootprintByProduct: Record<string, number>;
  sustainabilityTrends: Array<{
    date: string;
    carbonOffset: number;
    tokensMinted: number;
    score: number;
  }>;
}

interface CarbonProject {
  projectId: string;
  name: string;
  description: string;
  location: string;
  carbonOffset: number;
  status: 'pending' | 'active' | 'completed' | 'verified';
  createdAt: string;
  completedAt?: string;
  verificationDocument?: string;
}

interface LeaderboardEntry {
  owner: string;
  balance: number;
  carbonOffset: number;
}

const SustainabilityAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<SustainabilityMetrics | null>(null);
  const [projects, setProjects] = useState<CarbonProject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    location: '',
    carbonOffset: '',
    verificationDocument: ''
  });
  const { showNotification } = useNotification();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    fetchSustainabilityData();
  }, []);

  const fetchSustainabilityData = async () => {
    try {
      const [metricsRes, projectsRes, leaderboardRes] = await Promise.all([
        fetch('/api/blockchain/sustainability/metrics'),
        fetch('/api/blockchain/carbon-projects'),
        fetch('/api/blockchain/green-tokens/leaderboard')
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch sustainability data:', error);
      // Fallback to mock data
      setMetrics({
        totalCarbonOffset: 1250,
        totalGreenTokens: 890,
        totalProjects: 12,
        averageSustainabilityScore: 78,
        carbonFootprintByProduct: {
          'PROD-001': 45.2,
          'PROD-002': 32.8,
          'PROD-003': 67.1
        },
        sustainabilityTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toDateString(),
          carbonOffset: Math.floor(Math.random() * 50) + 20,
          tokensMinted: Math.floor(Math.random() * 30) + 10,
          score: Math.floor(Math.random() * 20) + 70
        }))
      });
      setProjects([
        {
          projectId: '1',
          name: 'Solar Farm Initiative',
          description: 'Large-scale solar farm installation in Rajasthan',
          location: 'Rajasthan, India',
          carbonOffset: 500,
          status: 'verified',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          projectId: '2',
          name: 'Wind Energy Project',
          description: 'Wind turbine installation in Tamil Nadu',
          location: 'Tamil Nadu, India',
          carbonOffset: 300,
          status: 'active',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
      setLeaderboard([
        { owner: 'company', balance: 175, carbonOffset: 175 },
        { owner: 'warehouse-1', balance: 120, carbonOffset: 120 },
        { owner: 'supplier-1', balance: 90, carbonOffset: 90 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.description || !newProject.location || !newProject.carbonOffset) {
      showNotification({ message: 'Please fill in all required fields', type: 'error', orderId: 0, customerName: '' });
      return;
    }

    try {
      const response = await fetch('/api/blockchain/carbon-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          carbonOffset: parseFloat(newProject.carbonOffset)
        })
      });

      if (response.ok) {
        showNotification({ message: 'Carbon project created successfully', type: 'success', orderId: 0, customerName: '' });
        setNewProject({ name: '', description: '', location: '', carbonOffset: '', verificationDocument: '' });
        fetchSustainabilityData();
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      showNotification({ message: 'Failed to create project: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    }
  };

  const handleVerifyProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/blockchain/carbon-projects/${projectId}/verify`, {
        method: 'POST'
      });

      if (response.ok) {
        showNotification({ message: 'Project verified successfully', type: 'success', orderId: 0, customerName: '' });
        fetchSustainabilityData();
      } else {
        throw new Error('Failed to verify project');
      }
    } catch (error) {
      showNotification({ message: 'Failed to verify project: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400';
      case 'active': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      case 'completed': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <Award className="w-4 h-4" />;
      case 'active': return <TrendingUp className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen p-6 flex items-center justify-center">
        <div className="text-white">Loading sustainability analytics...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Leaf className="text-green-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Sustainability Analytics</h2>
          <button
            className="ml-2 text-gray-400 hover:text-green-400"
            onClick={() => setShowOnboarding((v) => !v)}
            title="Show onboarding info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Onboarding Info */}
        {showOnboarding && (
          <div className="bg-blue-900/20 border border-blue-500/40 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">Sustainability Analytics Dashboard</h3>
                <p className="text-gray-300 text-sm mb-2">
                  Track carbon footprint, green token metrics, and sustainability trends across your supply chain.
                  Monitor carbon projects, verify sustainability initiatives, and analyze environmental impact.
                </p>
                <div className="text-xs text-gray-400">
                  <p>• Real-time carbon offset tracking</p>
                  <p>• Green token leaderboard and analytics</p>
                  <p>• Carbon project management and verification</p>
                  <p>• Sustainability score trends and insights</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Leaf className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Total Carbon Offset</h3>
              </div>
              <div className="text-3xl font-bold text-green-400">{metrics.totalCarbonOffset.toLocaleString()}</div>
              <div className="text-sm text-gray-400">kg CO2</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Green Tokens</h3>
              </div>
              <div className="text-3xl font-bold text-blue-400">{metrics.totalGreenTokens.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Tokens Minted</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Sustainability Score</h3>
              </div>
              <div className="text-3xl font-bold text-purple-400">{metrics.averageSustainabilityScore}</div>
              <div className="text-sm text-gray-400">Average Score</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-orange-500/40">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Carbon Projects</h3>
              </div>
              <div className="text-3xl font-bold text-orange-400">{metrics.totalProjects}</div>
              <div className="text-sm text-gray-400">Active Projects</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sustainability Trends */}
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Sustainability Trends
            </h3>
            <div className="space-y-3">
              {metrics?.sustainabilityTrends.slice(-7).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {new Date(trend.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-green-400">{trend.carbonOffset}kg CO2</div>
                    <div className="text-blue-400">{trend.tokensMinted} tokens</div>
                    <div className="text-purple-400">Score: {trend.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carbon Projects */}
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-orange-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400" />
              Carbon Projects
            </h3>
            <div className="space-y-3 mb-4">
              {projects.map((project) => (
                <div key={project.projectId} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{project.name}</h4>
                    <div className={`flex items-center gap-1 ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="text-xs capitalize">{project.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{project.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{project.location}</span>
                    <span className="text-green-400">{project.carbonOffset}kg CO2</span>
                  </div>
                  {project.status === 'pending' && (
                    <button
                      onClick={() => handleVerifyProject(project.projectId)}
                      className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                    >
                      Verify Project
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create New Project */}
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-semibold text-white mb-3">Create New Carbon Project</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Project Name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                />
                <textarea
                  placeholder="Description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Location"
                    value={newProject.location}
                    onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Carbon Offset (kg)"
                    value={newProject.carbonOffset}
                    onChange={(e) => setNewProject(prev => ({ ...prev, carbonOffset: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handleCreateProject}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Green Token Leaderboard */}
        <div className="mt-8 bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-400" />
            Green Token Leaderboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaderboard.map((entry, index) => (
              <div key={entry.owner} className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-semibold text-white capitalize">{entry.owner.replace('-', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-blue-400">{entry.balance} tokens</div>
                  <div className="text-green-400">{entry.carbonOffset}kg CO2</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carbon Footprint by Product */}
        {metrics && (
          <div className="mt-8 bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Carbon Footprint by Product
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.carbonFootprintByProduct).map(([productId, footprint]) => (
                <div key={productId} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{productId}</span>
                    <span className="text-purple-400 font-bold">{footprint}kg</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((footprint / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SustainabilityAnalytics; 