import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_name: string;
  inventory_category: string;
  timestamp: string;
}

interface InventoryAnalysis {
  total_items: number;
  category_breakdown: Record<string, number>;
  item_details: Record<string, any>;
  detections: Detection[];
  timestamp: string;
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
}

interface VisionResults {
  detections: Detection[];
  inventory_analysis: InventoryAnalysis;
  anomalies: Anomaly[];
  annotated_frame?: string;
  timestamp: string;
}

interface InventoryUpdate {
  current_inventory: Record<string, number>;
  changes: {
    category_changes: Record<string, any>;
    stockout_detected: string[];
    restock_detected: string[];
    significant_changes: any[];
  };
  alerts: any[];
  analytics: any;
  timestamp: string;
}

const VideoAnalyticsPanel: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [visionResults, setVisionResults] = useState<VisionResults | null>(null);
  const [inventoryUpdate, setInventoryUpdate] = useState<InventoryUpdate | null>(null);
  const [selectedTab, setSelectedTab] = useState<'live' | 'inventory' | 'anomalies' | 'analytics'>('live');
  const [streamStatus, setStreamStatus] = useState<string>('Stopped');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableVideos, setAvailableVideos] = useState<{label: string, value: string}[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const eventSourceRef = useRef<EventSource | null>(null);

  // API base URL
  const API_BASE = 'http://localhost:8001';

  useEffect(() => {
    // Start demo stream on component mount
    startVideoStream();
    
    // Fetch available videos on mount
    axios.get(`${API_BASE}/vision/demo-videos`).then(res => {
      setAvailableVideos(res.data);
      if (res.data.length > 0) setSelectedVideo(res.data[0].value);
    });
    
    return () => {
      stopVideoStream();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startVideoStream = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Always try demo mode first
      const response = await axios.post(`${API_BASE}/vision/stream`, {
        action: 'start',
        video_source: 'demo'
      });
      if (response.data.status === 'success') {
        setIsStreaming(true);
        setStreamStatus('Running (Demo)');
        startResultsPolling();
      } else {
        setError('Failed to start demo video stream');
        setStreamStatus('Demo Unavailable');
      }
    } catch (err) {
      // Fallback: show demo data even if backend is unavailable
      setIsStreaming(true);
      setStreamStatus('Running (Demo Fallback)');
      setError('Live stream unavailable. Showing demo data.');
      // Optionally, set static demo data here
      setVisionResults({
        detections: [],
        inventory_analysis: {
          total_items: 42,
          category_breakdown: { beverage: 10, food: 12, electronics: 20 },
          item_details: {},
          detections: [],
          timestamp: new Date().toISOString()
        },
        anomalies: [],
        timestamp: new Date().toISOString()
      });
      setInventoryUpdate({
        current_inventory: { beverage: 10, food: 12, electronics: 20 },
        changes: {
          category_changes: {},
          stockout_detected: [],
          restock_detected: [],
          significant_changes: []
        },
        alerts: [],
        analytics: {},
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopVideoStream = async () => {
    try {
      const response = await axios.post(`${API_BASE}/vision/stream`, {
        action: 'stop'
      });
      
      if (response.data.status === 'success') {
        setIsStreaming(false);
        setStreamStatus('Stopped');
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    } catch (err) {
      console.error('Stop stream error:', err);
    }
  };

  const startResultsPolling = () => {
    const pollResults = async () => {
      if (!isStreaming) return;
      
      try {
        const [resultsResponse, inventoryResponse] = await Promise.all([
          axios.get(`${API_BASE}/vision/latest`),
          axios.get(`${API_BASE}/vision/inventory`)
        ]);
        
        setVisionResults(resultsResponse.data);
        setInventoryUpdate(inventoryResponse.data);
        
        // Update canvas with annotated frame if available
        if (resultsResponse.data.annotated_frame) {
          updateCanvas(resultsResponse.data.annotated_frame);
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      // Continue polling
      animationRef.current = requestAnimationFrame(pollResults);
    };
    
    pollResults();
  };

  const updateCanvas = (base64Image: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${base64Image}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'beverage': 'bg-blue-500',
      'food': 'bg-red-500',
      'fruit': 'bg-green-500',
      'vegetable': 'bg-emerald-500',
      'electronics': 'bg-purple-500',
      'furniture': 'bg-yellow-500',
      'stationery': 'bg-indigo-500',
      'toys': 'bg-pink-500',
      'hygiene': 'bg-teal-500',
      'staff': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-400';
  };

  const startDemoStream = () => {
    setIsLoading(true);
    setError(null);
    setStreamStatus('Starting...');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    fetch(`${API_BASE}/vision/stream/demo`, {
      method: 'POST',
      body: JSON.stringify({ video_source: selectedVideo }),
      headers: { 'Content-Type': 'application/json' }
    });
    const es = new EventSource(`${API_BASE}/vision/stream/demo`);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        const { detections, frame } = JSON.parse(event.data);
        setVisionResults({
          detections: detections || [],
          inventory_analysis: {
            total_items: (detections && detections.length) || 0,
            category_breakdown: {},
            item_details: {},
            detections: detections || [],
            timestamp: new Date().toISOString()
          },
          anomalies: [],
          annotated_frame: frame,
          timestamp: new Date().toISOString()
        });
        setIsStreaming(true);
        setStreamStatus('Running (Demo)');
        if (frame) {
          updateCanvas(frame);
        }
      } catch (error) {
        console.error('Error parsing demo stream data:', error);
        setError('Failed to parse demo stream data');
        setStreamStatus('Demo Error');
        setIsStreaming(false);
      }
    };
    es.onerror = (err) => {
      setError('Failed to stream demo video');
      setStreamStatus('Demo Unavailable');
      setIsStreaming(false);
      es.close();
    };
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Video Analytics</h2>
          <p className="text-gray-600">Real-time computer vision for inventory tracking</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isStreaming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {streamStatus}
          </div>
          <button
            onClick={isStreaming ? stopVideoStream : startVideoStream}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isStreaming
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Loading...' : (isStreaming ? 'Stop Stream' : 'Start Stream')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'live', label: 'Live Feed', icon: '📹' },
          { id: 'inventory', label: 'Inventory', icon: '📦' },
          { id: 'anomalies', label: 'Anomalies', icon: '⚠️' },
          { id: 'analytics', label: 'Analytics', icon: '📊' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              selectedTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Live Feed Tab */}
        {selectedTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                className="w-full h-96 object-contain bg-black rounded"
                style={{ maxHeight: '400px' }}
              />
            </div>
            
            {visionResults && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Detections</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {visionResults.detections.length}
                  </div>
                  <p className="text-sm text-blue-600">Objects detected</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Inventory Items</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {visionResults.inventory_analysis.total_items || 0}
                  </div>
                  <p className="text-sm text-green-600">Total items tracked</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Anomalies</h3>
                  <div className="text-2xl font-bold text-red-600">
                    {visionResults.anomalies.length}
                  </div>
                  <p className="text-sm text-red-600">Issues detected</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {selectedTab === 'inventory' && (
          <div className="space-y-6">
            {inventoryUpdate ? (
              <>
                {/* Current Inventory */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Current Inventory</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(inventoryUpdate.current_inventory || {}).map(([category, count]) => (
                      <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getCategoryColor(category)}`}></div>
                        <div className="font-semibold text-lg">{count}</div>
                        <div className="text-sm text-gray-600 capitalize">{category}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Changes */}
                {inventoryUpdate.changes?.significant_changes?.length > 0 && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Changes</h3>
                    <div className="space-y-2">
                      {inventoryUpdate.changes.significant_changes.map((change: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium capitalize">{change.category}</span>
                          <span className={`font-semibold ${
                            change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {change.type === 'increase' ? '+' : ''}{change.change} ({change.change_percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {inventoryUpdate.alerts?.length > 0 && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
                    <div className="space-y-3">
                      {inventoryUpdate.alerts.map((alert: any, index: number) => (
                        <div key={index} className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                          alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                          'border-yellow-500 bg-yellow-50'
                        }`}>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No inventory data available. Start the video stream to see inventory tracking.
              </div>
            )}
          </div>
        )}

        {/* Anomalies Tab */}
        {selectedTab === 'anomalies' && (
          <div className="space-y-4">
            {visionResults?.anomalies && visionResults.anomalies.length > 0 ? (
              <div className="space-y-4">
                {visionResults.anomalies.map((anomaly, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    anomaly.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    anomaly.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                    anomaly.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold capitalize">{anomaly.type.replace('_', ' ')}</h4>
                        <p className="text-gray-700 mt-1">{anomaly.message}</p>
                        {anomaly.details && (
                          <div className="text-sm text-gray-600 mt-2">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(anomaly.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No anomalies detected. The system is running normally.
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            {inventoryUpdate?.analytics ? (
              <>
                {/* Detection Statistics */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Detection Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {inventoryUpdate.analytics.total_detections || 0}
                      </div>
                      <div className="text-sm text-blue-600">Total Detections</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {inventoryUpdate.analytics.unique_items_seen || 0}
                      </div>
                      <div className="text-sm text-green-600">Unique Items</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {inventoryUpdate.analytics.stockout_events_count || 0}
                      </div>
                      <div className="text-sm text-red-600">Stockout Events</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {inventoryUpdate.analytics.restock_events_count || 0}
                      </div>
                      <div className="text-sm text-yellow-600">Restock Events</div>
                    </div>
                  </div>
                </div>

                {/* Category Trends */}
                {inventoryUpdate.analytics.category_trends && Object.keys(inventoryUpdate.analytics.category_trends).length > 0 && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Category Trends</h3>
                    <div className="space-y-3">
                      {Object.entries(inventoryUpdate.analytics.category_trends).map(([category, trend]: [string, any]) => (
                        <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium capitalize">{category}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                              Current: {trend.current_count}
                            </span>
                            <span className={`text-sm font-medium ${
                              trend.trend_direction === 'increasing' ? 'text-green-600' :
                              trend.trend_direction === 'decreasing' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {trend.trend_direction}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No analytics data available. Start the video stream to see analytics.
              </div>
            )}
          </div>
        )}

        {/* Demo Video Selection */}
        <div className="mb-4">
          <label className="mr-2 font-medium">Select Demo Video:</label>
          <select
            value={selectedVideo}
            onChange={e => setSelectedVideo(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {availableVideos.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          <button
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={startDemoStream}
            disabled={isLoading || !selectedVideo}
          >
            Start Demo Stream
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalyticsPanel; 