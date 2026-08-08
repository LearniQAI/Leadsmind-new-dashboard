# LeadsMind

LeadsMind is a multi-tenant Next.js SaaS platform that bundles CRM, sales
funnel/website building, an LMS, workflow automation, finance/invoicing, HR,
calendar/booking, and messaging into a single dashboard. Workspaces are the
tenancy boundary — most tables and server actions are scoped by
`workspace_id`, and most modules are backed by real Supabase tables and
server actions rather than being UI-only mockups.

---

## Tech stack

- **Framework:** Next.js 14.2 (App Router), React 18, TypeScript 5
- **Database/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Postgres with RLS policies
- **Styling:** Tailwind CSS, MUI, Material Tailwind, Radix UI primitives
- **Background jobs/queue:** Inngest (used to durably dispatch automation triggers and webhook side-effects past a single serverless invocation)
- **Payments:** `stripe` SDK + `@stripe/react-stripe-js`, plus hand-rolled clients for Paystack, Flutterwave, Ozow, PayPal, and PayFast
- **Editor/builder:** `@craftjs/core` (funnel/website page builder), TipTap (rich text)
- **Email/SMS:** Resend, Twilio
- **AI:** OpenAI SDK
- **Testing:** Vitest (unit), Playwright (installed as a dev dependency)

---

## Core features

### CRM
Contacts, leads, deals/opportunities, pipelines, tags/segmentation, notes,
activity feed, and lead-capture forms are all implemented with real UI,
server actions, and database tables. This is the most mature module in the
codebase.

### Funnel & website builder
A Craft.js-based drag-and-drop builder with 11 defined step types across four
business goals: **Sales** (Sales Page, Order Form, Upsell, Downsell,
Thank-you), **Opt-in** (Opt-in Page, Opt-in Thank-you), **Webinar** (Webinar
Registration, Webinar Thank-you/Broadcast), and **Info** (Info/Contact Page,
Inline/Popup Form). Each step type has a default starter template. Funnel
orders route through the same shared payment-gateway checkout used elsewhere
in Finance.

### Automation
A workflow builder and execution engine exist, backed by Supabase tables for
workflows, steps, executions, and per-step logs, with triggers/actions
dispatched onto an Inngest queue rather than run inline (so they survive the
originating request ending). The type-level trigger/action vocabulary
(`src/types/workflow.types.ts`) is deliberately small (5 trigger types, 9
action types) — this is the general-purpose CRM automation layer. A larger
set of triggers exists for form-specific automation
(`form_submitted`, `partial_abandoned`, `step_completed`, `payment_completed`,
`payment_failed`, `form_viewed`, `recovery_link_opened`). We could not verify
an exact "trigger firing" count from source alone — that would require
running the workflows, not just reading the code — so treat any specific
pass/fail trigger count as unverified until it's re-run.

### LMS
Course creation, modules/lessons, quizzes, enrollment, certificates, student
progress tracking, and remedial assignments all have UI, server actions, and
database tables. Expert profiles/sessions and cohort/RSVP support exist at
the database/backend level with lighter UI coverage.

### Finance
Invoices, quotes, proposals, expense tracking, bank/account connections, and
accounting transactions are fully implemented. Credit Notes, Retainers, and
Chart of Accounts each have a dedicated page and server action file
(`src/app/actions/creditNotes.ts`, `retainers.ts`, `chartOfAccounts.ts`) —
built, not just database placeholders.

### Payments
See the table below — this is the area with the most nuance, and the one
this audit focused on most closely.

---

## Payment integrations

| Provider | Model | Status | Notes |
|---|---|---|---|
| **Stripe** | OAuth (Stripe Connect) | Live | Real Connect flow (`getStripeConnectAuthUrl`); checkout routes to the workspace's own connected Stripe account. Webhook handler (`src/app/api/webhooks/stripe/route.ts`) idempotently handles refunds by `gateway_refund_id`. |
| **PayPal** | OAuth (Partner Referrals / PayPal Commerce Platform) | Live | Real onboarding flow (`getPaypalConnectAuthUrl` → `createPartnerReferral`), CSRF-protected via a signed OAuth state nonce. Stores the returned merchant ID, not a secret — no encryption needed for what's stored. |
| **Paystack** | BYO-key | Live | Workspace pastes their own secret key; validated against Paystack's API before being marked "Connected"; key stored encrypted (`workspace_integrations.credentials`, AES via `src/lib/encryption.ts`). |
| **Flutterwave** | BYO-key | Live | Same BYO-key pattern as Paystack; also requires the merchant's separately-issued webhook secret hash, stored encrypted alongside the API key. |
| **Ozow** | BYO-key | Live | Same BYO-key pattern; requires site code, API key, and private key, all stored encrypted. |
| **Yoco** | OAuth (planned) | Blocked | Removed from the Payment Gateways UI per an in-code comment — blocked on Yoco partner approval. Not currently reachable from any UI. |
| **PayFast** | Shared platform credentials (not per-workspace) | Live, but not workspace-connectable | The "Connect" card was removed from the Payment Gateways page because the per-workspace connection was decorative — checkout never actually used it. PayFast itself is still live and used directly (via one shared platform credential set) in course checkout, invoice payments, funnel orders, and calendar booking payments. |
| Peach Payments, SnapScan | — | Removed | Never had a payment backend; existed only as "Coming Soon" UI cards, now removed. |

**SaaS subscription billing** (the platform's own Rise/Surge/Infinity/Dynasty
paid tiers, plus the free Spark tier) currently routes through
**Paystack subscriptions** — both the in-app billing tab
(`src/app/settings/components/tabs/BillingTab.tsx`) and the public pricing
page call `createPaystackSubscription`. A parallel Stripe
`createCheckoutSession` function and full set of `STRIPE_*_PRICE_ID` env vars
still exist in `src/app/actions/finance.ts`, but nothing in the UI currently
calls it — Stripe checkout code is present but unused for platform billing.

---

## Setup instructions

```bash
# 1. Install dependencies
npm install   # or yarn install

# 2. Copy the env template and fill in real values
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Other scripts (from `package.json`): `npm run build` (runs the Vitest suite
before building), `npm run test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`.

`.env.example` (7000+ lines of category headers, ~140 vars) is the source of
truth for required configuration. At minimum, to run the app locally you need:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Auth/security:** `JWT_SECRET`, `JWT_SECRET_KEY`, `ENCRYPTION_KEY`, `KYC_ENCRYPTION_KEY`, `CRON_SECRET`, `WEBHOOK_SIGNING_SECRET`
- **App URL:** `NEXT_PUBLIC_APP_URL`

Payment gateway env vars are only required for the gateways that are
platform-level rather than per-workspace: `STRIPE_*` (Connect client ID, plus
the unused-in-UI checkout price IDs), `PAYFAST_*` (shared platform
credentials), `PAYSTACK_*` (both platform SaaS-billing plan codes and, for
Connect-style gateways, per-workspace credentials are entered in-app, not via
env). Flutterwave, Ozow, and PayPal require no platform-level env vars —
workspaces supply their own credentials through the UI (PayPal being the
exception in that it authenticates via LeadsMind's own PayPal partner app,
not a workspace-supplied secret).

Everything else in `.env.example` (AI providers, Twilio, Cloudinary, Meta,
Google, LinkedIn, TikTok, Outlook, credit-bureau integrations, Vercel deploy
tokens, staging/test credentials) is only needed if you're exercising that
specific integration.

---

## Known limitations / in-progress items

- **Automation trigger reliability:** could not be independently verified by
  reading source — any specific "N of M triggers firing" number should be
  confirmed by re-running the workflows, not assumed from this document.
- **Form A/B testing** (`/forms/[id]/ab-testing`): the route and a page
  component exist, but it's a small (~115-line) page — depth/completeness
  relative to a full A/B testing feature is unclear without a closer
  functional review.
- **Yoco:** blocked externally on partner approval; not reachable from any
  UI right now.
- **Expert profiles/sessions and cohort/RSVP support (LMS):** backend/database
  present, UI coverage is partial.
- **SMS automation, notifications, HR notifications:** backend/integration
  exists, UI is less built out than the backend.
- **PayFast per-workspace connection:** intentionally not exposed — it's
  shared-platform-credential only. Don't reintroduce a per-workspace "Connect"
  UI for it without also building the underlying per-workspace checkout wiring.
- **Stripe SaaS-billing checkout path:** code and env vars still exist but are
  currently dead — no UI calls `createCheckoutSession`. Either wire it back in
  or remove it; leaving it half-present risks drift.

---

## Recent significant fixes

These are changes found directly in code (comments, current implementation)
that indicate hardening work beyond initial feature-building:

- **Idempotent webhook handling:** the Stripe webhook route handles
  `charge.refunded` idempotently by `gateway_refund_id`, safe against Stripe's
  own webhook retries. The PayFast webhook route and the shared
  `completeFunnelOrder` handler (used by the Paystack/Flutterwave/Ozow webhook
  routes) perform an idempotent order-status flip rather than assuming
  single delivery.
- **OAuth CSRF protection:** both Stripe Connect and PayPal Partner Referrals
  onboarding use a signed, single-use state nonce (`createOAuthStateNonce`)
  rather than trusting the provider's redirect alone.
- **Encrypted credential storage:** BYO-key gateway credentials (Paystack
  secret key, Flutterwave secret key + webhook hash, Ozow site code/API
  key/private key) are encrypted at rest via `src/lib/encryption.ts` and only
  decrypted server-side through a single `getGatewayCredentials` accessor,
  replacing what an in-code comment describes as every prior consumer reading
  the raw encrypted JSONB column directly.
- **RLS fixes:** git history includes an "RLS recursion fix" and a fix
  routing brand-logo uploads through a service-role server action specifically
  to bypass a storage RLS policy that was blocking legitimate uploads, plus a
  migration enabling RLS and adding membership policies for domain, affiliate,
  and courier tables.

We could not independently confirm the specific "concurrency gate",
"signup-trigger", or "anonymous-access middleware" fixes by name in git
history or code comments — if these are real and load-bearing, it's worth
linking the actual commit/PR here rather than relying on this document.
