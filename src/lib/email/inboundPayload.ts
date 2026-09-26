import { parseFromHeader } from './inboundAddress';
import { normalizeMessageId, parseMessageIdList } from './emailMessageStore';

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

/** A header value from either shape we may see: `{ Name: value }` (any casing) or `[{ name, value }]`. */
export function inboundHeaderValue(headers: any, name: string): string | null {
  if (!headers) return null;
  const want = name.toLowerCase();
  if (Array.isArray(headers)) {
    const hit = headers.find((h: any) => String(h?.name ?? h?.key ?? '').toLowerCase() === want);
    return hit?.value != null ? String(hit.value) : null;
  }
  if (typeof headers === 'object') {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === want);
    const v = key ? headers[key] : null;
    return v == null ? null : Array.isArray(v) ? String(v[0]) : String(v);
  }
  return null;
}

/**
 * The email-identity columns for an inbound Resend delivery (Conversations batch 4) — written to
 * the SAME messages columns the Gmail path writes, so the two paths deduplicate against each other
 * via messages_conversation_rfc_message_id_key.
 *
 * rfc_message_id is ONLY the sender's RFC Message-ID (`data.message_id` / the Message-ID header).
 * It deliberately never falls back to Resend's own `email_id`, unlike extractInboundMessageId()
 * (the Resend-retry dedupe key): Gmail would never see that id, so it could never match.
 * In-Reply-To / References aren't on the webhook payload; they're read from the receiving API's
 * headers when present (`fetched`) and otherwise stay null — dedup doesn't depend on them.
 */
export function extractInboundEmailIdentity(emailData: any, fetched?: any): {
  rfcMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  to: { address: string; name: string | null }[];
  cc: { address: string; name: string | null }[];
} {
  const headerSources = [fetched?.headers, emailData?.headers];
  const fromHeaders = (name: string) => {
    for (const h of headerSources) {
      const v = inboundHeaderValue(h, name);
      if (v) return v;
    }
    return null;
  };
  const addresses = (v: any) =>
    (Array.isArray(v) ? v : v ? [v] : [])
      .map((a: any) => parseFromHeader(typeof a === 'string' ? a : a?.address ? `${a.name || ''} <${a.address}>` : ''))
      .filter((a) => !!a.email)
      .map((a) => ({ address: a.email as string, name: a.name }));

  return {
    rfcMessageId: normalizeMessageId(emailData?.message_id || fetched?.message_id || fromHeaders('Message-ID')),
    inReplyTo: normalizeMessageId(fromHeaders('In-Reply-To')),
    references: parseMessageIdList(fromHeaders('References')),
    to: addresses(emailData?.to ?? fetched?.to),
    cc: addresses(emailData?.cc ?? fetched?.cc),
  };
}
