import React, { useState } from 'react';
import { apiService } from '../services/api';

const RouteOptimizer: React.FC = () => {
  const [stops, setStops] = useState<string[]>(['', '']);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiService.optimizeRoute(stops);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Route optimization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-4">Route Optimizer</h2>
      <div className="space-y-2 mb-4">
        {stops.map((stop, idx) => (
          <input
            key={idx}
            value={stop}
            onChange={e => {
              const newStops = [...stops];
              newStops[idx] = e.target.value;
              setStops(newStops);
            }}
            placeholder={`Stop ${idx + 1} (address or lat,lng)`}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-2"
          />
        ))}
        <button
          className="px-4 py-2 bg-blue-600 rounded mr-2"
          onClick={() => setStops([...stops, ''])}
        >Add Stop</button>
        <button
          className="px-4 py-2 bg-green-600 rounded"
          onClick={handleOptimize}
          disabled={loading || stops.length < 2 || stops.some(s => !s)}
        >{loading ? 'Optimizing...' : 'Optimize Route'}</button>
      </div>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {result && (
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Optimized Route</h3>
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizer; 