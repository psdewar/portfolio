interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStores: Record<string, Map<string, RateLimitEntry>> = {};

export const RATE_LIMIT_CONFIGS = {
  stream: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
  download: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  checkout: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  contact: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  funding: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  otpRequest: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 min
  otpVerify: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 attempts per 15 min
  rsvp: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 RSVPs per hour
  sponsor: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 sponsor submissions per hour
} as const;

export type RateLimitCategory = keyof typeof RATE_LIMIT_CONFIGS;

function getStore(category: string): Map<string, RateLimitEntry> {
  if (!rateLimitStores[category]) {
    rateLimitStores[category] = new Map();
  }
  return rateLimitStores[category];
}

function cleanupStore(store: Map<string, RateLimitEntry>): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (now >= entry.resetTime) keysToDelete.push(key);
  });
  keysToDelete.forEach((key) => store.delete(key));
}

export function checkRateLimit(
  ip: string,
  category: RateLimitCategory | string,
  config?: RateLimitConfig,
): { allowed: boolean; remaining: number; resetIn: number } {
  // Skip rate limiting for localhost
  if (isLocalhost(ip)) {
    return { allowed: true, remaining: 999, resetIn: 0 };
  }

  const { windowMs, maxRequests } = config ??
    RATE_LIMIT_CONFIGS[category as RateLimitCategory] ?? {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    };

  const store = getStore(category);
  const now = Date.now();

  if (Math.random() < 0.01) cleanupStore(store);

  const entry = store.get(ip);

  if (!entry || now >= entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = entry.resetTime - now;

  return { allowed: entry.count <= maxRequests, remaining, resetIn };
}

function isLocalhost(ip: string): boolean {
  return (
    ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "unknown"
  );
}

export function incrementRateLimit(
  ip: string,
  category: RateLimitCategory | string,
  config?: RateLimitConfig,
): void {
  checkRateLimit(ip, category, config);
}

export function resetRateLimit(ip: string, category: string): void {
  const store = getStore(category);
  store.delete(ip);
}

export function getRateLimitStatus(
  ip: string,
  category: RateLimitCategory | string,
  config?: RateLimitConfig,
): { count: number; remaining: number; resetIn: number } {
  const { windowMs, maxRequests } = config ??
    RATE_LIMIT_CONFIGS[category as RateLimitCategory] ?? {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    };

  const store = getStore(category);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetTime) {
    return { count: 0, remaining: maxRequests, resetIn: 0 };
  }

  return {
    count: entry.count,
    remaining: Math.max(0, maxRequests - entry.count),
    resetIn: entry.resetTime - now,
  };
}

export function createRateLimitHeaders(
  remaining: number,
  resetIn: number,
  limit: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000 + resetIn / 1000)),
  };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) return vercelIP.split(",")[0].trim();

  return "unknown";
}
