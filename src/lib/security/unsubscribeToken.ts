import { createHmac, timingSafeEqual } from 'crypto';

// Signed, unguessable unsubscribe tokens — same HMAC-token pattern already
// used by shipments.ts's delivery-confirmation flow
// (src/lib/courier/shipmentToken.ts), reused here rather than inventing a
// new scheme. Deliberately a plain utility, not a 'use server' export: see
// the comment in shipmentToken.ts for why a token *generator* must never be
// its own independently-callable Server Action.
function computeToken(email: string, workspaceId: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'unsubscribe-secret';
  return createHmac('sha256', secret).update(`${email.toLowerCase().trim()}:${workspaceId}`).digest('hex');
}

export function generateUnsubscribeToken(email: string, workspaceId: string): string {
  return computeToken(email, workspaceId);
}

export function verifyUnsubscribeToken(email: string, workspaceId: string, token: string): boolean {
  if (!token) return false;
  const expected = computeToken(email, workspaceId);
  const expectedBuf = Buffer.from(expected, 'hex');
  const gotBuf = Buffer.from(token, 'hex');
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}
