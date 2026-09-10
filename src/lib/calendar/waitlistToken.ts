import { createHmac, timingSafeEqual } from 'crypto';

// Task 65 — accept-link token for a waitlist offer. Same HMAC-over-the-id
// pattern as lib/calendar/manageToken.ts (which itself mirrors
// unsubscribeToken.ts / shipmentToken.ts) — reused, not reinvented.
//
// `${waitlistEntryId}.${hmac(waitlistEntryId)}`. The URL is a single opaque
// `/book/waitlist/[token]` segment, so the token carries the id. Tampering
// with the id segment invalidates the signature. Expiry / single-use is NOT
// in the bytes — enforced against live DB state (booking_waitlists.confirmed,
// offer_expires_at) on every call.

function computeSignature(waitlistEntryId: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'calendar-waitlist-secret';
  return createHmac('sha256', secret).update(`waitlist:${waitlistEntryId}`).digest('hex');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateWaitlistToken(waitlistEntryId: string): string {
  return `${waitlistEntryId}.${computeSignature(waitlistEntryId)}`;
}

export function parseWaitlistToken(token: string): { waitlistEntryId: string } | null {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;

  const waitlistEntryId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!UUID_RE.test(waitlistEntryId)) return null;

  const expected = computeSignature(waitlistEntryId);
  let expectedBuf: Buffer;
  let gotBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, 'hex');
    gotBuf = Buffer.from(signature, 'hex');
  } catch {
    return null;
  }
  if (expectedBuf.length !== gotBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, gotBuf)) return null;

  return { waitlistEntryId };
}
