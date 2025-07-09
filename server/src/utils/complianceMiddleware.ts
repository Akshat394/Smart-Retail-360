import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for demo (use Redis or DB in prod)
const usageMap: Record<string, { count: number; last: number; fails: number; blockedUntil?: number }> = {};
const BLOCK_THRESHOLD = 10; // 10 failures
const RATE_LIMIT = 100; // 100 requests per 5 min
const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_TIME = 15 * 60 * 1000; // 15 min
const LOG_PATH = path.join(__dirname, '../../../logs/security/compliance.log');

function logCompliance(event: any) {
  const line = JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + '\n';
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line);
}

export function complianceMiddleware(req: Request, res: Response, next: NextFunction) {
  let ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  if (Array.isArray(ip)) ip = ip[0];
  if (typeof ip !== 'string') ip = String(ip);
  const now = Date.now();
  if (!usageMap[ip]) usageMap[ip] = { count: 0, last: now, fails: 0 };
  const usage = usageMap[ip];
  // Reset window
  if (now - usage.last > WINDOW_MS) {
    usage.count = 0;
    usage.last = now;
    usage.fails = 0;
  }
  usage.count++;
  // Demo: Log what would have happened, but do not block
  if (usage.blockedUntil && now < usage.blockedUntil) {
    logCompliance({ ip, event: 'blocked (demo only)', path: req.path });
    // Do not block, just log
  }
  if (usage.count > RATE_LIMIT) {
    usage.blockedUntil = now + BLOCK_TIME;
    logCompliance({ ip, event: 'rate_limit_block (demo only)', path: req.path });
    // Do not block, just log
  }
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      usage.fails++;
      logCompliance({ ip, event: 'auth_fail', path: req.path });
      if (usage.fails >= BLOCK_THRESHOLD) {
        usage.blockedUntil = Date.now() + BLOCK_TIME;
        logCompliance({ ip, event: 'auth_block (demo only)', path: req.path });
        // Do not block, just log
      }
    } else {
      logCompliance({ ip, event: 'access', path: req.path, status: res.statusCode });
    }
  });
  next();
} 