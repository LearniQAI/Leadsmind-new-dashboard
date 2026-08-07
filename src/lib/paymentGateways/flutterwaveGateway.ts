import crypto from 'crypto';

// Flutterwave v3 Standard Payments — confirmed via current docs
// (developer.flutterwave.com/v3.0/docs/flutterwave-standard-1): amounts are
// MAJOR currency units (rands), unlike Paystack's minor units (kobo/cents) —
// do not apply the *100 conversion used in paystackGateway.ts here, that was
// the single most commonly-cited integration bug for this provider.

const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';

async function flutterwaveFetch<T = any>(secretKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLUTTERWAVE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.status !== 'success') {
    const message = body?.message || `Flutterwave request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body.data as T;
}

// Real, lightweight, read-only authenticated call to validate a
// workspace-supplied secret key before flipping "connected" — GET /balances
// is documented and requires a valid key; a bad key returns 401, which
// flutterwaveFetch turns into a thrown Error.
export async function validateFlutterwaveKey(secretKey: string): Promise<void> {
  await flutterwaveFetch(secretKey, '/balances', { method: 'GET' });
}

export interface FlutterwaveCheckoutParams {
  secretKey: string;
  email: string;
  name?: string;
  amount: number; // ZAR major units, sent as-is
  currency?: string;
  tx_ref: string;
  redirect_url: string;
  meta?: Record<string, any>;
}

export interface FlutterwaveCheckoutResult {
  link: string;
}

export function initializeCheckout(params: FlutterwaveCheckoutParams) {
  return flutterwaveFetch<FlutterwaveCheckoutResult>(params.secretKey, '/payments', {
    method: 'POST',
    body: JSON.stringify({
      tx_ref: params.tx_ref,
      amount: params.amount,
      currency: params.currency || 'ZAR',
      redirect_url: params.redirect_url,
      customer: { email: params.email, name: params.name },
      meta: params.meta,
    }),
  });
}

// GET /transactions/{id}/verify — independent status re-check, called by the
// webhook handler rather than trusting the webhook payload alone (see the
// weak-signature note in verifyWebhookSecret below).
export function verifyTransaction(secretKey: string, transactionId: string | number) {
  return flutterwaveFetch<any>(secretKey, `/transactions/${encodeURIComponent(String(transactionId))}/verify`, {
    method: 'GET',
  });
}

// verif-hash — WEAKER than the other 2 gateways' webhook verification: this
// is a static shared-secret string compare (the secret hash the workspace set
// in their Flutterwave dashboard, sent back verbatim in the verif-hash
// header), not a computed signature of the payload. Confirmed as Flutterwave's
// own documented baseline mechanism (flutterwave.com/.../what-is-a-secret-hash)
// — there is no per-payload HMAC in the core documented flow. Because a leaked
// secret hash alone would let an attacker forge a "payment succeeded" webhook
// with an arbitrary amount, the webhook route additionally re-fetches the
// transaction status via verifyTransaction() above before marking anything
// paid — never acts on the webhook body's amount/status directly.
export function verifyWebhookSecret(receivedHash: string | null, storedSecretHash: string): boolean {
  if (!receivedHash) return false;
  const a = Buffer.from(receivedHash);
  const b = Buffer.from(storedSecretHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
