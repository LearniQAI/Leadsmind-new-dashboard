---
type: audit
date: 2026-08-16
area: platform-wide (API routes, RLS, webhooks, payments, LMS trust)
auditor: build team
status: fixes-landed-pending-live-verification
---

# 2026-08-16 — Static code review + live-verification checklist

## Context

Full static pass over the platform: ~157–204 API `route.ts` handlers under
`src/app/api/` plus matching `src/app/actions/`, and the RLS posture across the
migration set. **Every fix in this pass was made by static code review only** —
no running server, no live database, no real session. The companion checklist
`docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` (sections A–E) lists exactly what
still has to be observed executing against staging before any item is treated as
closed.

Tenancy model: `workspace_id` on nearly every table; roles on
`workspace_members.role` = `admin`, `member`, `client`, `viewer`, `hr`,
`payroll`, `compliance`. **No real `owner` role** — some policies check
`role in ('admin','owner')` defensively; `admin` is the true ceiling. Portal
contacts never get a `workspace_members` row.

Traces to [[Milestone-1]] (tasks 1–15) and [[03-Security-Audits/README|Security Audits]] history.

## Verified / Fixed

### Unauthenticated endpoints (IDOR / missing authz)
- Closed unauthenticated access to: KYC document download, compliance report
  download, KYC contact/bureau-check, API-key minting, payroll data, inventory,
  `platform/release-notes` (now 401).
- Cross-workspace access gap fixed across HR Employees / Leave / Time-Tracking.
- `crm/contacts/[id]/verifications` gained a 429 `RECHECK_COOLDOWN` and
  admin/owner-only `forceRecheck`.
- Verification: **static-only** — see checklist section A/D.

### RLS hardening
- `enrollments`, `quiz_attempts`, `course_progress` — dropped ownership-only
  INSERT policies so students can't self-report completion (`20260725000001`).
- `oauth_clients` — admin/owner-only SELECT/INSERT/UPDATE/DELETE (`20260725000002`).
- `webhook_endpoints` — added real admin/owner-scoped policies (previously zero
  policies = accidental deny) (`20260725000003`).
- `workspace_integrations` / `connections` tightened (`20260724000001`,
  `20260725000005`); `ai_usage_credits` writes locked (`20260722000002`);
  public `contacts` insert policy tightened (`20260721000000/1/2`);
  forms RLS leak fixed (`20260718000000`).
- Earlier baseline: `20260715000000_harden_crm_automation_security.sql`.
- Verification: **static-only** — checklist section C requires running the
  rejection inserts as a real non-admin member (not the service-role key).

### Inbound webhook signature verification
- **Twilio** SMS inbound — signature check added.
- **Meta / WhatsApp** — `X-Hub-Signature-256`, HMAC-SHA256 of raw body keyed with
  `META_APP_SECRET`, `crypto.timingSafeEqual` constant-time compare
  (`isValidMetaSignature`, `src/app/api/webhooks/meta/route.ts`).
- Webhook idempotency hardened (`20240101000160`); `webhook_delivery_logs.webhook_id`
  FK repointed `workspace_webhooks → webhook_endpoints` (`20260725000004`);
  webhook secrets now CSPRNG (`whsec_<64 hex>`), encrypted at rest (`iv:hex`).
- OAuth state nonces (`20260723000001`).

### Payment integrity
- PayFast payment-verification bypass (checkout + signature) fixed.
- SARS tax-invoice VAT contradiction fixed — real VAT calculation wired
  (commit `4985b8e8`).
- AI credit top-up free-access exploit closed (`creditGuard.ts` + RLS).
- Payment credentials encrypted at rest (`src/lib/paymentGateways/credentials.ts`,
  `src/lib/encryption.ts`).

### Quiz-grading / certificate trust
- Server-side grading; `markLessonComplete()` enforces enrollment + quiz-pass;
  certificate route rejects issuance without a passing `quiz_attempts` row;
  `/api/lms/progress` returns 403 for a non-enrolled caller. See [[LMS]].

## Deliberately Deferred

Each row also on [[Deferred-Items-Tracker]].

- **Second quiz engine (`lms_quiz_submissions`)** — assessed as lower risk
  (workspace-member-scoped RLS, not reachable by anonymous portal students),
  left unchanged this pass. → later resolved by dropping the table, see
  [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]].
- **`src/lib/automation/lms_actions.ts`** `update_community_privilege` /
  `send_whatsapp_template` still use the session-scoped client — untouched
  because they don't write to any table this pass targeted, not because they
  were cleared.
- **Generic `oauth_clients` UPDATE policy** has zero callers — harmless dead
  policy, not removed.
- **`workspace_webhooks`** marked deprecated via `COMMENT ON TABLE`, **not
  dropped** — needs `scripts/migrate-workspace-webhooks-to-webhook-endpoints.js`
  then a follow-up `DROP TABLE` (checklist section B).
- **AI route mock fallbacks** trigger on key patterns (`sk_mock_key`,
  `PLACEHOLDER`, `sk-proj-O15jtbs`) — ensure production keys don't match.

## Evidence / Verification Notes

- Checklist: `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` — sections A
  (apply migrations in filename order), B (workspace_webhooks data migration),
  C (Postgres-level RLS rejection tests as a real member), D (application-flow
  tests incl. PayFast purchase → enrollment and quiz → certificate), E
  (out-of-scope items).
- Nothing in this pass has been checked off against a live environment yet.
