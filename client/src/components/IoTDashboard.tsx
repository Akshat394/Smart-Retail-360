import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface IoTData {
  zone_id: string;
  temperature: number;
  humidity: number;
  vibration: number;
  timestamp: string;
}

const ZONES = ['A', 'B', 'C'];
const ALL_ZONES = 'ALL';

function getHealthColor(temp: number, vib: number) {
  if (temp > 28 || vib > 1.5) return 'bg-red-500';
  if (temp > 24 || vib > 1.0) return 'bg-yellow-500';
  return 'bg-green-500';
}

const IoTDashboard: React.FC = () => {
  const [latest, setLatest] = useState<{ [zone: string]: IoTData | null }>({});
  const [history, setHistory] = useState<{ [zone: string]: IoTData[] }>({});
  const [selectedZone, setSelectedZone] = useState<string>(ALL_ZONES);
  const [historyLimit, setHistoryLimit] = useState<number>(10);
  const [tempThreshold, setTempThreshold] = useState<number>(28);
  const [vibThreshold, setVibThreshold] = useState<number>(1.5);

  useEffect(() => {
    const fetchData = async () => {
      const latestRes = await fetch('/api/iot/live');
      const latestData: IoTData[] = await latestRes.json();
      const latestMap: { [zone: string]: IoTData | null } = {};
      for (const zone of ZONES) {
        latestMap[zone] = latestData.find(d => d.zone_id === zone) || null;
      }
      setLatest(latestMap);
      const hist: { [zone: string]: IoTData[] } = {};
      for (const zone of ZONES) {
        const res = await fetch(`/api/iot/history?zone=${zone}&limit=${historyLimit}`);
        hist[zone] = await res.json();
      }
      setHistory(hist);
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [historyLimit]);

  // Helper: check for sustained anomaly (3+ consecutive readings above threshold)
  function hasSustainedAnomaly(data: IoTData[] | undefined, key: 'temperature' | 'vibration', threshold: number) {
    if (!data || data.length < 3) return false;
    let count = 0;
    for (let i = 0; i < data.length; i++) {
      if ((data[i][key] as number) > threshold) {
        count++;
        if (count >= 3) return true;
      } else {
        count = 0;
      }
    }
    return false;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">IoT Zone Health</h3>
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <label htmlFor="zone-select" className="text-white text-sm">Select Zone:</label>
        <select
          id="zone-select"
          className="bg-gray-700 text-white rounded px-2 py-1"
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
        >
          <option value={ALL_ZONES}>All Zones</option>
          {ZONES.map(zone => (
            <option key={zone} value={zone}>Zone {zone}</option>
          ))}
        </select>
        <label htmlFor="history-limit" className="text-white text-sm ml-4">History:</label>
        <select
          id="history-limit"
          className="bg-gray-700 text-white rounded px-2 py-1"
          value={historyLimit}
          onChange={e => setHistoryLimit(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map(limit => (
            <option key={limit} value={limit}>{limit} records</option>
          ))}
        </select>
        <label htmlFor="temp-threshold" className="text-white text-sm ml-4">Temp Threshold:</label>
        <input
          id="temp-threshold"
          type="number"
          className="bg-gray-700 text-white rounded px-2 py-1 w-20"
          value={tempThreshold}
          min={0}
          max={100}
          step={0.1}
          onChange={e => setTempThreshold(Number(e.target.value))}
        />
        <label htmlFor="vib-threshold" className="text-white text-sm ml-4">Vibration Threshold:</label>
        <input
          id="vib-threshold"
          type="number"
          className="bg-gray-700 text-white rounded px-2 py-1 w-20"
          value={vibThreshold}
          min={0}
          max={10}
          step={0.01}
          onChange={e => setVibThreshold(Number(e.target.value))}
        />
      </div>
      <div className="mb-4">
        {(selectedZone === ALL_ZONES ? ZONES : [selectedZone]).map(zone => {
          const d = latest[zone];
          const histData = history[zone];
          if (!d) return null;
          const tempAnomaly = d.temperature > tempThreshold;
          const vibAnomaly = d.vibration > vibThreshold;
          const sustainedTemp = hasSustainedAnomaly(histData, 'temperature', tempThreshold);
          const sustainedVib = hasSustainedAnomaly(histData, 'vibration', vibThreshold);
          if (tempAnomaly || vibAnomaly || sustainedTemp || sustainedVib) {
            return (
              <div key={zone} className="bg-red-600 text-white p-2 rounded mb-2 animate-pulse">
                <strong>Alert:</strong> Zone {zone} anomaly detected!{' '}
                {tempAnomaly && <span>Temp: {d.temperature}°C ({'>'}{tempThreshold}) </span>}
                {vibAnomaly && <span>Vibration: {d.vibration} ({'>'}{vibThreshold}) </span>}
                {sustainedTemp && <span>Sustained high temperature detected! </span>}
                {sustainedVib && <span>Sustained high vibration detected! </span>}
              </div>
            );
          }
          return null;
        })}
      </div>
      <div className={selectedZone === ALL_ZONES ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "grid grid-cols-1 gap-4"}>
        {(selectedZone === ALL_ZONES ? ZONES : [selectedZone]).map(zone => {
          const d = latest[zone];
          const color = d ? getHealthColor(d.temperature, d.vibration) : 'bg-gray-500';
          return (
            <div key={zone} className={`rounded-lg p-4 ${color} text-white`}>
              <div className="font-bold text-xl mb-2">Zone {zone}</div>
              {d ? (
                <>
                  <div>Temp: {d.temperature}°C</div>
                  <div>Humidity: {d.humidity}%</div>
                  <div>Vibration: {d.vibration}</div>
                  <div className="mt-2">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={history[zone] || []}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="temperature" stroke="#fff" dot={false} name="Temp (°C)" />
                        <Line type="monotone" dataKey="humidity" stroke="#60A5FA" dot={false} name="Humidity (%)" />
                        <Line type="monotone" dataKey="vibration" stroke="#F59E42" dot={false} name="Vibration" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-white/80">Last 10 readings (Temp, Humidity, Vibration)</div>
                  </div>
                </>
              ) : (
                <div>No data</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IoTDashboard; 