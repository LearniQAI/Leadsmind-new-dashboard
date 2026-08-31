---
type: audit
date: 2026-08-31
area: financial / KYC / identity / storage / forum tables; OAuth token storage
auditor: build team
status: fixes-landed-pending-live-verification
---

# 2026-08-31 — Lockdown migration sweep

## Context

Follow-on hardening pass focused on tables and buckets that the
[[2026-08-16-static-code-review]] flagged as still publicly reachable or
weakly scoped, plus at-rest crypto upgrades. Traces to [[Milestone-1]] (task 15
re-verification), [[Milestone-4]] (tasks 86–87 final sweep), and
[[03-Security-Audits/README|Security Audits]].

## Verified / Fixed

- **Financial / KYC / identity tables locked down** —
  `20260827000000_lockdown_financial_kyc_identity_tables.sql`.
- **Remaining public tables locked down** —
  `20260828000000_lockdown_remaining_public_tables.sql`.
- **Storage buckets locked down** —
  `20260829000000_lockdown_storage_buckets.sql`.
- **OAuth tokens hashed at rest** —
  `20260830000000_hash_oauth_tokens.sql`. See [[Social-OAuth-Integrations]].
- **KYC document encryption moved to AES-GCM** —
  `20260831000000_kyc_document_encryption_gcm.sql` (commit `5d27b271`).
- **Campaign RPCs + atomic `total_sent` locked** —
  `20260902000000_lockdown_campaign_rpcs_and_atomic_total_sent.sql`. See
  [[Marketing-Automation]].
- **Forum workspace isolation** — `20260903000017_lockdown_forum_workspace_isolation.sql`.
- **Blog public isolation** — `20260822000002_blog_public_isolation.sql`;
  partial-submission RLS restored — `20260822000100`.
- **Manual invoice-payment audit trail** — `20260901000000_invoice_manual_payment_audit.sql`.
  See [[Finance-Billing]].
- **Custom/sender domain actions** restricted to `['admin','owner']` on both
  generations — see [[ADR-0004-sender-domains-vs-custom-domains]].
- Verification for all of the above: **static-only**. Apply in filename order;
  re-run the section-C RLS rejection tests from the 2026-08-16 checklist against
  the newly locked tables, as a real non-admin member.

## Deliberately Deferred

Each row also on [[Deferred-Items-Tracker]].

- **`lms_quizzes` + `lms_certificates` / `lms_adaptive_rules` /
  `lms_adaptive_rules_v2`** — legacy quiz children dropped
  (`20260903000016`), but `lms_quizzes` itself left in place: three unscoped
  tables hold a real FK into it. Needs a deliberate follow-up decision —
  [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]].
- **`workspace_webhooks` drop** — still pending the data-migration script +
  follow-up `DROP TABLE` (carried over from the 2026-08-16 pass).
- **Array tag columns** (`contacts.tags`, `opportunities.tags`,
  `conversations.tags`, `pages.tags`, `lead_finder_results.smart_tags`) — to be
  dropped only once Smart Tags repointing is verified in application code. See
  [[ADR-0006-smart-tags-relational-model]] (if present) / [[CRM]].
- **Full live verification of both security passes** — sections A–E of
  `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` remain unchecked.

## Evidence / Verification Notes

- Migration series `202608xx`–`202609xx` in `supabase/migrations/`.
- `git log` references: `5d27b271` (KYC GCM), `4985b8e8` (tenant-isolation +
  VAT, prior pass).
- Live verification still owed: run every lockdown migration on staging, confirm
  a plain member session is rejected by Postgres on the newly-scoped tables, and
  confirm the real app flows (KYC upload/download, invoice payment, forum
  read/write, blog public view) still work for authorized users.
