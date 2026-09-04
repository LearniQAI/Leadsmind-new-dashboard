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

// --- Delivery-health alerting (Part 4, PRD 5.5) -----------------------------
function floatFromEnv(name: string, fallback: number): number {
  const n = process.env[name] ? parseFloat(process.env[name] as string) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Rolling window (minutes) the failure-rate alert looks back over. */
export const DELIVERY_ALERT_WINDOW_MIN = intFromEnv('MESSAGE_DELIVERY_ALERT_WINDOW_MIN', 15);
/** Failure fraction (0-1) that trips the alert. PRD: 10%. */
export const DELIVERY_ALERT_THRESHOLD = floatFromEnv('MESSAGE_DELIVERY_ALERT_THRESHOLD', 0.1);
/** Minimum outbound volume in the window before a rate is meaningful. */
export const DELIVERY_ALERT_MIN_VOLUME = intFromEnv('MESSAGE_DELIVERY_ALERT_MIN_VOLUME', 5);
/** Per-workspace-per-platform cooldown (minutes) between repeat alerts. */
export const DELIVERY_ALERT_COOLDOWN_MIN = intFromEnv('MESSAGE_DELIVERY_ALERT_COOLDOWN_MIN', 60);

/**
 * Pure predicate for "this window is unhealthy enough to alert". Extracted so the
 * threshold/volume logic is unit-testable without a DB.
 */
export function shouldAlertOnFailureRate(params: {
  failed: number;
  total: number;
  threshold?: number;
  minVolume?: number;
}): boolean {
  const threshold = params.threshold ?? DELIVERY_ALERT_THRESHOLD;
  const minVolume = params.minVolume ?? DELIVERY_ALERT_MIN_VOLUME;
  if (params.total < minVolume) return false;
  if (params.failed <= 0) return false;
  return params.failed / params.total > threshold;
}
