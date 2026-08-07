// Thin fetch-based wrapper around Paystack's REST API — there is no
// official Paystack Node SDK on par with `stripe` (see src/lib/stripe.ts).
// Unlike stripe.ts's silent dummy-key fallback, a missing secret key fails
// loudly in production — but that check must happen lazily, inside the
// function that actually performs a Paystack call, never at module scope.
// A module-scope throw runs the moment anything imports this file — including
// unrelated pages that merely import a shared actions file (e.g. finance.ts)
// which happens to also export Paystack functions — which broke the
// production build for /invoices/[id]/edit, a page with no Paystack call at all.
const PAYSTACK_API_BASE = 'https://api.paystack.co';

function getPaystackSecretKey(): string {
 const secretKey = process.env.PAYSTACK_SECRET_KEY;
 if (!secretKey) {
  if (process.env.NODE_ENV === 'production') {
   throw new Error('[FATAL] PAYSTACK_SECRET_KEY environment variable is not configured');
  }
  console.warn('Missing PAYSTACK_SECRET_KEY environment variable. Paystack billing will fail if attempted.');
 }
 return secretKey || '';
}

async function paystackFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
 const secretKey = getPaystackSecretKey();
 if (!secretKey) {
  throw new Error('[FATAL] PAYSTACK_SECRET_KEY environment variable is not configured');
 }

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

export interface PaystackInitializeParams {
 email: string;
 plan: string;
 callback_url: string;
 metadata?: Record<string, any>;
}

export interface PaystackInitializeResult {
 authorization_url: string;
 access_code: string;
 reference: string;
}

export interface PaystackPlan {
 plan_code: string;
 amount: number;
 currency: string;
 interval: string;
}

export function fetchPlan(planCode: string) {
 return paystackFetch<PaystackPlan>(`/plan/${encodeURIComponent(planCode)}`, {
  method: 'GET',
 });
}

export async function initializeTransaction(params: PaystackInitializeParams) {
 // Confirmed via a live test call: this account rejects
 // /transaction/initialize with a `plan` but no `amount` ("Invalid Amount
 // Sent"), even though Paystack's docs describe amount as optional when a
 // plan is set. Fetch the plan's amount first rather than assume.
 const plan = await fetchPlan(params.plan);
 return paystackFetch<PaystackInitializeResult>('/transaction/initialize', {
  method: 'POST',
  body: JSON.stringify({ ...params, amount: plan.amount }),
 });
}

export interface PaystackOneTimeParams {
 email: string;
 amount: number; // smallest currency unit (e.g. kobo/cents)
 callback_url: string;
 metadata?: Record<string, any>;
}

// Plain one-time charge, no subscription plan attached — used for add-on
// purchases (e.g. AI credit top-ups) rather than recurring billing.
export function initializeOneTimeTransaction(params: PaystackOneTimeParams) {
 return paystackFetch<PaystackInitializeResult>('/transaction/initialize', {
  method: 'POST',
  body: JSON.stringify(params),
 });
}

export function verifyTransaction(reference: string) {
 return paystackFetch<any>(`/transaction/verify/${encodeURIComponent(reference)}`, {
  method: 'GET',
 });
}

export function fetchSubscription(code: string) {
 return paystackFetch<any>(`/subscription/${encodeURIComponent(code)}`, {
  method: 'GET',
 });
}

export function disableSubscription(code: string, token: string) {
 return paystackFetch<any>('/subscription/disable', {
  method: 'POST',
  body: JSON.stringify({ code, token }),
 });
}

// Spark is the free tier and never reaches checkout — it routes straight to signup.
// Mirrors src/app/actions/finance.ts's PAID_TIER_PRICE_ENV (Stripe) pattern, but lives
// here (not in finance.ts, a 'use server' file which may only export async functions)
// so both the createPaystackSubscription() action and the webhook route can use it.
export const PAID_TIER_PLAN_CODE_ENV: Record<string, { month: string; year: string }> = {
 rise: { month: 'PAYSTACK_RISE_MONTHLY_PLAN_CODE', year: 'PAYSTACK_RISE_ANNUAL_PLAN_CODE' },
 surge: { month: 'PAYSTACK_SURGE_MONTHLY_PLAN_CODE', year: 'PAYSTACK_SURGE_ANNUAL_PLAN_CODE' },
 infinity: { month: 'PAYSTACK_INFINITY_MONTHLY_PLAN_CODE', year: 'PAYSTACK_INFINITY_ANNUAL_PLAN_CODE' },
 dynasty: { month: 'PAYSTACK_DYNASTY_MONTHLY_PLAN_CODE', year: 'PAYSTACK_DYNASTY_ANNUAL_PLAN_CODE' },
};

// Reverse lookup used by the webhook handler: a Paystack plan_code on an
// incoming event -> our canonical tier id. Built from the same env vars
// used to create the checkout, so it can never drift from what customers
// actually purchased through.
export function resolveTierFromPlanCode(planCode: string | undefined | null): string | null {
 if (!planCode) return null;
 for (const [tierId, envVars] of Object.entries(PAID_TIER_PLAN_CODE_ENV)) {
  if (process.env[envVars.month] === planCode || process.env[envVars.year] === planCode) {
   return tierId;
  }
 }
 return null;
}
