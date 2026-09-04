/**
 * Pure shaping/summary helpers for the admin Message Delivery Log (Part 4).
 * Kept out of the `'use server'` action file so they can be unit-tested and
 * imported by client components (a 'use server' module may only export async fns).
 *
 * Source data is the real Parts 1-2 state on `messages` + the error fields
 * dispatchOutboundMessage() writes into `messages.metadata` — no separate ledger.
 */

export const META_CHANNELS = ['facebook', 'instagram', 'whatsapp'] as const;
export const AUTH_ERROR_CODES = new Set([10, 102, 190, 200]);

export interface DeliveryLogFilters {
  from?: string;
  to?: string;
  platform?: string;
  status?: string;
  limit?: number;
}

export interface DeliveryLogRow {
  id: string;
  sent_at: string;
  platform: string;
  recipient: string;
  status: string;
  attempts: number | null;
  external_id: string | null;
  error_message: string | null;
  error_code: number | null;
  failure_class: string | null;
  is_auth_error: boolean;
  content_preview: string;
}

export interface DeliveryLogSummary {
  total: number;
  byStatus: Record<string, number>;
  failed: number;
  inFlight: number;
  settled: number;
  failureRate: number;
  authErrors: number;
}

/** Shape one raw `messages` row (with an embedded `conversations`) into a log row. */
export function mapDeliveryRow(m: any): DeliveryLogRow {
  const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
  const md = m.metadata || {};
  const code = typeof md.error_code === 'number' ? md.error_code : null;
  return {
    id: m.id,
    sent_at: m.sent_at,
    platform: conv?.platform || 'unknown',
    recipient: conv?.title || conv?.external_thread_id || '—',
    status: m.status,
    attempts: typeof md.attempts === 'number' ? md.attempts : null,
    external_id: m.external_id || null,
    error_message: md.error_message || null,
    error_code: code,
    failure_class: md.last_failure_class || null,
    is_auth_error: md.error_type === 'OAuthException' || (code != null && AUTH_ERROR_CODES.has(code)),
    content_preview: (m.content || '').slice(0, 80),
  };
}

export function summariseDeliveryLog(rows: DeliveryLogRow[]): DeliveryLogSummary {
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const total = rows.length;
  const failed = byStatus.failed || 0;
  const inFlight = (byStatus.queued || 0) + (byStatus.sending || 0) + (byStatus.retrying || 0);
  return {
    total,
    byStatus,
    failed,
    inFlight,
    settled: total - failed - inFlight,
    failureRate: total > 0 ? failed / total : 0,
    authErrors: rows.filter((r) => r.is_auth_error).length,
  };
}
