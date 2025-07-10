import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_name: string;
  inventory_category: string;
  timestamp: string;
}

interface VisionResults {
  detections: Detection[];
  inventory_analysis: {
  total_items: number;
  category_breakdown: Record<string, number>;
  item_details: Record<string, any>;
  detections: Detection[];
  timestamp: string;
  };
  anomalies: any[];
  annotated_frame?: string;
  timestamp: string;
}

interface InventoryUpdate {
  current_inventory: Record<string, number>;
  changes: {
    category_changes: Record<string, number>;
    stockout_detected: string[];
    restock_detected: string[];
    significant_changes: any[];
  };
  alerts: any[];
  analytics: any;
  timestamp: string;
}

interface VideoStreamData {
  detections: Detection[];
  frame: string;
  frame_count: number;
  total_frames: number;
  video_source: string;
  processing_time: number;
  fps: number;
  timestamp: number;
  error?: string;
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
  const [currentVideoInfo, setCurrentVideoInfo] = useState<{
    source: string;
    frame: number;
    totalFrames: number;
    fps: number;
    processingTime: number;
  } | null>(null);
  const [playbackControls, setPlaybackControls] = useState({
    fps: 60, // 60 is smooth, universal, and low-lag for most displays
    loop: true,
    isPlaying: false
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const videoImageRef = useRef<HTMLImageElement>(null);

  // API base URL
  const API_BASE = 'http://localhost:8001';

  useEffect(() => {
    // Fetch available videos on mount
    fetchAvailableVideos();
    
    return () => {
      stopVideoStream();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const fetchAvailableVideos = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vision/demo-videos`);
      setAvailableVideos(response.data);
      if (response.data.length > 0) {
        setSelectedVideo(response.data[0].value);
      }
    } catch (err) {
      console.error('Failed to fetch demo videos:', err);
      setError('Failed to load demo videos');
    }
  };

  const startDemoStream = () => {
    if (!selectedVideo) {
      setError('Please select a demo video first');
      return;
    }
    setIsLoading(true);
    setError(null);
    setStreamStatus('Starting...');
    stopVideoStream();
    // Open EventSource with query params
    const url = `${API_BASE}/vision/stream/demo?video_source=${encodeURIComponent(selectedVideo)}&fps=${playbackControls.fps}&loop=${playbackControls.loop}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        const data: VideoStreamData = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          setStreamStatus('Error');
          setIsStreaming(false);
          setIsLoading(false);
          es.close();
          return;
        }
        setCurrentVideoInfo({
          source: data.video_source,
          frame: data.frame_count,
          totalFrames: data.total_frames,
          fps: data.fps,
          processingTime: data.processing_time
        });
        setVisionResults({
          detections: data.detections || [],
          inventory_analysis: {
            total_items: data.detections?.length || 0,
            category_breakdown: {},
            item_details: {},
            detections: data.detections || [],
            timestamp: new Date().toISOString()
          },
          anomalies: [],
          annotated_frame: data.frame,
          timestamp: new Date().toISOString()
        });
        if (data.frame) {
          updateCanvas(data.frame);
        }
        setIsStreaming(true);
        setStreamStatus('Running');
        setIsLoading(false); // Set loading false on first frame
      } catch (error) {
        setError('Failed to parse stream data');
        setStreamStatus('Error');
        setIsStreaming(false);
        setIsLoading(false);
        es.close();
      }
    };
    es.onerror = (err) => {
      setError('Stream connection failed');
      setStreamStatus('Connection Error');
      setIsStreaming(false);
      setIsLoading(false);
      es.close();
    };
  };

  const stopVideoStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus('Stopped');
    setPlaybackControls(prev => ({ ...prev, isPlaying: false }));
    setCurrentVideoInfo(null);
  };

  const updateCanvas = (frameData: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the video frame
      ctx.drawImage(img, 0, 0);
      
      // Draw detection overlays
      if (visionResults?.detections) {
        visionResults.detections.forEach(detection => {
          const [x1, y1, x2, y2] = detection.bbox;
          const confidence = detection.confidence;
          const className = detection.class_name;
          
          // Choose color based on confidence
          const color = confidence > 0.7 ? '#00ff00' : confidence > 0.5 ? '#ffff00' : '#ff0000';
          
          // Draw bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          
          // Draw label
          ctx.fillStyle = color;
          ctx.font = '14px Arial';
          ctx.fillText(`${className}: ${(confidence * 100).toFixed(1)}%`, x1, y1 - 5);
        });
      }
    };
    
    img.src = `data:image/jpeg;base64,${frameData}`;
  };

  const togglePlayback = () => {
    if (isStreaming) {
      stopVideoStream();
    } else {
      startDemoStream();
    }
  };

  const changeFPS = (newFPS: number) => {
    setPlaybackControls(prev => ({ ...prev, fps: newFPS }));
    if (isStreaming) {
      // Restart stream with new FPS
      stopVideoStream();
      setTimeout(() => startDemoStream(), 100);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Analytics</h1>
          <p className="text-gray-600">Real-time object detection and inventory tracking</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">FPS:</label>
            <select
              value={playbackControls.fps}
              onChange={(e) => changeFPS(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
              disabled={isStreaming}
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
              <option value={120}>120</option>
              <option value={144}>144</option>
              <option value={240}>240</option>
              <option value={360}>360</option>
              <option value={480}>480</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="loop"
              checked={playbackControls.loop}
              onChange={(e) => setPlaybackControls(prev => ({ ...prev, loop: e.target.checked }))}
              disabled={isStreaming}
              className="rounded"
            />
            <label htmlFor="loop" className="text-sm font-medium">Loop</label>
          </div>
          
          <button
            onClick={togglePlayback}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Starting...' : isStreaming ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Status and Error Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            streamStatus === 'Running' ? 'bg-green-100 text-green-800' :
            streamStatus === 'Stopped' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {streamStatus}
          </span>
          
          {currentVideoInfo && (
            <div className="text-sm text-gray-600">
              <span>Video: {currentVideoInfo.source}</span>
              <span className="mx-2">|</span>
              <span>Frame: {currentVideoInfo.frame}/{currentVideoInfo.totalFrames}</span>
              <span className="mx-2">|</span>
              <span>FPS: {currentVideoInfo.fps}</span>
              <span className="mx-2">|</span>
              <span>Processing: {currentVideoInfo.processingTime.toFixed(2)}ms</span>
            </div>
          )}
      </div>

      {error && (
          <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">
          {error}
        </div>
      )}
      </div>

      {/* Video Selection */}
      <div className="flex items-center space-x-4">
        <label className="font-medium">Select Demo Video:</label>
        <select
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          className="border rounded px-3 py-2 min-w-[200px]"
          disabled={isStreaming}
        >
          {availableVideos.map(video => (
            <option key={video.value} value={video.value}>
              {video.label}
            </option>
          ))}
        </select>
        
        <button
          onClick={startDemoStream}
          disabled={isLoading || !selectedVideo || isStreaming}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Start Demo Stream
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'live', label: 'Live Feed' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'anomalies', label: 'Anomalies' },
            { id: 'analytics', label: 'Analytics' }
          ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
        </nav>
      </div>

      <div className="space-y-6">
        {/* Live Feed Tab */}
        {selectedTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                className="w-full h-96 object-contain bg-black rounded"
                style={{ maxHeight: '500px' }}
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

            {/* Detection Details */}
            {visionResults?.detections && visionResults.detections.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Detections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visionResults.detections.slice(0, 9).map((detection, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {detection.class_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Confidence: {(detection.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          detection.confidence > 0.7 ? 'bg-green-100 text-green-800' :
                          detection.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {detection.inventory_category}
                        </div>
                      </div>
                    </div>
                  ))}
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
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Current Inventory</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(inventoryUpdate.current_inventory).map(([category, count]) => (
                      <div key={category} className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{count}</div>
                        <div className="text-sm text-blue-600 capitalize">{category}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {inventoryUpdate.alerts.length > 0 && (
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Alerts</h3>
                    <div className="space-y-2">
                      {inventoryUpdate.alerts.map((alert, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-red-800">{alert.message}</div>
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
          <div className="space-y-6">
            {visionResults?.anomalies && visionResults.anomalies.length > 0 ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Detected Anomalies</h3>
              <div className="space-y-4">
                {visionResults.anomalies.map((anomaly, index) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="font-medium text-red-800">{anomaly.type}</div>
                      <div className="text-sm text-red-600 mt-1">{anomaly.description}</div>
                    </div>
                  ))}
                  </div>
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
      </div>
    </div>
  );
};

export default VideoAnalyticsPanel; 