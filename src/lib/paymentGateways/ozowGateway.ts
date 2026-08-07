import crypto from 'crypto';

// Ozow's real API shape confirmed against a live working reference
// implementation (github.com/wdtheprovider/ozpay, payment.php/check_trans.php)
// cross-checked against Ozow's own hash-verification docs, since the primary
// docs site (api.i-pay.co.za / oldhub.ozow.com) was unreachable at build time.
// Unlike PayFast (MD5 + passphrase) and Paystack (HMAC-SHA512), Ozow's own
// requests AND webhook notifications both use a SHA512 hash of concatenated
// field values (in a fixed order) + the merchant's private key, lowercased —
// same general shape as PayFast's convention in src/lib/calendar/payfast.ts,
// adapted for SHA512 and Ozow's specific field set/order.

const OZOW_API_BASE = 'https://api.ozow.com';

export interface OzowCheckoutParams {
  siteCode: string;
  apiKey: string;
  privateKey: string;
  amount: number; // ZAR major units, same convention as PayFast in this codebase
  transactionReference: string;
  bankReference: string; // shows on the customer's bank statement — Ozow caps this at 20 chars
  cancelUrl: string;
  errorUrl: string;
  successUrl: string;
  notifyUrl: string;
  isTest: boolean;
}

export interface OzowCheckoutResult {
  url: string;
  errorMessage?: string;
}

// Field order here is load-bearing — it must exactly match the order used to
// build the HashCheck string (confirmed via the reference implementation).
function buildRequestPayload(params: OzowCheckoutParams) {
  const fields: Record<string, string> = {
    SiteCode: params.siteCode,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: params.amount.toFixed(2),
    TransactionReference: params.transactionReference,
    BankReference: params.bankReference,
    CancelUrl: params.cancelUrl,
    ErrorUrl: params.errorUrl,
    SuccessUrl: params.successUrl,
    NotifyUrl: params.notifyUrl,
    IsTest: params.isTest ? 'true' : 'false',
  };

  const concatenated = Object.values(fields).join('');
  const hashCheck = crypto
    .createHash('sha512')
    .update((concatenated + params.privateKey).toLowerCase())
    .digest('hex');

  return { ...fields, HashCheck: hashCheck };
}

export async function initializeCheckout(params: OzowCheckoutParams): Promise<OzowCheckoutResult> {
  const payload = buildRequestPayload(params);

  const res = await fetch(`${OZOW_API_BASE}/postpaymentrequest`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ApiKey: params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error(`Ozow payment request failed with status ${res.status}`);
  }
  if (body.errorMessage) {
    throw new Error(body.errorMessage);
  }
  if (!body.url) {
    throw new Error('Ozow did not return a checkout URL.');
  }
  return body;
}

// Ozow has no documented dedicated "ping"/whoami endpoint. GetTransaction is
// the only always-available authenticated GET call, so it's used as the real
// validation call: a bad ApiKey/SiteCode is rejected by Ozow's API before it
// ever looks up the (deliberately nonexistent) transaction id, so 401/403
// reliably means bad credentials, while any other response (200 with an
// empty/error-but-authenticated body) means the key itself was accepted.
export async function validateOzowCredentials(siteCode: string, apiKey: string): Promise<void> {
  const res = await fetch(
    `${OZOW_API_BASE}/GetTransaction?siteCode=${encodeURIComponent(siteCode)}&transactionId=00000000-0000-0000-0000-000000000000`,
    { headers: { ApiKey: apiKey } }
  );
  if (res.status === 401 || res.status === 403) {
    throw new Error('Ozow rejected this SiteCode/API key.');
  }
}

export async function getTransaction(siteCode: string, apiKey: string, transactionId: string) {
  const res = await fetch(
    `${OZOW_API_BASE}/GetTransaction?siteCode=${encodeURIComponent(siteCode)}&transactionId=${encodeURIComponent(transactionId)}`,
    { headers: { ApiKey: apiKey } }
  );
  if (!res.ok) throw new Error(`Ozow GetTransaction failed with status ${res.status}`);
  return res.json();
}

export interface OzowNotifyPayload {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: string;
  Hash?: string;
  HashCheck?: string;
  [key: string]: any;
}

// Notify-webhook hash order is SiteCode + TransactionId + TransactionReference
// + Amount + Status + privateKey, lowercased, SHA512 — confirmed via Ozow's
// own hash-verification documentation (same algorithm family as the request
// side, different field set: the notify payload doesn't echo back the URLs).
// The received hash field is named `Hash` in some Ozow doc versions and
// `HashCheck` in others — check both rather than assume one.
export function verifyNotifyHash(payload: OzowNotifyPayload, privateKey: string): boolean {
  const received = payload.Hash || payload.HashCheck;
  if (!received) return false;

  const concatenated = [
    payload.SiteCode,
    payload.TransactionId,
    payload.TransactionReference,
    payload.Amount,
    payload.Status,
  ].join('');

  const expected = crypto
    .createHash('sha512')
    .update((concatenated + privateKey).toLowerCase())
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received.toLowerCase());
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
