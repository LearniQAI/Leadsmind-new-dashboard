---
type: module
---

# Finance / Billing

## Purpose

Two distinct concerns:

1. **LeadsMind's own SaaS billing** — the Spark (free) / Rise / Surge / Infinity
   / Dynasty tiers, a single hardcoded path through **Paystack subscriptions**
   (`createPaystackSubscription`), called from the in-app Billing tab and the
   public pricing page.
2. **A workspace's customer-facing payments** — invoices, quotes, credit notes,
   retainers, chart of accounts, expenses, reconciliation, reports, plus funnel
   orders and course purchases. Multiple gateways: Stripe (Connect OAuth),
   PayPal (Partner Referrals OAuth), Paystack / Flutterwave / Ozow (BYO-key,
   encrypted at rest), PayFast (shared platform credentials — not per-workspace),
   Yoco (blocked on partner approval).

## Key Files

- Pages: `src/app/finance/` (`chart-of-accounts`, `connected-accounts`,
  `credit-notes`, `expenses`, `payment-gateways`, `reconciliation`, `reports`,
  `retainers`, `revenue-forecast`, `transactions`), `src/app/invoices`,
  `src/app/(dashboard)/quotes`, `src/app/portal/quotes`, `src/app/settings/billing`.
- Server actions: `finance.ts`, `chartOfAccounts.ts`, `creditNotes.ts`,
  `retainers.ts`, `quotes.ts`, `expenses.ts`, `refunds.ts` (+ test),
  `stripeConnect.ts`, `paypalConnect.ts`, `funnelOrders.ts`, `order_actions.ts`,
  `commerce.ts`, `courseCommerce.ts`.
- Libs: `src/lib/paymentGateways/` (`completeFunnelOrder.ts`, `credentials.ts`,
  `paypalGateway.ts`, `paystackGateway.ts`, `flutterwaveGateway.ts`,
  `ozowGateway.ts`), `src/lib/stripe.ts`, `src/lib/paystack.ts`,
  `src/lib/finance/revenueForecast.ts`, `src/lib/invoices/`, `src/lib/invoicing/`,
  `src/lib/encryption.ts`.

## API Routes / DB Tables

- Routes: `src/app/api/finance/{banks,overview,revenue-forecast,transactions}`,
  `src/app/api/integrations/{stripe,paypal}`, `src/app/api/payfast/webhook`,
  `src/app/api/webhooks/{stripe,payfast,paypal,paystack,paystack-gateway,
  flutterwave,ozow,payments}`, `src/app/api/v1/{invoices,orders,products}`.
- Tables: `invoices`, `invoice_*`, `quotes`, `credit_notes`
  (`20260903000000_atomic_credit_notes.sql`), `retainers`
  (`20260903000001_atomic_apply_retainer_to_invoice.sql`),
  `accounting_transactions` (`20260903000002_*_account_link.sql`),
  chart-of-accounts tables, `revenue_forecasts` (`20260819000000`),
  workspace payment-credential tables (encrypted),
  `20260901000000_invoice_manual_payment_audit.sql`,
  `20260827000000_lockdown_financial_kyc_identity_tables.sql`.

## Known Issues

- **Stripe → Paystack SaaS billing migration:** platform subscription revenue
  now runs only through Paystack. The Stripe `createCheckoutSession` function and
  the full `STRIPE_*_PRICE_ID` env set still exist in
  `src/app/actions/finance.ts` but are **dead code for platform billing** —
  decide whether to delete ([[Milestone-2]] tasks 26–27, 32).
- **PayFast** is not connectable per-workspace by design — the "Connect" card was
  removed because checkout always used one shared platform credential set. Watch
  for docs/UI that still imply per-workspace PayFast.
- **Yoco** — no functional integration exists; removed from the Payment Gateways
  UI, blocked on Yoco partner approval.
- Cash balance in `src/app/api/finance/overview/route.ts:52` defaults to 0 —
  "bank connections are coming soon".
- **PayFast payment-verification bypass (fixed in [[Milestone-1]], task 11)** and
  **SARS tax-invoice VAT contradiction (fixed, task 14 — real VAT wired in
  commit `4985b8e8`)**.
- Stripe refund webhook is idempotent by `gateway_refund_id`; PayFast + Stripe
  refund handling built in [[Milestone-1]] task 18.
- Currency-display bugs on the Invoice builder (and Dashboard, Affiliates) —
  [[Milestone-4]] tasks 78–80.
- Unauthenticated payroll data endpoint fixed in [[Milestone-1]] task 5 (see HR
  work in [[Milestone-3]]).

## Related Tasks

[[Milestone-1]] (payment-credential encryption at rest, OAuth connect flow,
PayFast bypass, VAT fix, refund handling) · [[Milestone-2]] (Billing Settings,
Stripe Connect relabel, Credit Notes / Retainers / Chart of Accounts screens,
Payment Gateways page reconcile, PayPal/Paystack/Flutterwave/Ozow/Yoco
integrations, PayFast recurring) · [[Milestone-4]] (AI revenue forecasting,
invoice-builder currency fix)
