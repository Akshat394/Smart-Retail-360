import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Zap, Package, RefreshCw, CheckCircle, Loader2, XCircle, Play } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';

interface Recommendation {
  type: string;
  message: string;
  actions: { label: string; action: string; productId?: number; location?: string }[];
  data: any;
}

interface ActionLog {
  type: string;
  message: string;
  time: string;
  result: 'success' | 'error';
  details?: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  anomaly: <AlertTriangle className="text-red-400 w-6 h-6" />,
  low_stock: <Package className="text-yellow-400 w-6 h-6" />,
  demand_spike: <Zap className="text-purple-400 w-6 h-6" />,
};

const actionEndpoint: Record<string, string> = {
  transfer: '/api/ai-action/transfer',
  purchase_order: '/api/ai-action/purchase_order',
  restock: '/api/ai-action/restock',
};

const AICommandCenterPanel: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [recentActions, setRecentActions] = useState<ActionLog[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { showNotification } = useNotification();

  const fetchRecs = () => {
    setLoading(true);
    fetch('/api/ai-recommendations')
      .then(res => res.json())
      .then(data => setRecommendations(data))
      .finally(() => setLoading(false));
  };

  // WebSocket for real-time updates
  useEffect(() => {
    fetchRecs();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws`;
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'inventory_update' || msg.type === 'data_update') {
          fetchRecs();
        }
      } catch {}
    };
    return () => wsRef.current?.close();
  }, []);

  const handleAction = async (rec: Recommendation, action: string, idx: number) => {
    const endpoint = actionEndpoint[action];
    if (!endpoint) return;
    setActionMsg(null);
    setErrorMsg(null);
    setActionLoading(idx);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: rec.data.id,
          location: rec.data.location,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setActionMsg(result.message);
        setRecentActions(prev => [{
          type: rec.type,
          message: `${action} for ${rec.data.productName || rec.data.id} at ${rec.data.location}`,
          time: new Date().toLocaleTimeString(),
          result: 'success' as 'success',
          details: result.message
        }, ...prev].slice(0, 5));
        // Animate removal
        setTimeout(() => {
          fetchRecs();
        }, 500);
        showNotification({ message: result.message, type: 'success', orderId: 0, customerName: '' });
      } else {
        setErrorMsg(result.error || 'Action failed');
        setRecentActions(prev => [{
          type: rec.type,
          message: `${action} for ${rec.data.productName || rec.data.id} at ${rec.data.location}`,
          time: new Date().toLocaleTimeString(),
          result: 'error' as 'error',
          details: result.error
        }, ...prev].slice(0, 5));
        showNotification({ message: result.error || 'Action failed', type: 'error', orderId: 0, customerName: '' });
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Action failed');
      setRecentActions(prev => [{
        type: rec.type,
        message: `${action} for ${rec.data.productName || rec.data.id} at ${rec.data.location}`,
        time: new Date().toLocaleTimeString(),
        result: 'error' as 'error',
        details: e.message
      }, ...prev].slice(0, 5));
      showNotification({ message: e.message || 'Action failed', type: 'error', orderId: 0, customerName: '' });
    }
    setTimeout(() => { setActionMsg(null); setErrorMsg(null); setActionLoading(null); }, 2500);
  };

  // Simulate Event for demo
  const handleSimulate = async () => {
    setLoading(true);
    try {
      await fetch('/api/ai-recommendations/simulate', { method: 'POST' });
      setTimeout(fetchRecs, 500);
    } catch {
      setErrorMsg('Failed to simulate event');
      showNotification({ message: 'Failed to simulate event', type: 'error', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="text-purple-400 w-8 h-8 animate-pulse" />
        <h2 className="text-2xl font-bold text-white">AI Command Center</h2>
        <button
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded shadow transition-all duration-200"
          onClick={handleSimulate}
          disabled={loading}
        >
          <Play className="w-4 h-4" /> Simulate Event
        </button>
      </div>
      {actionMsg && (
        <div className="mb-4 px-4 py-2 bg-green-700 text-white rounded shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" /> {actionMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 px-4 py-2 bg-red-700 text-white rounded shadow-lg flex items-center gap-2 animate-fade-in">
          <XCircle className="w-5 h-5" /> {errorMsg}
        </div>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-300"><Loader2 className="animate-spin" /> Loading recommendations...</div>
      ) : (
        <div className="space-y-6">
          {recommendations.length === 0 && (
            <div className="text-gray-400">No AI recommendations at this time. All systems normal!</div>
          )}
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center gap-4 transition-all duration-500 ${actionLoading === idx ? 'opacity-60' : 'opacity-100'}`}>
              <div className="flex-shrink-0">{typeIcon[rec.type] || <AlertTriangle className="text-gray-400 w-6 h-6" />}</div>
              <div className="flex-1">
                <div className="text-lg text-white font-semibold mb-1">{rec.message}</div>
                <div className="text-xs text-gray-400">Type: {rec.type.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                {rec.actions && rec.actions.length > 0 ? rec.actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(rec, a.action, idx)}
                    className={`px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm font-semibold shadow flex items-center gap-2 transition-all duration-200 ${actionLoading === idx ? 'opacity-60 cursor-not-allowed' : ''}`}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {a.label}
                  </button>
                )) : (
                  <span className="text-xs text-gray-400">No actions</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Recent Actions Log */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-blue-400" /> Recent Actions</h3>
        {recentActions.length === 0 ? (
          <div className="text-gray-400">No actions taken yet.</div>
        ) : (
          <ul className="space-y-2">
            {recentActions.map((log, i) => (
              <li key={i} className={`flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 border-l-4 ${log.result === 'success' ? 'border-green-500' : 'border-red-500'} animate-fade-in`}>
                {log.result === 'success' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <div className="flex-1">
                  <div className="text-white font-medium">{log.message}</div>
                  <div className="text-xs text-gray-400">{log.time}</div>
                  {log.details && <div className="text-xs text-gray-500">{log.details}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AICommandCenterPanel; 