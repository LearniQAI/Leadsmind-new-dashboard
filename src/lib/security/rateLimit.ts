// Simple in-memory rate limiter, same scaffold already used by
// src/app/api/public/forms/[id]/submit/route.ts — extracted here so other
// public/unauthenticated write paths can reuse it instead of each
// reimplementing their own copy. In production this would be backed by
// Redis/Upstash for multi-instance correctness; a single in-memory Map is
// good enough to blunt naive flood/spam bursts on a single server process.

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}
