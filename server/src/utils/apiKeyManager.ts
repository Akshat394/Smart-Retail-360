import crypto from 'crypto';

interface ApiKeyInfo {
  key: string;
  userId: number;
  role: string;
  createdAt: string;
  usage: number;
  lastUsed: number;
}

const apiKeys: Record<string, ApiKeyInfo> = {};
const RATE_LIMITS: Record<string, number> = {
  admin: 1000, // requests per hour
  manager: 500,
  user: 200,
  guest: 50
};

export function generateApiKey(userId: number, role: string): string {
  const key = crypto.randomBytes(24).toString('hex');
  apiKeys[key] = {
    key,
    userId,
    role,
    createdAt: new Date().toISOString(),
    usage: 0,
    lastUsed: Date.now()
  };
  return key;
}

export function getApiKeyInfo(key: string): ApiKeyInfo | undefined {
  return apiKeys[key];
}

export function validateApiKey(key: string): boolean {
  return !!apiKeys[key];
}

export function incrementApiKeyUsage(key: string) {
  if (apiKeys[key]) {
    apiKeys[key].usage++;
    apiKeys[key].lastUsed = Date.now();
  }
}

export function enforceApiKeyRateLimit(key: string): boolean {
  const info = apiKeys[key];
  if (!info) return false;
  const limit = RATE_LIMITS[info.role] || 100;
  // Reset usage every hour
  const now = Date.now();
  if (now - info.lastUsed > 60 * 60 * 1000) {
    info.usage = 0;
    info.lastUsed = now;
  }
  if (info.usage >= limit) {
    return false;
  }
  return true;
} 