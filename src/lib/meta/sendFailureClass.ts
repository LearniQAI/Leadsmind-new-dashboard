/**
 * Classify a failed provider send as recoverable (worth an automatic retry) or
 * permanent (mark FAILED now, don't burn retries) — PRD section 5.3.
 *
 * Inputs are the structured fields from MetaSendResult (Graph API error.code /
 * error_subcode / type / HTTP status, plus errorType 'transport'/'timeout' when
 * fetch itself threw or aborted).
 *
 * Reference: Meta Graph API error codes
 * https://developers.facebook.com/docs/graph-api/guides/error-handling
 * and WhatsApp Cloud API error codes
 * https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */

export type SendFailureClass = 'recoverable' | 'permanent';

export interface ClassifiableFailure {
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
  errorType?: string;
  httpStatus?: number;
}

// Graph / Messenger transient codes: rate limiting + "try again".
const RECOVERABLE_CODES = new Set<number>([
  1,   // API Unknown — transient, Meta says retry
  2,   // API Service — temporary problem, retry
  4,   // App-level rate limit
  17,  // User-level rate limit
  32,  // Page-level rate limit
  341, // Application limit reached
  368, // Temporarily blocked for policy violations — clears on its own
  613, // Custom-rate-limit (Messenger)
]);

// WhatsApp Cloud API transient codes.
const RECOVERABLE_WHATSAPP_CODES = new Set<number>([
  130429, // Rate limit hit
  131000, // Something went wrong (generic transient)
  131056, // (Business, Recipient) pair rate limit hit
  133016, // Too many requests (registration) — transient
]);

// Permanent auth / permission / addressing / policy failures — never retry.
const PERMANENT_CODES = new Set<number>([
  10,      // Permission denied (e.g. no messaging permission / outside allowed window)
  100,     // Invalid parameter (bad recipient id, malformed request)
  190,     // Access token expired / invalid
  200,     // Permission error
  803,     // Object does not exist / cannot be loaded
  551,     // This person isn't available right now (Messenger — recipient unreachable)
  1545041, // Message not sent (recipient cannot be messaged)
  131047,  // WhatsApp: re-engagement required (24h window closed, no template)
  131051,  // WhatsApp: unsupported message type
  131026,  // WhatsApp: message undeliverable (recipient cannot receive)
  132000,  // WhatsApp: template param count mismatch
  132001,  // WhatsApp: template does not exist
  132005,  // WhatsApp: template hydrated text too long
  132007,  // WhatsApp: template format/policy violation
  133010,  // WhatsApp: phone number not registered
]);

export function classifySendFailure(f: ClassifiableFailure): SendFailureClass {
  // Network transport error or our own AbortController timeout — always retry.
  if (f.errorType === 'transport' || f.errorType === 'timeout') return 'recoverable';

  const code = typeof f.errorCode === 'number' ? f.errorCode : undefined;

  if (code !== undefined) {
    if (PERMANENT_CODES.has(code)) return 'permanent';
    if (RECOVERABLE_CODES.has(code) || RECOVERABLE_WHATSAPP_CODES.has(code)) return 'recoverable';
  }

  // HTTP-status fallbacks when there's no (or an unmapped) Graph code.
  if (f.httpStatus === 429) return 'recoverable';        // rate limited
  if (f.httpStatus && f.httpStatus >= 500) return 'recoverable'; // provider 5xx
  if (f.httpStatus === 401 || f.httpStatus === 403) return 'permanent'; // auth/permission

  // OAuthException without a recognised code is almost always a token problem.
  if (f.errorType === 'OAuthException') return 'permanent';

  // Text-match last resort (mirrors the sms/whatsapp-dispatch hard-fail regex).
  const msg = (f.error || '').toLowerCase();
  if (/invalid|expired|unauthor|permission|blocked|not available|unsupported|policy/.test(msg)) {
    return 'permanent';
  }

  // Unknown failure: a retry is safer than a silent drop, and attempts are capped.
  return 'recoverable';
}

export function isRecoverableSendFailure(f: ClassifiableFailure): boolean {
  return classifySendFailure(f) === 'recoverable';
}
