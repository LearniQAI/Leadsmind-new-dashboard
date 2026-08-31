---
type: project
milestone: 2
focus: Core Workflows, Multi-Gateway Payments & Marketing Automation
status: delivered
---

# Milestone 2 — Core Workflows, Multi-Gateway Payments & Marketing Automation

Week 2 of the Full Production-Readiness Plan (25 tasks). Makes the automation
engine real, adds the remaining payment gateways, builds out the Finance
screens, and stands up the marketing-automation modules.

## Status — two-bucket

### Verified / Fixed
- Smart Tags Engine — relational model + data migration landed
  (`20260729000000/1`, `src/modules/tags/`). Decision:
  [[ADR-0006-smart-tags-relational-model]].
- `webhook_delivery_logs.webhook_id` FK repointed to `webhook_endpoints`
  (`20260725000004`) — was making delivery logging impossible.
  [[Deferred-Items-Tracker]] R1.
- Finance server actions present in-tree: `stripeConnect.ts`, `creditNotes.ts`,
  `retainers.ts`, `chartOfAccounts.ts`, atomic credit-notes / retainer-apply
  migrations (`20260903000000/1`).
- Payment-gateway REST clients present:
  `src/lib/paymentGateways/{paypal,paystack,flutterwave,ozow}Gateway.ts` + webhooks.
- Stripe → Paystack SaaS billing migration done — platform billing runs only
  through `createPaystackSubscription`.

### Deliberately Deferred / Open
- Dead automation vocabulary `src/types/workflow.types.ts` — [[Deferred-Items-Tracker]] D13.
- Dead Stripe `createCheckoutSession` path left in `finance.ts` — D10.
- Yoco integration blocked on partner approval — D11.
- Form A/B testing page is shallow (~115 lines) — needs a real build ([[CRM]]).
- Trigger-firing reliability in production not verifiable from source — needs
  live runs.

## Scope

### Automation / Workflow Builder
- Single working Workflow Builder (`src/app/automations`, `src/app/automation`,
  `src/lib/automation/actions_registry.ts` — 27 runtime action handlers,
  `src/lib/automations/TriggerDispatcher.ts` — 7 Inngest event types).
- New `create/send invoice` automation action; WhatsApp step type in the editor.
- Fix course-completion triggers, unreachable Automation Recipes, Workflow
  History + "Total Executions" counter, webhook-delivery table mismatch
  (`webhook_delivery_logs.webhook_id` FK repointed to `webhook_endpoints`).
- Remove or reconnect the dead `src/types/workflow.types.ts` vocabulary (zero
  imports). See [[Marketing-Automation]].

### Finance screens
- Real Billing Settings; Stripe Connect built / correctly relabelled with key
  encryption verified; Credit Notes screen; wire in existing Retainers screen;
  Chart of Accounts screen. Server actions: `billing`, `stripeConnect.ts`,
  `creditNotes.ts`, `retainers.ts`, `chartOfAccounts.ts`.
- Reconcile the Payment Gateways settings page against what checkout actually
  uses. See [[Finance-Billing]].

### Multi-gateway payments (build)
- Real integrations: **PayPal**, **Paystack**, **Flutterwave**, **Ozow**,
  **Yoco** (Yoco blocked on partner approval — removed from UI).
  `src/lib/paymentGateways/{paypalGateway,paystackGateway,flutterwaveGateway,ozowGateway}.ts`,
  webhooks under `src/app/api/webhooks/{paypal,paystack,flutterwave,ozow}/`.
- Enable PayFast recurring / subscription billing.
- **Stripe → Paystack SaaS billing migration**: LeadsMind's own subscription
  revenue (Spark/Rise/Surge/Infinity/Dynasty) moved to a single hardcoded
  Paystack path (`createPaystackSubscription`); the Stripe `createCheckoutSession`
  path + `STRIPE_*_PRICE_ID` vars remain but are dead for platform billing.

### Marketing modules (build)
- True multi-step email drip / sequence builder (`src/app/sequences`,
  `src/app/actions/email_sequences.ts`).
- Rule-based contact segmentation (`src/app/segments`, `segments.ts`,
  `20260808000002_segments_table.sql`).
- Dedicated bulk SMS marketing module with scheduling (`src/app/sms`,
  `src/app/actions/bulk_sms.ts`, `src/lib/sms.ts`).
- WhatsApp chatbot builder with automated replies + broadcast lists
  (`src/app/whatsapp-broadcasts`, `whatsapp_broadcast.ts`,
  `whatsapp_bot_rules.ts`, `src/lib/meta/`). See [[Marketing-Automation]].
- Real Form Analytics + A/B testing (`src/app/forms/[id]/ab-testing`). See [[CRM]].

### Also in this window (per known scope)
- Dashboard redesign.
- Smart Tags Engine (`20260729000000_smart_tags_schema.sql` +
  `20260729000001` data migration, `src/modules/tags/`). See [[CRM]].
- Craft.js website builder overhaul (`src/app/websites`, `src/app/funnels`,
  `src/lib/builder/`). See [[CRM]] / Funnel Builder notes.

## Related modules
[[Marketing-Automation]] · [[Finance-Billing]] · [[CRM]] · [[AI-Suite]]

## Prev / Next
[[Milestone-1]] · [[Milestone-3]]
