// @jsxImportSource react
import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Leaf, 
  Clock, 
  Target, 
  Award,
  Zap,
  Globe,
  Smartphone,
  Store,
  Monitor,
  Handshake,
  Filter,
  Calendar,
  PieChart,
  Activity
} from 'lucide-react';

interface ChannelMetrics {
  channel: string;
  label: string;
  color: string;
  totalOrders: number;
  completedOrders: number;
  conversionRate: number;
  averageOrderValue: number;
  carbonFootprint: number;
  greenDeliveryCount: number;
}

interface CustomerJourney {
  totalCustomers: number;
  repeatCustomers: number;
  averageOrdersPerCustomer: number;
  channelSwitching: { [key: string]: number };
  peakHours: string[];
  topProducts: { name: string; count: number }[];
  sustainabilityMetrics: {
    totalGreenDeliveries: number;
    totalCarbonFootprint: number;
    averageEfficiencyScore: number;
  };
}

interface ChannelPerformance {
  channel: string;
  label: string;
  color: string;
  metrics: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    conversionRate: number;
    cancellationRate: number;
    averageProcessingTime: number;
    averageOrderValue: number;
    greenDeliveryRate: number;
    carbonFootprint: number;
  };
}

interface SustainabilityReport {
  period: string;
  overview: {
    totalOrders: number;
    greenDeliveries: number;
    greenDeliveryRate: number;
    totalCarbonFootprint: number;
    averageCarbonPerOrder: number;
    totalEnergyUsage: number;
    averageEfficiencyScore: number;
  };
  byChannel: {
    channel: string;
    label: string;
    totalOrders: number;
    greenDeliveries: number;
    greenDeliveryRate: number;
    carbonFootprint: number;
    energyUsage: number;
  }[];
  trends: {
    dailyCarbonFootprint: { date: string; value: number }[];
    dailyGreenDeliveryRate: { date: string; value: number }[];
    topSustainableProducts: { name: string; greenRate: number; avgCarbon: number }[];
  };
  recommendations: string[];
}

export default function OmnichannelAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [sustainabilityReport, setSustainabilityReport] = useState<SustainabilityReport | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7d');
  const [selectedComparison, setSelectedComparison] = useState<string>('conversion');
  const [loading, setLoading] = useState<boolean>(true);

  const periods = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const comparisons = [
    { value: 'conversion', label: 'Conversion Rate', icon: Target },
    { value: 'volume', label: 'Order Volume', icon: BarChart3 },
    { value: 'value', label: 'Average Order Value', icon: TrendingUp },
    { value: 'sustainability', label: 'Green Delivery Rate', icon: Leaf }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  useEffect(() => {
    fetchChannelPerformance();
  }, [selectedComparison]);

  useEffect(() => {
    fetchSustainabilityReport();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/omnichannel/analytics?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelPerformance = async () => {
    try {
      const response = await fetch(`/api/omnichannel/channels/performance?compare=${selectedComparison}`);
      if (response.ok) {
        const data = await response.json();
        setChannelPerformance(data.channels);
      }
    } catch (error) {
      console.error('Failed to fetch channel performance:', error);
    }
  };

  const fetchSustainabilityReport = async () => {
    try {
      const response = await fetch('/api/omnichannel/sustainability?period=30d');
      if (response.ok) {
        const data = await response.json();
        setSustainabilityReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch sustainability report:', error);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'online': return <Monitor className="w-4 h-4" />;
      case 'in-store': return <Store className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'partner': return <Handshake className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 text-white p-6 rounded-lg">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Channel Analytics
          </h2>
          <p className="text-gray-400 mt-1">Comprehensive insights across all customer touchpoints</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.summary.totalOrders}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold">${analytics.summary.totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Order Value</p>
                <p className="text-2xl font-bold">${analytics.summary.averageOrderValue.toFixed(0)}</p>
              </div>
              <Target className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.summary.overallConversionRate.toFixed(1)}%</p>
              </div>
              <Award className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Channel Performance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Channel Performance
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedComparison}
              onChange={(e) => setSelectedComparison(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm"
            >
              {comparisons.map(comp => (
                <option key={comp.value} value={comp.value}>{comp.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {channelPerformance.map((channel, index) => (
            <motion.div
              key={channel.channel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700 p-4 rounded-lg border border-gray-600"
            >
              <div className="flex items-center gap-2 mb-3">
                {getChannelIcon(channel.channel)}
                <span className="font-semibold" style={{ color: channel.color }}>
                  {channel.label}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Orders:</span>
                  <span className="font-semibold">{channel.metrics.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Conversion:</span>
                  <span className="font-semibold text-green-400">
                    {channel.metrics.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Value:</span>
                  <span className="font-semibold">${channel.metrics.averageOrderValue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Green Rate:</span>
                  <span className="font-semibold text-green-400">
                    {channel.metrics.greenDeliveryRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Customer Journey Insights */}
      {analytics?.customerJourney && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            Customer Journey Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Customer Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Customers:</span>
                    <span className="font-semibold">{analytics.customerJourney.totalCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Repeat Customers:</span>
                    <span className="font-semibold">{analytics.customerJourney.repeatCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Orders/Customer:</span>
                    <span className="font-semibold">{analytics.customerJourney.averageOrdersPerCustomer.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Peak Hours</h4>
                <div className="space-y-1 text-sm">
                  {analytics.customerJourney.peakHours.map((hour: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Top Products</h4>
                <div className="space-y-1 text-sm">
                  {analytics.customerJourney.topProducts.slice(0, 5).map((product: { name: string; count: number }, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="truncate">{product.name}</span>
                      <span className="font-semibold">{product.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sustainability Report */}
      {sustainabilityReport && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-green-400" />
            Sustainability Report
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Green Deliveries</p>
                  <p className="text-2xl font-bold text-green-400">
                    {sustainabilityReport.overview.greenDeliveries}
                  </p>
                </div>
                <Leaf className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Green Rate</p>
                  <p className="text-2xl font-bold text-green-400">
                    {sustainabilityReport.overview.greenDeliveryRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Carbon Footprint</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {sustainabilityReport.overview.totalCarbonFootprint.toFixed(1)}kg
                  </p>
                </div>
                <Activity className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Efficiency Score</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {sustainabilityReport.overview.averageEfficiencyScore.toFixed(1)}/100
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Sustainability Recommendations */}
          {sustainabilityReport.recommendations.length > 0 && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                Recommendations
              </h4>
              <div className="space-y-2">
                {sustainabilityReport.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 