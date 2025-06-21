import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Cloud, Package, TrendingUp, AlertTriangle } from 'lucide-react';

const DigitalTwin: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'demand_spike' | 'weather' | 'supplier' | 'peak_season'>('demand_spike');

  const scenarios = [
    {
      id: 'demand_spike',
      name: 'Demand Spike',
      description: 'Simulate promotional campaign impact',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      parameters: {
        magnitude: 150,
        duration: 7,
        category: 'Electronics',
        region: 'Northeast'
      }
    },
    {
      id: 'weather',
      name: 'Weather Event',
      description: 'Model severe weather disruption',
      icon: Cloud,
      color: 'from-gray-500 to-gray-600',
      parameters: {
        severity: 8,
        duration: 3,
        type: 'Storm',
        affected_routes: 12
      }
    },
    {
      id: 'supplier',
      name: 'Supplier Outage',
      description: 'Test alternative sourcing strategies',
      icon: Package,
      color: 'from-red-500 to-red-600',
      parameters: {
        supplier: 'Supplier-A',
        duration: 14,
        impact_percentage: 35,
        alternative_sources: 3
      }
    },
    {
      id: 'peak_season',
      name: 'Peak Season',
      description: 'Optimize for holiday demand',
      icon: Zap,
      color: 'from-green-500 to-green-600',
      parameters: {
        season: 'Holiday',
        demand_multiplier: 2.4,
        duration: 30,
        preparation_time: 45
      }
    }
  ];

  const simulationResults = {
    demand_spike: {
      inventory_impact: '+23% stockout risk',
      cost_impact: '+$45,000 fulfillment cost',
      sla_impact: '-8% on-time delivery',
      recommendations: [
        'Pre-position inventory in Northeast warehouses',
        'Activate backup suppliers for Electronics category',
        'Increase staffing at fulfillment centers by 15%'
      ]
    },
    weather: {
      inventory_impact: '+15% delay in replenishment',
      cost_impact: '+$12,000 alternative routing',
      sla_impact: '-12% on-time delivery',
      recommendations: [
        'Reroute deliveries through Southern corridor',
        'Increase safety stock by 20% for affected regions',
        'Activate emergency supplier contracts'
      ]
    },
    supplier: {
      inventory_impact: '+40% shortage in Category-B',
      cost_impact: '+$78,000 premium sourcing',
      sla_impact: '-25% availability',
      recommendations: [
        'Immediately engage Supplier-B and Supplier-C',
        'Expedite shipments from alternative sources',
        'Communicate delays to affected customers'
      ]
    },
    peak_season: {
      inventory_impact: '+60% inventory requirement',
      cost_impact: '+$234,000 operational scaling',
      sla_impact: '+5% improved delivery times',
      recommendations: [
        'Begin inventory buildup 6 weeks early',
        'Scale warehouse staff by 80%',
        'Implement dynamic pricing strategies'
      ]
    }
  };

  const currentScenario = scenarios.find(s => s.id === selectedScenario)!;
  const currentResults = simulationResults[selectedScenario];

  const handleSimulation = () => {
    setIsSimulating(!isSimulating);
    if (!isSimulating) {
      // Simulate for 5 seconds
      setTimeout(() => {
        setIsSimulating(false);
      }, 5000);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Digital Twin Simulator</h1>
          <p className="text-gray-400 mt-1">What-if scenario analysis for supply chain resilience planning</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSimulation}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
              isSimulating 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isSimulating ? 'Stop Simulation' : 'Run Simulation'}</span>
          </button>
          <button className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors">
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>
      </motion.div>

      {/* Scenario Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {scenarios.map((scenario, index) => {
          const Icon = scenario.icon;
          const isSelected = selectedScenario === scenario.id;
          
          return (
            <motion.div
              key={scenario.id}
              className={`bg-gray-800 rounded-xl p-6 border cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-500/20' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedScenario(scenario.id as any)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${scenario.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {isSelected && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{scenario.name}</h3>
              <p className="text-sm text-gray-400">{scenario.description}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Configuration */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">Scenario Parameters</h3>
          <div className="space-y-4">
            {Object.entries(currentScenario.parameters).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-2 capitalize">
                  {key.replace('_', ' ')}
                </label>
                {typeof value === 'number' ? (
                  <input
                    type="range"
                    min={0}
                    max={typeof value === 'number' && key.includes('percentage') ? 100 : value * 2}
                    value={value}
                    onChange={() => {}} // Read-only for demo
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                ) : (
                  <select 
                    value={value}
                    onChange={() => {}} // Read-only for demo
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={value}>{value}</option>
                  </select>
                )}
                <div className="text-sm text-gray-300 mt-1">{value}</div>
              </div>
            ))}
          </div>

          {isSimulating && (
            <motion.div
              className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-400 font-medium">Running simulation...</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Analyzing impact across {Math.floor(Math.random() * 1000 + 500)} supply chain nodes
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Impact Summary */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="text-xl font-semibold text-white mb-6">Predicted Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm text-gray-400 mb-1">Inventory Impact</h4>
                <p className="text-lg font-semibold text-white">{currentResults.inventory_impact}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm text-gray-400 mb-1">Cost Impact</h4>
                <p className="text-lg font-semibold text-white">{currentResults.cost_impact}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm text-gray-400 mb-1">SLA Impact</h4>
                <p className="text-lg font-semibold text-white">{currentResults.sla_impact}</p>
              </div>
            </div>
          </motion.div>

          {/* Recommendations */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="text-xl font-semibold text-white mb-6">AI Recommendations</h3>
            <div className="space-y-4">
              {currentResults.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{recommendation}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="text-green-400">Priority: High</span>
                      <span className="text-gray-400">Impact: {Math.floor(Math.random() * 30 + 70)}%</span>
                      <span className="text-gray-400">Effort: {['Low', 'Medium', 'High'][index % 3]}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Simulation History */}
          <motion.div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <h3 className="text-xl font-semibold text-white mb-6">Recent Simulations</h3>
            <div className="space-y-3">
              {[
                { scenario: 'Peak Season', timestamp: '2 hours ago', result: 'Optimized inventory positioning', status: 'completed' },
                { scenario: 'Weather Event', timestamp: '1 day ago', result: 'Alternative routing identified', status: 'completed' },
                { scenario: 'Supplier Outage', timestamp: '3 days ago', result: 'Backup suppliers activated', status: 'completed' },
                { scenario: 'Demand Spike', timestamp: '1 week ago', result: 'Capacity scaling recommended', status: 'completed' }
              ].map((sim, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{sim.scenario}</p>
                    <p className="text-sm text-gray-400">{sim.result}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-xs text-green-400 capitalize">{sim.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{sim.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;