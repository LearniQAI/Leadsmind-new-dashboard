---
type: project
milestone: 5
focus: Production launch & post-launch hardening
status: not-started
---

# Milestone 5 — Production launch & post-launch hardening

Forward-looking milestone. The Full Production-Readiness Plan is a 4-milestone
document; this note captures the work that has to happen **after** Milestone 4's
build is code-complete but before and just after go-live. Nothing here is
started — it is a placeholder to keep the launch gate visible.

Prev: [[Milestone-4]]

## Status — two-bucket

### Verified / Fixed
- _None yet._

### Deliberately Deferred / Open
- Everything below.

## Launch gate

- [ ] Full live verification of both security passes — sections A–E of
      `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` executed against staging, every
      box checked. [[Deferred-Items-Tracker]] D6.
- [ ] RLS rejection tests run as a real non-admin / non-owner member (not the
      service-role key) on every table touched by the lockdown migrations.
      See [[03-Security-Audits/README|Security Audits]] standing rule.
- [ ] `workspace_webhooks` data migration + `DROP TABLE` — D1.
- [ ] `lms_quizzes` + `lms_certificates` / `lms_adaptive_rules*` decision and
      drop — D2, [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]].
- [ ] Smart Tags array-column removal once repointing is verified — D3,
      [[ADR-0006-smart-tags-relational-model]].
- [ ] Final end-to-end regression pass + clean production build (`build.log`).
- [ ] Migrations applied to production in filename order.
- [ ] Payment flows exercised live end-to-end (PayFast purchase → enrollment;
      Stripe / Paystack / PayPal / Flutterwave / Ozow checkout; refund paths).
- [ ] Meta / Twilio inbound webhooks verified against real deliveries in prod.

## Post-launch hardening

- [ ] Burn down remaining [[Deferred-Items-Tracker]] Open rows (D4, D5, D7,
      D8, D10–D13).
- [ ] Milestone 3 backlog (31 tasks) scheduled or explicitly cut — D14,
      [[Milestone-3]].
- [ ] Decommission dead code paths confirmed unused in production
      (Stripe SaaS billing, `workflow.types.ts`).
- [ ] Monitoring / alerting on `webhook_dead_letters` growth and
      `connection_not_found` rates. See [[Communications-Hub]].
