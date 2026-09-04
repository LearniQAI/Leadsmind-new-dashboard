/**
 * Tunables for the outbound-message retry queue (Message Delivery Reliability Part 2).
 *
 * The PRD asks for 5s / 15s / 45s backoff. Vercel Cron's finest granularity is
 * 1 minute, so a sub-minute schedule is not achievable without a separate
 * always-on queue consumer (out of scope). These defaults are the adjusted,
 * coarser schedule; every value is env-overridable so ops can tighten it if the
 * message-dispatch cron is run more often than the default `* * * * *`.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** AbortController timeout on a single provider send call. */
export const MESSAGE_SEND_TIMEOUT_MS = intFromEnv('MESSAGE_SEND_TIMEOUT_MS', 10_000);

/**
 * Total attempts before a message is marked FAILED. Default 4 = 1 inline attempt
 * + 3 automatic retries (the PRD's "max 3 automatic retries").
 */
export const MESSAGE_SEND_MAX_ATTEMPTS = intFromEnv('MESSAGE_SEND_MAX_ATTEMPTS', 4);

/**
 * Seconds to wait before retry N (1-indexed by the attempt that just failed):
 * attempt 1 failed -> wait BACKOFF[0] before attempt 2, etc. The last value is
 * reused if there are more retries than entries.
 */
export const MESSAGE_SEND_RETRY_BACKOFF_SECONDS: number[] = (
  process.env.MESSAGE_SEND_RETRY_BACKOFF_SECONDS || '60,300,900'
)
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n >= 0);

/** Backoff (seconds) to apply after `failedAttemptNumber` (1-indexed). */
export function retryBackoffSeconds(failedAttemptNumber: number): number {
  const table = MESSAGE_SEND_RETRY_BACKOFF_SECONDS.length
    ? MESSAGE_SEND_RETRY_BACKOFF_SECONDS
    : [60, 300, 900];
  const idx = Math.min(Math.max(failedAttemptNumber, 1), table.length) - 1;
  return table[idx];
}

/** ISO timestamp `retryBackoffSeconds(n)` in the future from now. */
export function nextAttemptAt(failedAttemptNumber: number, from: Date = new Date()): string {
  return new Date(from.getTime() + retryBackoffSeconds(failedAttemptNumber) * 1000).toISOString();
}
