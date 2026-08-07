// PayPal Commerce Platform (PPCP) — structurally different from the other 3
// gateways in this file's family: those are workspace bring-your-own-key
// (credentials passed in per-call, no platform-wide env var). PayPal is a
// PLATFORM-LEVEL Partner integration instead — LeadsMind holds one Partner
// app (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET), and workspaces onboard as
// connected SELLERS under that Partner via the Partner Referrals API. All API
// calls (referral creation, order creation, status checks) authenticate as
// the Partner, never as the seller — the seller never hands us a token of
// their own. Confirmed against developer.paypal.com/docs/multiparty/* before
// writing this file (see Phase 1 report).
//
// Env-var reads are lazy (called only inside the functions that actually need
// them, never at module scope) — same fix already applied once to
// paystack.ts and encryption.ts after a real production build failure caused
// by a module-scope throw running on import of an unrelated shared file.

function getPaypalApiBase(): string {
  return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

function getPartnerCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET environment variables are not configured');
    }
    console.warn('Missing PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET. PayPal integration will fail if attempted.');
  }
  return { clientId: clientId || '', clientSecret: clientSecret || '' };
}

function getPaypalWebhookId(): string {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] PAYPAL_WEBHOOK_ID environment variable is not configured');
    }
    console.warn('Missing PAYPAL_WEBHOOK_ID. PayPal webhook signature verification will fail if attempted.');
  }
  return webhookId || '';
}

// Partner OAuth2 client-credentials token — a SEPARATE auth step from seller
// onboarding. Cached in-memory per server process; PayPal tokens are valid
// ~9hrs, refetched a minute before expiry.
let cachedPartnerToken: { accessToken: string; expiresAt: number } | null = null;

async function getPartnerAccessToken(): Promise<string> {
  if (cachedPartnerToken && cachedPartnerToken.expiresAt > Date.now()) {
    return cachedPartnerToken.accessToken;
  }

  const { clientId, clientSecret } = getPartnerCredentials();
  const res = await fetch(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(body?.error_description || `PayPal OAuth2 token request failed with status ${res.status}`);
  }

  cachedPartnerToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in || 0) - 60) * 1000,
  };
  return cachedPartnerToken.accessToken;
}

// The Auth-Assertion JWT asserts we're acting on a specific seller's behalf —
// a prerequisite for creating orders with that seller as payee. PayPal's
// documented recommendation is an unsigned ("alg": "none") JWT since the
// claims carry no sensitive data; the real authorization is the Partner
// bearer token itself plus the onboarding consent already granted.
function buildAuthAssertion(sellerMerchantId: string): string {
  const clientId = getPartnerCredentials().clientId;
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: clientId, payer_id: sellerMerchantId })).toString('base64url');
  return `${header}.${payload}.`;
}

async function paypalFetch<T = any>(
  path: string,
  init: RequestInit & { sellerMerchantId?: string } = {}
): Promise<T> {
  const token = await getPartnerAccessToken();
  const { sellerMerchantId, ...restInit } = init;

  const res = await fetch(`${getPaypalApiBase()}${path}`, {
    ...restInit,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(sellerMerchantId ? { 'PayPal-Auth-Assertion': buildAuthAssertion(sellerMerchantId) } : {}),
      ...(restInit.headers || {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message || body?.error_description || `PayPal request failed with status ${res.status}`;
    throw new PaypalApiError(message, body?.name);
  }
  return body as T;
}

// PayPal's error responses carry a `name` field (e.g. "AUTHORIZATION_ERROR",
// "NOT_AUTHORIZED") distinct from the HTTP status — callers that need to
// branch on "this specific API call isn't permitted for our app" vs. any
// other failure (network, bad input, real business decline) read
// `paypalErrorName` rather than parsing the message string.
export class PaypalApiError extends Error {
  paypalErrorName?: string;
  constructor(message: string, paypalErrorName?: string) {
    super(message);
    this.name = 'PaypalApiError';
    this.paypalErrorName = paypalErrorName;
  }
}

// OUR OWN partner merchant id — needed as a URL segment for the
// merchant-integrations status-check endpoint. Confirmed live that
// /v1/identity/oauth2/userinfo does NOT return this in a usable form for a
// sandbox Partner account (it returns an opaque encoded user_id URL that
// PayPal's own merchant-integrations endpoint rejects with
// "Invalid account") — there is no API that derives it. PayPal's own docs
// point to reading it off the dashboard (Account Settings > Business
// information > PayPal Merchant ID), so it's a one-time-configured env var,
// same lazy-check pattern as the other PayPal env vars in this file.
export async function getPartnerMerchantId(): Promise<string> {
  const id = process.env.PAYPAL_PARTNER_MERCHANT_ID;
  if (!id) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] PAYPAL_PARTNER_MERCHANT_ID environment variable is not configured');
    }
    console.warn('Missing PAYPAL_PARTNER_MERCHANT_ID. PayPal onboarding status checks will fail if attempted.');
  }
  return id || '';
}

export interface PartnerReferralResult {
  actionUrl: string;
  referralId: string;
}

// POST /v2/customer/partner-referrals — generates the one-time-use hosted
// onboarding link a workspace admin is redirected to. trackingId is our own
// opaque reference (the OAuth state nonce, so the later status check and the
// callback both tie back to the same value without trusting client input).
export async function createPartnerReferral(trackingId: string, returnUrl: string): Promise<PartnerReferralResult> {
  const result = await paypalFetch<{ links?: { rel: string; href: string }[] }>('/v2/customer/partner-referrals', {
    method: 'POST',
    body: JSON.stringify({
      tracking_id: trackingId,
      partner_config_override: { return_url: returnUrl },
      operations: [
        {
          operation: 'API_INTEGRATION',
          api_integration_preference: {
            rest_api_integration: {
              integration_method: 'PAYPAL',
              integration_type: 'THIRD_PARTY',
              third_party_details: { features: ['PAYMENT', 'REFUND'] },
            },
          },
        },
      ],
      products: ['PPCP'],
      legal_consents: [{ type: 'SHARE_DATA_CONSENT', granted: true }],
    }),
  });

  const actionUrl = result.links?.find((l) => l.rel === 'action_url')?.href;
  const selfLink = result.links?.find((l) => l.rel === 'self')?.href;
  const referralId = selfLink?.split('/').pop() || trackingId;
  if (!actionUrl) throw new Error('PayPal partner-referrals response did not include an action_url');

  return { actionUrl, referralId };
}

export interface MerchantIntegrationStatus {
  merchantId: string;
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
}

// GET /v1/customer/partners/{partnerMerchantId}/merchant-integrations?tracking_id=...
// Confirms the seller actually completed onboarding (permissions granted,
// email confirmed) rather than trusting the return-redirect query params
// alone, which the browser could replay/tamper with.
export async function getMerchantIntegrationByTrackingId(trackingId: string): Promise<MerchantIntegrationStatus | null> {
  const partnerMerchantId = await getPartnerMerchantId();
  const result = await paypalFetch<{
    merchant_id?: string;
    payments_receivable?: boolean;
    primary_email_confirmed?: boolean;
  }>(`/v1/customer/partners/${encodeURIComponent(partnerMerchantId)}/merchant-integrations?tracking_id=${encodeURIComponent(trackingId)}`);

  if (!result.merchant_id) return null;
  return {
    merchantId: result.merchant_id,
    paymentsReceivable: !!result.payments_receivable,
    primaryEmailConfirmed: !!result.primary_email_confirmed,
  };
}

export interface PaypalCheckoutParams {
  sellerMerchantId: string;
  amount: number; // major currency units (e.g. dollars/rands)
  currency?: string;
  customId: string; // fo_<orderId> — carried through to capture events for webhook resolution
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaypalCheckoutResult {
  paypalOrderId: string;
  approveUrl: string;
}

// POST /v2/checkout/orders — created with the connected seller as payee so
// funds route to them, authenticated as the Partner (Bearer token) with the
// PayPal-Auth-Assertion header asserting we're acting on the seller's behalf.
export async function initializeCheckout(params: PaypalCheckoutParams): Promise<PaypalCheckoutResult> {
  const currency = (params.currency || 'USD').toUpperCase();
  const result = await paypalFetch<{ id: string; links?: { rel: string; href: string }[] }>('/v2/checkout/orders', {
    method: 'POST',
    sellerMerchantId: params.sellerMerchantId,
    headers: {
      'PayPal-Partner-Attribution-Id': process.env.PAYPAL_BN_CODE || 'LeadsMind_PPCP',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: params.customId,
          invoice_id: params.customId,
          description: params.description?.slice(0, 127) || 'Funnel order',
          amount: { currency_code: currency, value: params.amount.toFixed(2) },
          payee: { merchant_id: params.sellerMerchantId },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });

  const approveUrl = result.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('PayPal order response did not include an approval link');

  return { paypalOrderId: result.id, approveUrl };
}

// POST /v2/checkout/orders/{id}/capture — triggered from the checkout return
// route once the buyer has approved on PayPal's hosted flow. The actual
// funnel_orders "paid" write still happens in the webhook handler
// (PAYMENT.CAPTURE.COMPLETED), not here — this call's only job is to make
// PayPal fire that event; treating this call's response as the source of
// truth would duplicate/race the webhook's idempotent update.
export async function captureOrder(paypalOrderId: string, sellerMerchantId: string): Promise<void> {
  await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    sellerMerchantId,
  });
}

export interface WebhookVerificationInput {
  transmissionId: string | null;
  transmissionTime: string | null;
  certUrl: string | null;
  authAlgo: string | null;
  transmissionSig: string | null;
  webhookEvent: any;
}

// POST /v1/notifications/verify-webhook-signature — chosen over local
// X.509/CRC32 self-verification (see Phase 1 report: simpler, no cert-chain
// trust code to get wrong, consistent with this repo's existing pattern of
// calling out to the provider's own verify API, e.g. Flutterwave's
// verifyTransaction re-check).
export async function verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
  if (!input.transmissionId || !input.transmissionTime || !input.certUrl || !input.authAlgo || !input.transmissionSig) {
    return false;
  }
  const webhookId = getPaypalWebhookId();
  if (!webhookId) return false;

  try {
    const result = await paypalFetch<{ verification_status?: string }>('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        transmission_id: input.transmissionId,
        transmission_time: input.transmissionTime,
        cert_url: input.certUrl,
        auth_algo: input.authAlgo,
        transmission_sig: input.transmissionSig,
        webhook_id: webhookId,
        webhook_event: input.webhookEvent,
      }),
    });
    return result.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

// Real, lightweight validation used before ever flipping the platform's own
// Partner credentials on as "working" — not called per-workspace (there's no
// workspace-level PayPal secret to validate, unlike Paystack/Flutterwave/Ozow)
// but useful as a startup/self-check that PAYPAL_CLIENT_ID/SECRET are valid.
export async function validatePartnerCredentials(): Promise<void> {
  await getPartnerAccessToken();
}
