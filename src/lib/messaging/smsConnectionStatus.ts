/**
 * SMS has no `platform_connections` row (it's never written by
 * connectPlatformManually / saveMetaConnections — only facebook/instagram/
 * whatsapp are). Its real, existing connection signal is
 * `workspaces.twilio_number` — the same field the sms-dispatch cron worker
 * already reads. This synthesizes a `platform_connections`-shaped row for it
 * so callers (the "always show every channel tab" UI) can tell a genuinely
 * SMS-configured workspace from one that still needs to set it up, the same
 * way they already can for the Meta channels — without fabricating a status
 * that isn't backed by a real column.
 *
 * A no-op if a real `sms` row already exists (defensive — none does today).
 */
export function withSmsConnectionStatus(
  rows: Array<{ platform: string; status: string; last_sync_at: string | null; credentials?: any }>,
  twilioNumber: string | null | undefined,
) {
  if (rows.some((r) => r.platform === 'sms')) return rows;
  return [
    ...rows,
    { platform: 'sms', status: twilioNumber ? 'connected' : 'disconnected', last_sync_at: null, credentials: {} },
  ];
}
