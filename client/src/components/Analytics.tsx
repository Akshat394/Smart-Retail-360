import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { TrendingUp, Brain, Target, AlertTriangle, Activity, Zap, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

interface ForecastData {
  predictions: number[];
  confidence_intervals?: {
    lower_bound: number[];
    upper_bound: number[];
  };
  model_performance?: Record<string, any>;
  model_weights?: Record<string, number>;
  timestamp: string;
  model_type: string;
}

interface ModelStatus {
  ensemble: {
    is_fitted: boolean;
    method: string;
    weights?: Record<string, number>;
    performance?: Record<string, any>;
  };
  arima: { is_fitted: boolean; model_type: string };
  lstm: { is_fitted: boolean; model_type: string };
  transformer: { is_fitted: boolean; model_type: string };
}

const Analytics: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('ensemble');
  const [predictionSteps, setPredictionSteps] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Generate synthetic historical data for demonstration
  useEffect(() => {
    const generateHistoricalData = () => {
      const data = [];
      const baseValue = 100;
      const now = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const trend = 0.5 * i;
        const seasonality = 10 * Math.sin(2 * Math.PI * i / 7); // Weekly pattern
        const noise = (Math.random() - 0.5) * 5;
        const value = Math.max(0, baseValue + trend + seasonality + noise);
        
        data.push({
          date: date.toISOString().split('T')[0],
          demand: Math.round(value),
          inventory: Math.round(value * 1.2),
          sales: Math.round(value * 0.9),
          timestamp: date.getTime()
        });
      }
      return data;
    };

    setHistoricalData(generateHistoricalData());
  }, []);

  // Fetch model status
  useEffect(() => {
    fetchModelStatus();
  }, []);

  const fetchModelStatus = async () => {
    try {
      const response = await fetch('http://localhost:8001/models/status');
      if (response.ok) {
        const status = await response.json();
        setModelStatus(status);
      }
    } catch (error) {
      console.error('Error fetching model status:', error);
    }
  };

  const generateForecast = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract demand data from historical data
      const demandData = historicalData.map(item => item.demand);

      const response = await fetch('http://localhost:8001/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: demandData,
          steps: predictionSteps,
          model_type: selectedModel,
          return_confidence: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate forecast');
      }

      const data: ForecastData = await response.json();
      setForecastData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const trainModel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const demandData = historicalData.map(item => item.demand);

      const response = await fetch('http://localhost:8001/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: demandData,
          model_type: selectedModel,
          epochs: 50,
          batch_size: 32
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to train model');
      }

      const result = await response.json();
      alert(`Model training started: ${result.message}`);
      
      // Refresh model status after a delay
      setTimeout(fetchModelStatus, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartData = () => {
    if (!forecastData) return [];

    const data: any[] = [];
    const startDate = new Date(historicalData[historicalData.length - 1]?.timestamp || Date.now());

    // Add historical data
    historicalData.forEach((item, index) => {
      data.push({
        date: item.date,
        actual: item.demand,
        predicted: null,
        lower_bound: null,
        upper_bound: null,
        type: 'historical'
      });
    });

    // Add forecast data
    forecastData.predictions.forEach((prediction, index) => {
      const forecastDate = new Date(startDate.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
      data.push({
        date: forecastDate.toISOString().split('T')[0],
        actual: null,
        predicted: Math.round(prediction),
        lower_bound: forecastData.confidence_intervals ? 
          Math.round(forecastData.confidence_intervals.lower_bound[index]) : null,
        upper_bound: forecastData.confidence_intervals ? 
          Math.round(forecastData.confidence_intervals.upper_bound[index]) : null,
        type: 'forecast'
      });
    });

    return data;
  };

  const getModelStatusColor = (isFitted: boolean) => {
    return isFitted ? 'bg-green-500' : 'bg-red-500';
  };

  const getModelStatusText = (isFitted: boolean) => {
    return isFitted ? 'Trained' : 'Not Trained';
  };

  const chartData = prepareChartData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Advanced Analytics & ML Forecasting</h1>
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-400" />
          <span className="text-sm text-gray-300">AI-Powered Insights</span>
        </div>
      </div>

      {/* Model Status Dashboard */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">ML Model Status</h2>
        </div>
        <div>
          {modelStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(modelStatus).map(([model, status]) => (
                <div key={model} className="flex items-center space-x-3 p-3 border border-white/20 rounded-lg bg-white/5">
                  <div className={`w-3 h-3 rounded-full ${getModelStatusColor(status.is_fitted)}`} />
                  <div>
                    <p className="font-medium capitalize text-white">{model}</p>
                    <p className="text-sm text-gray-300">{getModelStatusText(status.is_fitted)}</p>
                    {model === 'ensemble' && status.weights && (
                      <p className="text-xs text-gray-400">
                        Weights: {Object.entries(status.weights).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : String(v)}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300">Loading model status...</p>
          )}
        </div>
      </div>

      {/* Forecast Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Demand Forecasting</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Model Type</label>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="ensemble">Ensemble (Recommended)</option>
              <option value="arima">ARIMA</option>
              <option value="lstm">LSTM</option>
              <option value="transformer">Transformer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prediction Steps</label>
            <input
              type="number"
              value={predictionSteps}
              onChange={(e) => setPredictionSteps(parseInt(e.target.value))}
              min="1"
              max="90"
              className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button 
              onClick={generateForecast} 
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Forecast
                </>
              )}
            </button>
            <button 
              onClick={trainModel} 
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg"
            >
              Train Model
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Analytics Tabs */}
      <div className="space-y-4">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
            Demand Forecast
          </button>
          <button className="flex-1 bg-transparent text-gray-300 hover:text-white px-4 py-2 rounded-md text-sm">
            Model Performance
          </button>
          <button className="flex-1 bg-transparent text-gray-300 hover:text-white px-4 py-2 rounded-md text-sm">
            AI Insights
          </button>
        </div>

        {/* Forecast Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Demand Forecasting with Confidence Intervals</h2>
          <div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    tick={{ fill: 'white' }}
                  />
                  <YAxis tick={{ fill: 'white' }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  
                  {/* Historical Data */}
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Historical Demand"
                    dot={false}
                  />
                  
                  {/* Forecast */}
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Forecasted Demand"
                    dot={false}
                  />
                  
                  {/* Confidence Interval */}
                  {forecastData?.confidence_intervals && (
                    <Area
                      dataKey="upper_bound"
                      stackId="confidence"
                      stroke="none"
                      fill="#82ca9d"
                      fillOpacity={0.1}
                      name="Confidence Interval"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Generate a forecast to see the chart
              </div>
            )}
          </div>
        </div>

        {/* Model Performance */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Model Performance Metrics</h2>
          <div>
            {forecastData?.model_performance ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(forecastData.model_performance).map(([model, metrics]) => (
                  <div key={model} className="p-4 border border-white/20 rounded-lg bg-white/5">
                    <h3 className="font-semibold capitalize mb-2 text-white">{model}</h3>
                    {typeof metrics === 'object' && metrics !== null ? (
                      <div className="space-y-1">
                        {Object.entries(metrics).map(([metric, value]) => (
                          <div key={metric} className="flex justify-between text-sm">
                            <span className="text-gray-300">{metric.toUpperCase()}:</span>
                            <span className="font-medium text-white">{typeof value === 'number' ? value.toFixed(4) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">{String(metrics)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300">Generate a forecast to see performance metrics</p>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Trend Analysis</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Current Trend:</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Increasing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Seasonality:</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">Weekly Pattern</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Forecast Accuracy:</span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">95.2%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <p className="text-sm font-medium text-blue-300">Inventory Optimization</p>
                <p className="text-xs text-blue-400">Increase stock by 15% for next week</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-green-300">Demand Spike Alert</p>
                <p className="text-xs text-green-400">Prepare for 25% demand increase</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-300">Seasonal Adjustment</p>
                <p className="text-xs text-yellow-400">Adjust pricing for peak season</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;