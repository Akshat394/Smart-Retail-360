import React, { useState, useRef, useEffect } from 'react';

const SWAGGER_URL = '/api-docs';

const mockLogs = [
  { time: '2024-05-01T12:00:00Z', pluginId: 'abc123', data: { event: 'order.created', orderId: 42 } },
  { time: '2024-05-01T12:01:00Z', pluginId: 'xyz789', data: { event: 'inventory.low', product: 'Milk' } },
];

const DeveloperPortal: React.FC = () => {
  const [tab, setTab] = useState<'docs' | 'try' | 'keys' | 'plugins' | 'logs'>('docs');

  // Try It state
  const [tryEndpoint, setTryEndpoint] = useState('/api/orders/1/status');
  const [tryMethod, setTryMethod] = useState<'GET' | 'POST'>('GET');
  const [tryApiKey, setTryApiKey] = useState('');
  const [tryBody, setTryBody] = useState('{}');
  const [tryResult, setTryResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // API Key Management state
  const [apiKeys, setApiKeys] = useState<{ apiKey: string; userId: string; role: string; createdAt: string }[]>([]);
  const [newKeyUserId, setNewKeyUserId] = useState('');
  const [newKeyRole, setNewKeyRole] = useState('user');
  const [keyGenLoading, setKeyGenLoading] = useState(false);
  const [keyGenError, setKeyGenError] = useState('');

  // Plugin state
  const [plugins, setPlugins] = useState<{ pluginId: string; name: string; registeredAt: string }[]>([]);
  const [pluginName, setPluginName] = useState('');
  const [pluginRegLoading, setPluginRegLoading] = useState(false);
  const [pluginRegError, setPluginRegError] = useState('');

  // Logs state
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsType, setLogsType] = useState<'siem' | 'pii'>('siem');

  // Fetch logs from backend (if available)
  useEffect(() => {
    if (tab === 'logs') {
      setLogsLoading(true);
      fetch(`/logs/security/${logsType === 'siem' ? 'siem.log' : 'pii_access.log'}`)
        .then(r => r.ok ? r.text() : '')
        .then(text => {
          setLogs(text ? text.trim().split('\n').reverse() : []);
        })
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [tab, logsType]);

  // Try It handler
  const handleTryIt = async () => {
    setLoading(true);
    setTryResult('');
    try {
      const res = await fetch(tryEndpoint, {
        method: tryMethod,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': tryApiKey,
        },
        ...(tryMethod === 'POST' ? { body: tryBody } : {}),
      });
      const text = await res.text();
      setTryResult(text);
    } catch (e) {
      setTryResult('Error: ' + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  // API Key generation handler
  const handleGenerateKey = async () => {
    setKeyGenLoading(true);
    setKeyGenError('');
    try {
      const res = await fetch('/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newKeyUserId, role: newKeyRole })
      });
      const data = await res.json();
      if (data.apiKey) {
        setApiKeys(keys => [{ apiKey: data.apiKey, userId: newKeyUserId, role: newKeyRole, createdAt: new Date().toISOString() }, ...keys]);
        setNewKeyUserId('');
      } else {
        setKeyGenError(data.error || 'Failed to generate API key');
      }
    } catch (e) {
      setKeyGenError('Failed to generate API key');
    } finally {
      setKeyGenLoading(false);
    }
  };

  // Plugin registration handler
  const handleRegisterPlugin = async () => {
    setPluginRegLoading(true);
    setPluginRegError('');
    try {
      const res = await fetch('/plugin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginName })
      });
      const data = await res.json();
      if (data.pluginId) {
        setPlugins(list => [{ pluginId: data.pluginId, name: pluginName, registeredAt: new Date().toISOString() }, ...list]);
        setPluginName('');
      } else {
        setPluginRegError(data.error || 'Failed to register plugin');
      }
    } catch (e) {
      setPluginRegError('Failed to register plugin');
    } finally {
      setPluginRegLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">Developer Portal</h2>
      <div className="flex flex-wrap space-x-2 mb-6">
        <button className={`px-4 py-2 rounded-t-lg font-semibold ${tab === 'docs' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`} onClick={() => setTab('docs')}>API Docs</button>
        <button className={`px-4 py-2 rounded-t-lg font-semibold ${tab === 'try' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`} onClick={() => setTab('try')}>Try It</button>
        <button className={`px-4 py-2 rounded-t-lg font-semibold ${tab === 'keys' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`} onClick={() => setTab('keys')}>API Keys</button>
        <button className={`px-4 py-2 rounded-t-lg font-semibold ${tab === 'plugins' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`} onClick={() => setTab('plugins')}>Plugins</button>
        <button className={`px-4 py-2 rounded-t-lg font-semibold ${tab === 'logs' ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`} onClick={() => setTab('logs')}>Logs</button>
      </div>
      <div className="bg-gray-800 rounded-b-xl p-6 min-h-[400px]">
        {tab === 'docs' && (
          <iframe
            ref={iframeRef}
            src={SWAGGER_URL}
            title="API Docs"
            className="w-full min-h-[600px] bg-white rounded-lg border-2 border-gray-700"
            style={{ height: '70vh' }}
          />
        )}
        {tab === 'try' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <select value={tryMethod} onChange={e => setTryMethod(e.target.value as 'GET' | 'POST')} className="bg-gray-700 text-white rounded px-2 py-1">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                className="flex-1 bg-gray-700 text-white rounded px-2 py-1"
                value={tryEndpoint}
                onChange={e => setTryEndpoint(e.target.value)}
                placeholder="Endpoint (e.g. /api/orders/1/status)"
              />
              <input
                className="bg-gray-700 text-white rounded px-2 py-1 w-48"
                value={tryApiKey}
                onChange={e => setTryApiKey(e.target.value)}
                placeholder="API Key"
              />
            </div>
            {tryMethod === 'POST' && (
              <textarea
                className="w-full bg-gray-700 text-white rounded px-2 py-1 min-h-[80px]"
                value={tryBody}
                onChange={e => setTryBody(e.target.value)}
                placeholder="Request body (JSON)"
              />
            )}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold"
              onClick={handleTryIt}
              disabled={loading}
            >{loading ? 'Sending...' : 'Send Request'}</button>
            <div className="bg-gray-900 rounded p-4 mt-2 text-green-300 whitespace-pre-wrap min-h-[80px]">
              {tryResult}
            </div>
          </div>
        )}
        {tab === 'keys' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-2">API Key Management</h3>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <input
                className="bg-gray-700 text-white rounded px-2 py-1"
                value={newKeyUserId}
                onChange={e => setNewKeyUserId(e.target.value)}
                placeholder="User ID"
              />
              <select value={newKeyRole} onChange={e => setNewKeyRole(e.target.value)} className="bg-gray-700 text-white rounded px-2 py-1">
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="user">user</option>
                <option value="guest">guest</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold" onClick={handleGenerateKey} disabled={keyGenLoading || !newKeyUserId}>{keyGenLoading ? 'Generating...' : 'Generate API Key'}</button>
            </div>
            {keyGenError && <div className="text-red-400 mb-2">{keyGenError}</div>}
            <div className="space-y-2">
              {apiKeys.length === 0 && <div className="text-gray-400">No API keys generated yet.</div>}
              {apiKeys.map((key, i) => (
                <div key={i} className="bg-gray-700 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-green-300 font-mono break-all">{key.apiKey}</div>
                    <div className="text-xs text-gray-400">User: {key.userId} | Role: {key.role} | Created: {new Date(key.createdAt).toLocaleString()}</div>
                  </div>
                  <button className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold" onClick={() => navigator.clipboard.writeText(key.apiKey)}>Copy</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'plugins' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-2">Plugin Registration</h3>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <input
                className="bg-gray-700 text-white rounded px-2 py-1"
                value={pluginName}
                onChange={e => setPluginName(e.target.value)}
                placeholder="Plugin Name"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold" onClick={handleRegisterPlugin} disabled={pluginRegLoading || !pluginName}>{pluginRegLoading ? 'Registering...' : 'Register Plugin'}</button>
            </div>
            {pluginRegError && <div className="text-red-400 mb-2">{pluginRegError}</div>}
            <div className="space-y-2">
              {plugins.length === 0 && <div className="text-gray-400">No plugins registered yet.</div>}
              {plugins.map((p, i) => (
                <div key={i} className="bg-gray-700 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-blue-300 font-mono break-all">{p.pluginId}</div>
                    <div className="text-xs text-gray-400">Name: {p.name} | Registered: {new Date(p.registeredAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'logs' && (
          <div>
            <div className="flex gap-2 mb-2">
              <button className={`px-3 py-1 rounded ${logsType === 'siem' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => setLogsType('siem')}>SIEM Logs</button>
              <button className={`px-3 py-1 rounded ${logsType === 'pii' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => setLogsType('pii')}>PII Access Logs</button>
            </div>
            {logsLoading ? <div className="text-gray-400">Loading logs...</div> : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {logs.length === 0 && <div className="text-gray-400">No logs found.</div>}
                {logs.map((line, i) => (
                  <div key={i} className="bg-gray-700 rounded p-3 text-xs font-mono text-green-200">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperPortal; 