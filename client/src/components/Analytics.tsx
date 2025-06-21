import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, Brain, Target, AlertTriangle, Activity, Zap } from 'lucide-react';

const Analytics: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<'arima' | 'lstm' | 'ensemble'>('ensemble');
  const [forecastHorizon, setForecastHorizon] = useState<7 | 14 | 30>(14);

  const forecastData = [
    { date: '2024-01-01', actual: 1200, arima: 1180, lstm: 1220, ensemble: 1195, confidence: 95 },
    { date: '2024-01-02', actual: 1350, arima: 1320, lstm: 1340, ensemble: 1335, confidence: 92 },
    { date: '2024-01-03', actual: 1180, arima: 1200, lstm: 1160, ensemble: 1185, confidence: 89 },
    { date: '2024-01-04', actual: 1420, arima: 1380, lstm: 1410, ensemble: 1398, confidence: 94 },
    { date: '2024-01-05', actual: 1290, arima: 1310, lstm: 1280, ensemble: 1298, confidence: 91 },
    { date: '2024-01-06', actual: 1560, arima: 1520, lstm: 1580, ensemble: 1545, confidence: 88 },
    { date: '2024-01-07', actual: 1340, arima: 1360, lstm: 1320, ensemble: 1342, confidence: 93 },
    // Future predictions
    { date: '2024-01-08', arima: 1280, lstm: 1300, ensemble: 1290, confidence: 87 },
    { date: '2024-01-09', arima: 1450, lstm: 1480, ensemble: 1465, confidence: 85 },
    { date: '2024-01-10', arima: 1390, lstm: 1410, ensemble: 1400, confidence: 83 }
  ];

  const modelPerformance = [
    { model: 'ARIMA', mape: 8.4, rmse: 142.3, mae: 98.7, r2: 0.89 },
    { model: 'LSTM', mape: 6.2, rmse: 128.9, mae: 87.4, r2: 0.92 },
    { model: 'Ensemble', mape: 5.8, rmse: 118.6, mae: 82.1, r2: 0.94 }
  ];

  const anomalyData = [
    { date: '2024-01-01', demand: 1200, anomaly_score: 0.12, threshold: 0.8 },
    { date: '2024-01-02', demand: 1350, anomaly_score: 0.34, threshold: 0.8 },
    { date: '2024-01-03', demand: 1180, anomaly_score: 0.21, threshold: 0.8 },
    { date: '2024-01-04', demand: 1420, anomaly_score: 0.67, threshold: 0.8 },
    { date: '2024-01-05', demand: 1290, anomaly_score: 0.28, threshold: 0.8 },
    { date: '2024-01-06', demand: 1560, anomaly_score: 0.89, threshold: 0.8 }, // Anomaly
    { date: '2024-01-07', demand: 1340, anomaly_score: 0.43, threshold: 0.8 }
  ];

  const featureImportance = [
    { feature: 'Historical Sales', importance: 0.34, color: '#3B82F6' },
    { feature: 'Seasonality', importance: 0.28, color: '#10B981' },
    { feature: 'Promotions', importance: 0.15, color: '#F59E0B' },
    { feature: 'Weather', importance: 0.12, color: '#8B5CF6' },
    { feature: 'Economic Indicators', importance: 0.08, color: '#EF4444' },
    { feature: 'Competition', importance: 0.03, color: '#6B7280' }
  ];

  const getModelColor = (model: string) => {
    switch (model) {
      case 'arima': return '#F59E0B';
      case 'lstm': return '#8B5CF6';
      case 'ensemble': return '#10B981';
      default: return '#3B82F6';
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
          <h1 className="text-3xl font-bold text-white">Demand Forecasting & Analytics</h1>
          <p className="text-gray-400 mt-1">AI-powered demand prediction with explainable ML models</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as 'arima' | 'lstm' | 'ensemble')}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="arima">ARIMA Model</option>
            <option value="lstm">LSTM Neural Network</option>
            <option value="ensemble">Ensemble Model</option>
          </select>
          <select 
            value={forecastHorizon}
            onChange={(e) => setForecastHorizon(Number(e.target.value) as 7 | 14 | 30)}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
      </motion.div>

      {/* Model Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modelPerformance.map((model, index) => (
          <motion.div
            key={model.model}
            className={`bg-gray-800 rounded-xl p-6 border ${
              selectedModel === model.model.toLowerCase() ? 'border-blue-500' : 'border-gray-700'
            } hover:border-gray-600 transition-all duration-300`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${
                  model.model === 'ARIMA' ? 'from-yellow-500 to-yellow-600' :
                  model.model === 'LSTM' ? 'from-purple-500 to-purple-600' :
                  'from-green-500 to-green-600'
                } flex items-center justify-center`}>
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{model.model}</h3>
              </div>
              {selectedModel === model.model.toLowerCase() && (
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">MAPE</p>
                <p className="text-lg font-bold text-white">{model.mape}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">R²</p>
                <p className="text-lg font-bold text-white">{model.r2}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">RMSE</p>
                <p className="text-sm text-gray-300">{model.rmse}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">MAE</p>
                <p className="text-sm text-gray-300">{model.mae}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Forecasting Chart */}
      <motion.div
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Demand Forecast vs Actual</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-400">Actual</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getModelColor(selectedModel) }} />
              <span className="text-sm text-gray-400">{selectedModel.toUpperCase()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <span className="text-sm text-gray-400">Confidence</span>
            </div>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey={selectedModel} 
                stroke={getModelColor(selectedModel)} 
                strokeWidth={3}
                dot={{ fill: getModelColor(selectedModel), strokeWidth: 2, r: 4 }}
                strokeDasharray={forecastData.some(d => d.actual === undefined) ? "5 5" : "0"}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Detection */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Anomaly Detection</h3>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">1 Anomaly Detected</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={anomalyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="anomaly_score" stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Scatter 
                  dataKey="anomaly_score" 
                  fill="#3B82F6"
                />
                <Line 
                  type="monotone" 
                  dataKey="threshold" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Feature Importance */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">Feature Importance (SHAP Values)</h3>
          <div className="space-y-4">
            {featureImportance.map((feature, index) => (
              <motion.div
                key={feature.feature}
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              >
                <span className="text-sm text-gray-300 flex-1">{feature.feature}</span>
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ backgroundColor: feature.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${feature.importance * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                  <span className="text-sm text-white w-12 text-right">
                    {(feature.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">Model Insight</p>
                <p className="text-xs text-gray-400 mt-1">
                  Historical sales patterns and seasonality are the strongest predictors, 
                  accounting for 62% of the model's decision-making process.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Model Comparison */}
      <motion.div
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-xl font-semibold text-white mb-6">Model Performance Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="model" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Bar dataKey="mape" fill="#3B82F6" name="MAPE %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;