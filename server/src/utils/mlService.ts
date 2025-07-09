// @ts-ignore
import fetch from 'node-fetch';

const ML_SERVICE_URL = 'http://localhost:8000';

export async function getMLAnomalies(data: number[], params: any = {}) {
  const res = await fetch(`${ML_SERVICE_URL}/detect-anomalies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, params }),
  });
  if (!res.ok) throw new Error('ML service /detect-anomalies error');
  return res.json();
}

export async function getMLExplanation(data: number[], params: any = {}) {
  const res = await fetch(`${ML_SERVICE_URL}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, params }),
  });
  if (!res.ok) throw new Error('ML service /explain error');
  return res.json();
}

export async function getMLRouteRecommendation(graph: any, start: string, end: string) {
  const res = await fetch(`${ML_SERVICE_URL}/recommend/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph, start, end }),
  });
  if (!res.ok) throw new Error('ML service /recommend/route error');
  return res.json();
}

export async function getMLStockOptimization(supply: number[], demand: number[], cost_matrix: number[][]) {
  const res = await fetch(`${ML_SERVICE_URL}/optimize/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supply, demand, cost_matrix }),
  });
  if (!res.ok) throw new Error('ML service /optimize/stock error');
  return res.json();
} 