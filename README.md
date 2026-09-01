# LeadsMind

LeadsMind is a multi-tenant business platform that bundles CRM, sales funnel
and website building, an LMS, workflow automation, finance/invoicing, HR,
calendar/booking, and messaging into a single dashboard. It targets
businesses operating in African markets specifically — this shows up
concretely in the payments layer (PayFast, Ozow, Flutterwave, Yoco alongside
Stripe/PayPal) and in KYC-adjacent integrations (South African credit-bureau
and utility APIs). Workspaces are the tenancy boundary: most tables and
server actions are scoped by `workspace_id`, and most modules are backed by
real Supabase tables and server actions rather than being UI-only mockups.

---

## Who uses it

- **Workspace members (dashboard users)** — the businesses running their
  operations in LeadsMind. Access is governed by a role stored on
  `workspace_members.role`, currently constrained to `admin`, `member`,
  `client`, `viewer`, `hr`, `payroll`, and `compliance` (the last three were
  added later, for payroll and Suspicious Transaction Report/compliance
  workflows). There is no `owner` role in the schema — some newer RLS
  policies check `role in ('admin', 'owner')` defensively, but an in-code
  comment on that migration states plainly that `'owner'` isn't an actual
  value this schema issues; `admin` is the highest real privilege level.
- **Portal contacts (customers/leads/students)** — end customers who never
  get a `workspace_members` row. They authenticate separately and reach a
  portal (`src/lib/portal/session.ts`) that looks up `contacts` rows matching
  their email with `portal_access_enabled = true` and
  `portal_access_revoked = false`. This is the mechanism behind course
  access, quote/invoice viewing, and other customer-facing portal pages —
  explicitly not a logged-in dashboard session.
- **Anonymous/public visitors** — people hitting public funnel steps, forms,
  webinar registration pages, or embed widgets with no account at all.
  Automation triggers fired from this path (form submission, funnel step
  completion, payment webhooks) are system-initiated, not tied to any
  logged-in user.

---

## Tech stack

- **Framework:** Next.js 14.2 (App Router), React 18, TypeScript 5
- **Database/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Postgres with RLS policies — no separate ORM, raw Supabase client + SQL migrations
- **Styling:** Tailwind CSS, MUI, Material Tailwind, Radix UI primitives
- **Background jobs/queue:** Inngest — durably dispatches automation triggers and webhook side-effects past a single serverless invocation (`src/lib/automations/TriggerDispatcher.ts`)
- **Payments:** `stripe` SDK + `@stripe/react-stripe-js`, plus hand-rolled REST clients for Paystack, Flutterwave, Ozow, PayPal, and PayFast (none of these have an official npm SDK dependency)
- **Editor/builder:** `@craftjs/core` (funnel/website page builder), TipTap (rich text), FullCalendar, Monaco Editor
- **Email/SMS/WhatsApp:** Resend (email), Twilio (SMS/voice), a custom Meta adapter for WhatsApp (`src/lib/meta/MetaAdapter.ts`) — no official Meta SDK dependency
- **AI:** OpenAI SDK (content generation, grammar/plagiarism checks, lead discovery)
- **Testing:** Vitest (unit/integration), Playwright (installed as a dev dependency; extent of E2E coverage not verified)

---

## Repository structure

```
src/
  app/                    Next.js App Router — route groups (auth), (dashboard),
                           (marketing), (portal); feature routes for crm, contacts,
                           deals, pipelines, tasks, segments, automation(s), funnels,
                           campaigns, whatsapp-broadcasts, sms, finance, invoices,
                           courses, conversations, forms, settings, hr, hrm, payroll,
                           affiliate-marketplace/-portal, kyc, lead-finder,
                           content-studio, ai-studio, meet, calendar, student, portal,
                           widget, embed
  app/actions/            Server actions — one file per domain (contacts.ts, tags.ts,
                           finance.ts, quotes.ts, creditNotes.ts, retainers.ts,
                           chartOfAccounts.ts, paypalConnect.ts, stripeConnect.ts, ...)
  app/api/                Route handlers — webhooks (Stripe, PayFast, Twilio inbound,
                           Meta), public form submission, AI endpoints, LENA chat
  lib/                    Domain logic, split by area: automation/, automations/,
                           paymentGateways/, stripe.ts, paystack.ts, sms.ts, email/,
                           twilio/, meta/, lms/, crm/, builder/ (funnel step templates),
                           invoices/, invoicing/, kyc/, governance/, execution/,
                           intelligence/, optimization/, oauth/, encryption.ts,
                           analytics.ts, portal/, google/
  components/             Shared UI components, incl. components/quotes, components/portal
  types/                  Shared TypeScript types, e.g. workflow.types.ts
supabase/migrations/      298 SQL migration files — an older sequential
                           "phaseNN" scheme (e.g. phase3_lms, phase25_quiz_engine,
                           phase29_certificates) tracing the original build-out, plus
                           a newer dated scheme (202607xx/202608xx) doing RLS
                           hardening and newer features (segments, Paystack billing)
docs/                     EMAIL_SMS_BRIDGE.md, SECURITY_REVIEW_LIVE_VERIFICATION.md,
                           automation-audit.md, schema-drift-audit.md,
                           student-portal-audit.md, calendar.md, LIVE_TEST_CHECKLIST.md
workers/, server/, libs/  Supporting background/worker code outside the Next.js app
scripts/                  Operational/one-off scripts (e.g. run_queries.js)
```

Note: `scratch/` and `scratch_test/` hold ad-hoc dev/debug scripts — not part
of the deployable app, and both are gitignored.

---

## Modules & features

### CRM & Sales
- Contacts, deals/opportunities, pipelines, tasks, tags, and segments
  (`src/app/contacts`, `src/app/crm`, `src/app/deals`, `src/app/pipelines`,
  `src/app/tasks`, `src/app/segments`) — all backed by real routes, server
  actions, and Supabase tables. This is the most mature module in the
  codebase.
- Segments have a dedicated table (migration `20260808000002_segments_table.sql`).

### Automation
- A workflow builder and execution engine, backed by Supabase tables for
  workflows, steps, executions, and per-step logs. Triggers/actions are
  dispatched onto an Inngest queue rather than run inline, so they survive
  the originating request ending.
- The general-purpose type vocabulary in `src/types/workflow.types.ts` (5
  trigger types, 9 action types) exists but has **zero import references**
  anywhere in `src/` — it appears to be superseded/unused in practice.
- The actual runtime action registry (`src/lib/automation/actions_registry.ts`,
  imported in 6 files) implements 27 real async action handlers: send_email,
  send_sms, apply_tag, add_tag, create_task, lead_score, update_lead_score,
  set_grade_tag, social_post, lms_enroll, lms_enroll_bundle,
  lms_revoke_access, update_community_privilege, send_whatsapp_template,
  send_whatsapp, lms_update_progress, update_field, move_to_stage,
  notify_team, send_webhook, send_whatsapp_voice, create_opportunity,
  create_invoice, send_invoice, assign_salesperson, notify_slack,
  generate_ai_task.
- A separate trigger-dispatch layer (`src/lib/automations/TriggerDispatcher.ts`)
  enqueues 7 event types onto Inngest: form_submitted, partial_abandoned,
  step_completed, payment_completed, payment_failed, form_viewed,
  recovery_link_opened. An in-code comment there notes these are always
  system-initiated (webhook/cron/EventBus/portal session), never a logged-in
  dashboard user.
- Trigger-firing reliability (i.e., "N of M triggers actually fire in
  production") cannot be verified from source alone — that requires running
  the workflows, not just reading the code.

### Funnel Builder
- A Craft.js-based drag-and-drop builder with 11 defined step types, each
  with a matching starter template file (`src/lib/builder/stepTypes.ts` and
  `src/lib/builder/templates/`): Opt-in Page, Opt-in Thank-you, Sales Page,
  Order Form, Upsell, Downsell, Thank-you, Info Page, Webinar Registration,
  Webinar Thank-you, Inline/Popup Form. All 11 are implemented, not just
  listed as options.
- Funnel orders route through the same shared payment-gateway checkout used
  elsewhere in Finance.

### Marketing
- **Campaigns** (`src/app/campaigns`) — list and detail views.
- **Bulk SMS** (`src/app/sms`) — backed by confirmed Twilio usage (`src/lib/sms.ts`).
- **WhatsApp Broadcasts** (`src/app/whatsapp-broadcasts`) — backed by
  `src/lib/meta/MetaAdapter.ts`/`whatsappWindow.ts`, plus the automation
  actions `send_whatsapp`, `send_whatsapp_template`, `send_whatsapp_voice`
  for automated replies/sequences.
- **Segmentation** — shared with CRM (`src/app/segments`).

### Finance
- **Invoices** (`src/app/invoices`), **Quotes** (`src/app/(dashboard)/quotes`,
  `src/app/actions/quotes.ts`, with a customer-facing view at
  `src/app/portal/quotes`), **Credit Notes**, **Retainers**, and **Chart of
  Accounts** each have a dedicated page/route and a dedicated server-action
  file (`creditNotes.ts`, `retainers.ts`, `chartOfAccounts.ts`) — built, not
  database placeholders.
- Also present under `src/app/finance/`: expense tracking, connected
  accounts, reconciliation, reports, and transactions.

### Payments
See the [Payment Methods](#payment-methods) table below — this area has the
most operational nuance of any module.

### LMS / Learning
- Courses, modules/lessons, quizzes (a "10 quiz types" engine per migration
  `20240101000156_quiz_engine_10_types_master.sql`), enrollment,
  certificates, and student progress tracking are implemented with real
  routes (`src/app/courses`, including `[id]/quiz/[quizId]`, `[id]/learn`,
  `certificates/`), server actions, and a deep migration history (LMS
  phases 3, 5, 25, 29, plus later course-commerce, assignment-submission,
  automation-matrix, and quiz-engine migrations).
- Expert profiles/sessions and cohort/RSVP support exist at the
  database/backend level; UI coverage for these is lighter than the core
  course flow.

### Communication
- **Unified inbox** (`src/app/conversations`) — route exists
  (`ConversationsClient.tsx` + `page.tsx`); internal depth beyond file
  presence was not independently verified in this audit.
- **LENA AI chat** — a real, multi-tab settings surface
  (`src/app/settings/lena-chat/`: Agents, Appearance, Conversations, Embed,
  Knowledge Base tabs) backed by `src/app/api/support/lena/chat/route.ts`.

### Forms
- Builder, public submission handling
  (`src/app/api/public/forms/[id]/submit/route.ts`), analytics,
  automations, governance, partial-submission tracking, and real-time views
  all have dedicated route folders under `src/app/forms/[id]/`.
- **A/B testing** has a dedicated route (`[id]/ab-testing`) but the page
  component is small (~115 lines) — present and routable, but its depth
  relative to a full A/B-testing feature is unconfirmed without a closer
  functional review.

### Settings
- Workspace, billing, branding, developer, AI, integrations hub, LENA chat
  configuration, and support-widget settings all have dedicated pages under
  `src/app/settings/`.

---

## Payment methods

| Provider | Purpose | Connection model | Status |
|---|---|---|---|
| **Stripe** | Customer-facing checkout (per-workspace) | OAuth — Stripe Connect (`getStripeConnectAuthUrl`) | Live. Checkout routes to the workspace's own connected account. Webhook handler idempotently processes refunds by `gateway_refund_id`. |
| **Paystack** | LeadsMind's own SaaS billing **and** customer-facing checkout | BYO-key for customer checkout (workspace pastes a secret key, validated against Paystack's API, stored encrypted). Platform's own subscription billing (Rise/Surge/Infinity/Dynasty tiers) is hardcoded to Paystack via `createPaystackSubscription`, called from both the in-app Billing tab and the public pricing page. | Live for both uses. |
| **PayPal** | Customer-facing checkout | OAuth — Partner Referrals / PayPal Commerce Platform (`getPaypalConnectAuthUrl`), CSRF-protected via a signed state nonce | Live. Stores the returned merchant ID only (not a secret), so no encryption is needed for what's stored. |
| **Flutterwave** | Customer-facing checkout | BYO-key — workspace supplies API key + webhook secret hash, both stored encrypted | Live. |
| **Ozow** | Customer-facing checkout | BYO-key — site code, API key, private key, stored encrypted | Live. |
| **PayFast** | Customer-facing checkout (course purchases, invoice payments, funnel orders, calendar bookings) | Shared platform credentials — **not** per-workspace | Live and actively used, but intentionally **not connectable per-workspace**. The "Connect" card was removed from the Payment Gateways settings UI because that per-workspace connection was decorative — checkout never actually used it; PayFast always ran on one shared platform credential set regardless. |
| **Yoco** | Would be customer-facing checkout | OAuth (planned, not built) | Blocked. Removed from the Payment Gateways UI; an in-code comment states it's blocked on Yoco partner approval and can return once that lands. No functional Yoco integration exists in the codebase today. |
| Peach Payments, SnapScan | — | — | Removed. Never had a payment backend — existed only as "Coming Soon" UI cards, since removed. |

**Two-tier architecture:** LeadsMind's own subscription revenue (the
Rise/Surge/Infinity/Dynasty paid tiers, plus a free Spark tier) is a single
hardcoded path through Paystack subscriptions. A parallel Stripe
`createCheckoutSession` function and a full set of `STRIPE_*_PRICE_ID` env
vars still exist in `src/app/actions/finance.ts`, but nothing in the current
UI calls it — that code path is present but dead for platform billing.
Separately, what a *workspace's own customers* pay through (funnel orders,
invoices, course purchases) is a different, per-workspace concern: some
gateways connect via OAuth to the workspace's own merchant account (Stripe,
PayPal), some are BYO-key (Paystack, Flutterwave, Ozow), and PayFast is the
one exception that runs on a single shared platform credential set rather
than either model.

---


## Setup / getting started

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in real values
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Other scripts (from `package.json`): `npm run build` (runs the Vitest suite
before building, with `NODE_OPTIONS=--max-old-space-size=4096`), `npm run
test` / `test:watch` / `test:coverage` / `test:ui`, `npm run lint`.

`.env.example` (~140 vars) is the source of truth for required
configuration. At minimum, to run the app locally you need:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Auth/security:** `JWT_SECRET`, `JWT_SECRET_KEY`, `ENCRYPTION_KEY`, `KYC_ENCRYPTION_KEY`, `CRON_SECRET`, `WEBHOOK_SIGNING_SECRET`
- **App URL:** `NEXT_PUBLIC_APP_URL`

Payment gateway env vars are only required for the platform-level pieces:
`STRIPE_*` (Connect client ID, plus the currently-unused checkout price
IDs), `PAYFAST_*` (shared platform credentials used directly in checkout),
`PAYSTACK_*` (both the platform's own SaaS-billing plan codes and, for
Connect-style flows, per-workspace credentials that are otherwise entered
in-app rather than via env). Flutterwave, Ozow, and PayPal require no
platform-level env vars — workspaces supply their own credentials through
the UI (PayPal is the partial exception: it authenticates through
LeadsMind's own PayPal partner app, not a workspace-supplied secret).

Everything else in `.env.example` (AI providers, Twilio, Cloudinary, Meta,
Google, LinkedIn, TikTok, Outlook, South African credit-bureau/utility APIs
used for KYC, Vercel deploy tokens, staging/test credentials) is only needed
if you're exercising that specific integration.
