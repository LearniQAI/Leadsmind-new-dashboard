import crypto from 'crypto';

// Parallel to src/lib/paystack.ts (SaaS billing, global PAYSTACK_SECRET_KEY env
// var) but keyed by each workspace's own stored secret key instead — the two
// are intentionally separate call paths so a workspace's customer-facing
// Paystack account can never be confused with LeadsMind's own subscription
// billing account. Amounts here are in ZAR major units (rands) at the call
// boundary, matching this codebase's convention everywhere else, and are
// converted to kobo/cents (Paystack's own minor-unit requirement) only inside
// initializeTransaction.

const PAYSTACK_API_BASE = 'https://api.paystack.co';

async function paystackFetch<T = any>(secretKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.status) {
    const message = body?.message || `Paystack request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body.data as T;
}

// Real, lightweight, read-only authenticated call used purely to validate a
// workspace-supplied secret key before flipping "connected" — the Task 32 bug
// this whole build exists to avoid repeating was exactly the absence of this
// call. A bad/fake key returns 401 here, which paystackFetch turns into a
// thrown Error the caller surfaces to the user.
export async function validatePaystackKey(secretKey: string): Promise<void> {
  await paystackFetch(secretKey, '/transaction?perPage=1', { method: 'GET' });
}

export interface PaystackCheckoutParams {
  secretKey: string;
  email: string;
  amount: number; // ZAR major units — converted to kobo/cents below
  currency?: string;
  reference: string;
  callback_url: string;
  metadata?: Record<string, any>;
}

export interface PaystackCheckoutResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeCheckout(params: PaystackCheckoutParams) {
  return paystackFetch<PaystackCheckoutResult>(params.secretKey, '/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // rands -> kobo/cents
      currency: params.currency || 'ZAR',
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
    }),
  });
}

export function verifyTransaction(secretKey: string, reference: string) {
  return paystackFetch<any>(secretKey, `/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
}

// HMAC-SHA512 over the raw request body, x-paystack-signature header —
// identical mechanism to src/app/api/webhooks/paystack/route.ts (SaaS
// billing), just keyed by the workspace's own secret key instead of the
// global env var, since Paystack signs with whichever secret key initiated
// the transaction.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secretKey: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signatureHeader, 'hex');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
