/**
 * Parsing of Resend's `email.received` webhook payload — extracted here as
 * pure, unit-testable functions after a real production 500 on
 * /api/webhooks/resend/inbound (event msg_3IwgEKHGmnj2LubcCvlg9Ooi8it,
 * 2026-09-06): the route only looked for `data.headers['Message-ID']` and
 * `data.id`, but Resend's real payload carries neither — it provides
 * `data.message_id` (the RFC 5322 Message-ID) and `data.email_id` (Resend's
 * own id), and the recipient in `data.received_for` as well as `data.to`.
 */

/**
 * Every address the message was delivered to / for. Resend puts the real
 * routing address in `received_for`; `to` usually has it too but not always
 * (forwards, plus-addressing, BCC). Header fallbacks kept for parity with the
 * older Email→SMS bridge payloads.
 */
export function extractInboundToAddresses(emailData: any): string[] {
  const asArray = (v: any): any[] => (Array.isArray(v) ? v : v ? [v] : []);
  const headers = emailData?.headers || {};
  return [
    ...asArray(emailData?.to),
    ...asArray(emailData?.received_for),
    headers['Delivered-To'],
    headers['X-Forwarded-To'],
  ]
    .filter(Boolean)
    .map((a) => String(a).trim());
}

/**
 * A stable, unique id for this delivery, used as the dedupe key in
 * `messages.bridge_metadata->>resend_message_id`. Prefers the sender's RFC
 * Message-ID (`data.message_id`), then Resend's `data.email_id`, then the
 * legacy header / `data.id` shapes. Returns '' only when the payload truly
 * carries no identifier at all.
 */
export function extractInboundMessageId(emailData: any): string {
  const headers = emailData?.headers || {};
  return String(
    emailData?.message_id ||
      headers['Message-ID'] ||
      headers['Message-Id'] ||
      headers['message-id'] ||
      emailData?.email_id ||
      emailData?.id ||
      '',
  ).trim();
}
