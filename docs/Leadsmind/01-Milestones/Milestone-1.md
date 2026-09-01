---
type: project
milestone: 1
focus: Security, Data Protection & Payment Foundation
status: delivered
---

# Milestone 1 — Security, Data Protection & Payment Foundation

Week 1 of the Full Production-Readiness Plan (18 tasks). Foundation layer: close
unauthenticated / cross-tenant data exposure, verify inbound webhook signatures,
fix payment-integrity bypasses, and put real credential handling under the
payment gateways.

## Status — two-bucket

### Verified / Fixed (static review; live verification still owed)
- All 15 security-remediation tasks + 3 payment-foundation tasks have code /
  migration changes landed. Detail and evidence:
  [[2026-08-16-static-code-review]], [[2026-08-31-lockdown-sweep]].
- Key migrations applied in-tree: `20260715000000`, `20260721*`,
  `20260722000002`, `20260723000001`, `20260724000001`, `20260725000001..000005`,
  `20260827000000`–`20260831000000`.

### Deliberately Deferred / Open
- **Full live verification** of every fix — sections A–E of
  `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` are unchecked. → [[Deferred-Items-Tracker]] D6.
- `workspace_webhooks` drop (D1), `lms_actions.ts` session-scoped client (D4),
  dead `oauth_clients` UPDATE policy (D5), AI mock-key fallbacks (D7).

## Scope

### Security remediation
- Close unauthenticated download / data endpoints: KYC documents, compliance
  reports, KYC contact/bureau checks, API-key minting, payroll data, inventory.
- Fix cross-workspace (IDOR) access gap across HR Employees, Leave &
  Time-Tracking (`src/app/api/hr/*`).
- Add signature verification to inbound **Twilio** SMS webhook
  (`src/app/api/webhooks/twilio/inbound/route.ts`) and inbound **Meta / WhatsApp**
  webhook (`src/app/api/webhooks/meta/route.ts` — `X-Hub-Signature-256`, HMAC-SHA256
  of raw body keyed with `META_APP_SECRET`, constant-time compare).
- Secure Integrations, Webhook and Domain-verification settings endpoints
  (`src/app/api/settings/*`, `src/app/actions/settings.ts`).
- Fix PayFast payment-verification bypass (checkout + signature).
- Fix AI credit top-up free-access exploit
  (`20260722000002_lock_down_ai_usage_credits_writes.sql`, `src/lib/ai/creditGuard.ts`).
- Fix quiz-grading trust exploit — server-side grading; enrollment + quiz-pass
  checks in `markLessonComplete()`; certificate route rejects issuance without a
  passing `quiz_attempts` row. See [[LMS]].
- Fix SARS tax invoice VAT contradiction (real VAT calculation wired —
  commit `4985b8e8`).
- Full audit sweep of remaining unverified API routes (~157–204 `route.ts`
  handlers). See [[03-Security-Audits/README|Security Audits]].

### Payment foundation
- Real OAuth-based "Connect" flow for payment gateways, replacing the form that
  discarded credentials.
- Encryption-at-rest for stored payment credentials
  (`src/lib/paymentGateways/credentials.ts`, `src/lib/encryption.ts`).
- Refund handling for PayFast and Stripe (`src/app/actions/refunds.ts`,
  `src/app/api/webhooks/stripe/route.ts` — idempotent by `gateway_refund_id`).

## Evidence in repo
- `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` — the live-verification checklist
  produced by this milestone's static review.
- Migrations `20260715000000_harden_crm_automation_security.sql`,
  `20260721*`, `20260722000002`, `20260723000001_oauth_state_nonces.sql`,
  `20260724000001_tighten_workspace_integrations_rls.sql`,
  `20260725000001..000005`.
- Commit `4985b8e8` — "close critical/high tenant-isolation and payment-integrity
  gaps; wire real VAT calculation".

## Related modules
[[Finance-Billing]] · [[Communications-Hub]] · [[LMS]] · [[03-Security-Audits/README|Security Audits]]

## Next
[[Milestone-2]]
