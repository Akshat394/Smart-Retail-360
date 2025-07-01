import type { SystemMetrics } from '../../../shared/schema';

export interface Anomaly {
  metric: string;
  value: number;
  timestamp: Date;
  zScore: number;
  reason: string;
}

export function detectMetricAnomalies(metrics: SystemMetrics[]): Anomaly[] {
  if (!metrics || metrics.length < 5) return [];
  const metricKeys = [
    'forecastAccuracy',
    'onTimeDelivery',
    'carbonFootprint',
    'inventoryTurnover',
    'activeOrders',
    'routesOptimized',
    'anomaliesDetected',
    'costSavings',
  ];
  const anomalies: Anomaly[] = [];
  for (const key of metricKeys) {
    // Gather all values for this metric
    const values = metrics.map(m => Number(m[key as keyof SystemMetrics])).filter(v => !isNaN(v));
    if (values.length < 5) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    // Check the most recent value
    const latest = values[0];
    const z = std > 0 ? (latest - mean) / std : 0;
    if (Math.abs(z) > 2) {
      anomalies.push({
        metric: key,
        value: latest,
        timestamp: metrics[0].timestamp,
        zScore: z,
        reason: `Anomalous value detected (z-score ${z.toFixed(2)})`
      });
    }
  }
  return anomalies;
} 