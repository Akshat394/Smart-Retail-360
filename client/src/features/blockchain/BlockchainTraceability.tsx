import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, Clock, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface TraceData {
  productId: string;
  productName: string;
  traceHistory: TraceEvent[];
  authenticity: boolean;
  carbonFootprint: number;
  lastUpdated: string;
}

interface TraceEvent {
  timestamp: string;
  location: string;
  action: string;
  actor: string;
  blockchainHash: string;
  verified: boolean;
}

const BlockchainTraceability: React.FC = () => {
  const [productId, setProductId] = useState('');
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { showNotification } = useNotification();

  const handleSearch = async () => {
    if (!productId.trim()) {
      showNotification({ message: 'Please enter a product ID', type: 'error', orderId: 0, customerName: '' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/blockchain/trace/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setTraceData(data);
        setSearchHistory(prev => [productId, ...prev.filter(id => id !== productId)].slice(0, 5));
        showNotification({ message: 'Product trace data retrieved successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      showNotification({ message: 'Failed to trace product: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const verifyAuthenticity = async () => {
    if (!productId) return;
    
    try {
      const response = await fetch(`/api/blockchain/authenticity/${productId}`);
      const data = await response.json();
      showNotification({ 
        message: data.authentic ? 'Product is authentic!' : 'Product authenticity verification failed', 
        type: data.authentic ? 'success' : 'error', 
        orderId: 0, 
        customerName: '' 
      });
    } catch (error) {
      showNotification({ message: 'Failed to verify authenticity', type: 'error', orderId: 0, customerName: '' });
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Package className="text-blue-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Blockchain Traceability</h2>
        </div>

        {/* Search Section */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter Product ID (e.g., PROD-12345)"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-400 text-sm">Recent searches:</span>
              {searchHistory.map((id, index) => (
                <button
                  key={index}
                  onClick={() => setProductId(id)}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trace Results */}
        {traceData && (
          <div className="space-y-6">
            {/* Product Overview */}
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{traceData.productName}</h3>
                  <p className="text-gray-400">ID: {traceData.productId}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{traceData.carbonFootprint}kg</div>
                    <div className="text-xs text-gray-400">CO2 Footprint</div>
                  </div>
                  <button
                    onClick={verifyAuthenticity}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify Authenticity
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {traceData.authenticity ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={traceData.authenticity ? 'text-green-400' : 'text-red-400'}>
                    {traceData.authenticity ? 'Authentic' : 'Verification Failed'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  Last updated: {new Date(traceData.lastUpdated).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Trace History */}
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Supply Chain Trace History</h3>
              <div className="space-y-4">
                {(traceData.traceHistory && Array.isArray(traceData.traceHistory) ? traceData.traceHistory : []).map((event, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{event.action}</h4>
                        <div className="flex items-center gap-2">
                          {event.verified ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {event.actor}
                        </div>
                      </div>
                      <div className="mt-2">
                        <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                          Hash: {event.blockchainHash.slice(0, 16)}...
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demo Data */}
        {!traceData && !loading && (
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No Product Traced</h3>
            <p className="text-gray-500">
              Enter a product ID above to view its complete blockchain trace history
            </p>
            <div className="mt-4 text-sm text-gray-600">
              <p>Try demo IDs: PROD-12345, PROD-67890, PROD-11111</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainTraceability; 