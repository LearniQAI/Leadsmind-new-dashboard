import { createHmac, timingSafeEqual } from 'crypto';

// Same HMAC-token pattern already used by src/lib/security/unsubscribeToken.ts
// (campaign unsubscribe links) and src/lib/courier/shipmentToken.ts (shipment
// delivery confirmation) — reused here rather than inventing a third scheme.
// Deliberately a plain utility, NOT a 'use server' export: shipmentToken.ts's
// own comment documents why a token *generator* must never be its own
// independently-callable Server Action (it used to be, and any authenticated
// caller could mint a valid token for an arbitrary id it didn't own — confirmed
// live via that route's server-reference-manifest at the time). A plain
// function has no such boundary; it can only run on the server process that
// already holds the real appointment row.
//
// Unlike the unsubscribe token (email+workspaceId, looked up together) or the
// shipment token (verified against a shipmentId already present in the URL
// path), this one has nowhere else to carry the appointment id — the public
// route is a single opaque `/book/manage/[token]` segment, per this task's
// explicit route shape. So the token is self-describing: `${appointmentId}.${signature}`,
// where the signature is an HMAC over the appointmentId. Tampering with the id
// segment invalidates the signature; the id can't be swapped for a different
// appointment without knowing the server secret. This is the same principle
// as the other two tokens (unguessable, server-secret-derived), adapted to a
// single-segment public URL instead of a path+token pair.
function computeSignature(appointmentId: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'calendar-manage-secret';
  return createHmac('sha256', secret).update(appointmentId).digest('hex');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateManageToken(appointmentId: string): string {
  return `${appointmentId}.${computeSignature(appointmentId)}`;
}

// Verifies the signature and returns the appointmentId it's scoped to, or
// null if the token is malformed or tampered with. This only proves "this
// token was minted by us for this exact appointment id" — it deliberately
// says nothing about whether the appointment is still current/cancellable;
// callers must re-check the live appointment row (status, start_time) on
// every request, per this task's explicit "must expire once genuinely in the
// past" requirement. A stateless HMAC has no expiry of its own, so that check
// has to happen against real DB state, not be baked into the token bytes.
export function parseManageToken(token: string): { appointmentId: string } | null {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;

  const appointmentId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!UUID_RE.test(appointmentId)) return null;

  const expected = computeSignature(appointmentId);
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

  return { appointmentId };
}
