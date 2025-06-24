// @ts-ignore
import fetch from 'node-fetch';

const ML_SERVICE_URL = 'http://localhost:8000';

export async function getMLPrediction(data: number[], params: any = {}) {
  const res = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, params }),
  });
  if (!res.ok) throw new Error('ML service /predict error');
  return res.json();
}

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