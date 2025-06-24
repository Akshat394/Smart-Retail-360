import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Cloud, Package, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { apiService } from '../services/api';
import type { SimulationReport } from '@shared/schema';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DigitalTwin: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'demand_spike' | 'weather_event' | 'supplier_outage' | 'peak_season'>('demand_spike');
  const [simulationResult, setSimulationResult] = useState<SimulationReport | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<any>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const scenarios = [
    {
      id: 'demand_spike',
      name: 'Demand Spike',
      description: 'Simulate promotional campaign impact',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      parameters: {
        increasePercentage: { min: 10, max: 200, default: 50, unit: '%' },
        duration: { min: 1, max: 30, default: 7, unit: ' days' },
        productCategory: { options: ['Electronics', 'Apparel', 'Groceries', 'Home Goods'], default: 'Electronics' },
        region: { options: ['Northeast', 'South', 'West', 'Midwest'], default: 'Northeast' }
      }
    },
    {
      id: 'weather_event',
      name: 'Weather Event',
      description: 'Model severe weather disruption',
      icon: Cloud,
      color: 'from-gray-500 to-gray-600',
      parameters: {
        eventType: { options: ['flood', 'storm', 'fog'], default: 'flood' },
        city: { options: ['Mumbai', 'Chennai', 'Kolkata', 'Delhi'], default: 'Mumbai' },
        severity: { options: ['low', 'medium', 'high'], default: 'high' }
      }
    },
    {
      id: 'supplier_outage',
      name: 'Supplier Outage',
      description: 'Test alternative sourcing strategies',
      icon: Package,
      color: 'from-red-500 to-red-600',
      parameters: {
        supplierId: { options: [1, 2, 3], default: 1 },
        impactPercentage: { min: 10, max: 100, default: 40, unit: '%' },
        duration: { min: 1, max: 60, default: 14, unit: ' days' }
      }
    },
    {
      id: 'peak_season',
      name: 'Peak Season',
      description: 'Optimize for holiday demand',
      icon: Zap,
      color: 'from-green-500 to-green-600',
       parameters: {
        increasePercentage: { min: 50, max: 300, default: 120, unit: '%' },
        duration: { min: 15, max: 90, default: 45, unit: ' days' },
        preparationTime: { min: 15, max: 120, default: 60, unit: ' days' }
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
    weather_event: {
      inventory_impact: '+15% delay in replenishment',
      cost_impact: '+$12,000 alternative routing',
      sla_impact: '-12% on-time delivery',
      recommendations: [
        'Reroute deliveries through Southern corridor',
        'Increase safety stock by 20% for affected regions',
        'Activate emergency supplier contracts'
      ]
    },
    supplier_outage: {
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
  const currentResults = simulationResult ? null : simulationResults[selectedScenario];

  // Effect to initialize parameters when scenario changes
  useEffect(() => {
    if (currentScenario) {
      const defaultParams = Object.fromEntries(
        Object.entries(currentScenario.parameters).map(([key, config]: [string, any]) => [key, config.default])
      );
      setParameters(defaultParams);
      setSimulationResult(null); // Reset results when scenario changes
      setSimulationError(null);
    }
  }, [selectedScenario]);

  // Fetch inventory for dynamic categories
  useEffect(() => {
    (async () => {
      try {
        const inv = await apiService.getInventoryStatus();
        setInventory(inv as any[]);
        const cats = Array.from(new Set((inv as any[]).map((item: any) => item.category || 'Unknown')));
        setCategories(cats as string[]);
      } catch {
        setCategories(['Electronics', 'Apparel', 'Groceries', 'Home Goods']);
      }
    })();
  }, []);

  // Fetch suppliers for Supplier Outage scenario
  useEffect(() => {
    if (selectedScenario === 'supplier_outage') {
      (async () => {
        try {
          const result = await apiService.getSuppliers();
          setSuppliers(result as any[]);
        } catch {
          setSuppliers([]);
        }
      })();
    }
  }, [selectedScenario]);

  // Add to history on simulation complete
  useEffect(() => {
    if (simulationResult) {
      setHistory((prev) => [{
        scenario: selectedScenario,
        parameters,
        summary: simulationResult.summary,
        impact: simulationResult.impact,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 5));
    }
  }, [simulationResult]);

  const handleParameterChange = (key: string, value: any) => {
    setParameters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSimulation = async () => {
    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      const scenarioToRun: 'demand_spike' | 'weather_event' | 'supplier_outage' | 'peak_season' = selectedScenario;
      
      const result = await apiService.runSimulation(scenarioToRun, parameters) as SimulationReport;
      setSimulationResult(result);

    } catch (error) {
      console.error("Simulation failed:", error);
      setSimulationError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setIsSimulating(false);
    setSimulationResult(null);
    setSimulationError(null);
  }

  const renderParameterInput = (key: string, config: any) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    const tooltip = config.description || '';
    if (key === 'supplierId' && selectedScenario === 'supplier_outage') {
      return (
        <div key={key} className="relative">
          <label className="block text-sm text-gray-400 mb-2 capitalize flex items-center">
            {label}
            {tooltip && (
              <span className="ml-1 text-blue-400" aria-label={tooltip} tabIndex={0}>
                <Info className="w-4 h-4" />
              </span>
            )}
          </label>
          <select
            value={parameters[key]}
            onChange={(e) => handleParameterChange(key, parseInt(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Reliability: {s.reliability ?? 'N/A'}, Lead: {s.leadTimeDays ?? 'N/A'}d)
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (config.options) {
      return (
        <div key={key} className="relative">
          <label className="block text-sm text-gray-400 mb-2 capitalize flex items-center">
            {label}
            {tooltip && (
              <span className="ml-1 text-blue-400" aria-label={tooltip} tabIndex={0}>
                <Info className="w-4 h-4" />
              </span>
            )}
          </label>
          <select
            value={parameters[key]}
            onChange={(e) => handleParameterChange(key, e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {config.options.map((option: any) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }
    if (typeof config.min !== 'undefined' && typeof config.max !== 'undefined') {
      return (
        <div key={key} className="relative">
          <label className="block text-sm text-gray-400 mb-2 capitalize flex items-center">
            {label}
            {tooltip && (
              <span className="ml-1 text-blue-400" aria-label={tooltip} tabIndex={0}>
                <Info className="w-4 h-4" />
              </span>
            )}
          </label>
          <input
            type="range"
            min={config.min}
            max={config.max}
            value={parameters[key] || config.default}
            onChange={(e) => handleParameterChange(key, parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="text-sm text-gray-300 mt-1">{parameters[key] || config.default}{config.unit}</div>
        </div>
      );
    }
    return null;
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
            <span>{isSimulating ? 'Running Simulation...' : 'Run Simulation'}</span>
          </button>
          <button 
            onClick={handleReset}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
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
            {Object.entries(currentScenario.parameters).map(([key, config]: [string, any]) => renderParameterInput(key, config))}
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

        {/* Simulation Results + Charts */}
        <motion.div
          className="lg:col-span-2 bg-gray-800 rounded-xl p-8 border border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Simulation Impact Analysis</h3>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              simulationResult ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {simulationResult ? 'Completed' : 'Ready to Run'}
            </span>
          </div>

          {isSimulating && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>Running complex multi-factor analysis...</p>
              </div>
            </div>
          )}

          {simulationError && (
            <div className="flex items-center justify-center h-full text-center text-red-400">
              <div>
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h4 className="text-lg font-bold mb-2">Simulation Failed</h4>
                <p className="text-sm">{simulationError}</p>
              </div>
            </div>
          )}

          {simulationResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Key Metrics */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Key Metrics Impact</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <span className="text-gray-400">Cost Impact</span>
                    <span className={`font-bold ${(simulationResult.impact.cost?.change ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {(simulationResult.impact.cost?.change ?? 0) > 0 ? '+' : ''}${(simulationResult.impact.cost?.change ?? 0).toFixed(2)} ({simulationResult.impact.cost?.percentage ?? '0%'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <span className="text-gray-400">SLA Impact</span>
                    <span className="font-bold text-yellow-400">
                      {(simulationResult.impact.sla?.total_delay_minutes ?? 0).toFixed(0)} min delay ({(simulationResult.impact.sla?.affected_routes ?? 0)} routes)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <span className="text-gray-400">Carbon Emissions</span>
                    <span className={`font-bold ${(simulationResult.impact.carbon?.change_kg ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                       {(simulationResult.impact.carbon?.change_kg ?? 0) > 0 ? '+' : ''}{(simulationResult.impact.carbon?.change_kg ?? 0).toFixed(2)} kg ({simulationResult.impact.carbon?.percentage ?? '0%'})
                    </span>
                  </div>
                   <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <span className="text-gray-400">Stockout Risk</span>
                    <span className="font-bold text-red-400">
                      {(simulationResult.impact.inventory?.stockout_risk_percentage ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                {/* Charts for metrics */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h5 className="text-sm text-gray-400 mb-2">Cost Impact Over Time</h5>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={history.map(h => ({
                        time: new Date(h.timestamp).toLocaleTimeString(),
                        cost: h.impact.cost?.change ?? 0
                      })).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
                        <Line type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h5 className="text-sm text-gray-400 mb-2">Stockout Risk (%)</h5>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={history.map(h => ({
                        time: new Date(h.timestamp).toLocaleTimeString(),
                        stockout: h.impact.inventory?.stockout_risk_percentage ?? 0
                      })).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
                        <Bar dataKey="stockout" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Recommendations</h4>
                <ul className="space-y-3">
                  {simulationResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`w-2 h-2 rounded-full mt-1.5 mr-3 ${
                        rec.priority === 'High' ? 'bg-red-500' : rec.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <span className="text-gray-300">{rec.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Simulation History */}
          {history.length > 0 && (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-white mb-4">Recent Simulation Runs</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-300">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Scenario</th>
                      <th className="px-4 py-2 text-left">Summary</th>
                      <th className="px-4 py-2 text-left">Cost</th>
                      <th className="px-4 py-2 text-left">Stockout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="px-4 py-2">{new Date(h.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-2 capitalize">{h.scenario.replace('_', ' ')}</td>
                        <td className="px-4 py-2">{h.summary?.description}</td>
                        <td className="px-4 py-2">${h.impact.cost?.change?.toFixed(2)}</td>
                        <td className="px-4 py-2">{h.impact.inventory?.stockout_risk_percentage?.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isSimulating && !simulationResult && !simulationError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Zap className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p>Configure parameters and run a simulation to see the impact.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DigitalTwin;