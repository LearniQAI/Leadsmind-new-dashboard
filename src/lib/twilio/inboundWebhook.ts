import { logger } from '@/shared/logger';

// A workspace's Twilio number only reaches our STOP/inbound handler if the number's SMS webhook
// points at it. That used to be a manual step described in docs/EMAIL_SMS_BRIDGE.md; nothing in
// the app did it, so a STOP typed by a customer of a workspace-owned number was never delivered.
// Called when a workspace saves its Twilio credentials + number (settings) and when a number is
// purchased in-app (telephony).

export function inboundSmsWebhookUrl(): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  // Twilio can only call a public HTTPS URL; refuse to write a localhost URL onto a real number.
  if (!/^https:\/\//i.test(base) || /localhost|127\.0\.0\.1/.test(base)) return null;
  // Must match EXACTLY what the inbound route rebuilds for signature validation.
  return `${base}/api/webhooks/twilio/inbound`;
}

export type InboundWebhookResult =
  | { ok: true; numberSid: string; url: string }
  | { ok: false; reason: 'app_url_not_public' | 'number_not_found_in_account' | 'twilio_error'; detail?: string };

/**
 * Sets smsUrl (POST) on the incoming-phone-number resource matching `phoneNumber` in the account
 * behind `client`. Best-effort: never throws, so saving credentials is not blocked by it; the
 * caller surfaces `ok: false` as a warning.
 */
export async function configureInboundSmsWebhook(client: any, phoneNumber: string): Promise<InboundWebhookResult> {
  const url = inboundSmsWebhookUrl();
  if (!url) return { ok: false, reason: 'app_url_not_public' };
  try {
    const numbers: any[] = await client.incomingPhoneNumbers.list({ phoneNumber, limit: 5 });
    const match = numbers.find((n) => n.phoneNumber === phoneNumber);
    if (!match) return { ok: false, reason: 'number_not_found_in_account' };
    await client.incomingPhoneNumbers(match.sid).update({ smsUrl: url, smsMethod: 'POST' });
    return { ok: true, numberSid: match.sid, url };
  } catch (err: any) {
    logger.error({ err }, 'twilio.inbound_webhook.configure.failed');
    return { ok: false, reason: 'twilio_error', detail: String(err?.message ?? err).slice(0, 200) };
  }
}

export function describeWebhookFailure(r: Extract<InboundWebhookResult, { ok: false }>): string {
  switch (r.reason) {
    case 'app_url_not_public': return 'Saved, but the STOP-reply webhook could not be set automatically because the app URL is not a public https address. Set your number\'s SMS webhook to /api/webhooks/twilio/inbound manually.';
    case 'number_not_found_in_account': return 'Saved, but that number was not found in this Twilio account, so its STOP-reply webhook was not set. Check the number.';
    default: return 'Saved, but Twilio would not let us set the number\'s STOP-reply webhook. Set its SMS webhook to /api/webhooks/twilio/inbound manually.';
  }
}

/**
 * The URL Twilio calls with delivery-status updates for a message we send (queued -> sent ->
 * delivered / undelivered / failed). Same public-https rule as the inbound URL: null when the app
 * URL is not public, in which case the message is simply sent without a callback. Must match EXACTLY
 * what the sms-status route rebuilds for signature validation.
 */
export function smsStatusCallbackUrl(): string | null {
  const inbound = inboundSmsWebhookUrl();
  return inbound ? inbound.replace(/\/inbound$/, '/sms-status') : null;
}
