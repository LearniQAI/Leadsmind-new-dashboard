/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * PER-INSTANCE: the counters live in this process's memory. On Vercel every warm serverless instance has its own
 * map, so the effective limit is (limit x number of warm instances) and a cold start resets it. It blunts casual
 * scraping and accidental loops from one client; it is NOT a hard guarantee and not a substitute for a shared
 * store (Redis/Upstash/Vercel KV) or WAF rate limiting if abuse needs a real ceiling.
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** When blocked: ms until the oldest hit leaves the window. */
  retryAfterMs: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterMs: Math.max(0, hits[0] + windowMs - now) };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Bound memory: when the map grows past the cap, drop buckets whose newest hit is already outside the window.
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (!v.length || v[v.length - 1] <= cutoff) buckets.delete(k);
    }
    // Still over the cap (a flood of distinct keys inside one window): drop the oldest-inserted entries.
    while (buckets.size > MAX_KEYS) {
      const first = buckets.keys().next().value;
      if (first === undefined) break;
      buckets.delete(first);
    }
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
