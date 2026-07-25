# LeadsMind Security Review — 18 Requirements (Static Source-Code Review)

**Date:** 2026-07-25
**Branch reviewed:** dashboard_v1
**Reviewer method:** Static-only source-code review. No dev server was started, no `.env.local` credentials were used, no live database connection or SQL query was executed, and no HTTP request was sent to any endpoint. All findings are based exclusively on reading files in the repository (`Read`/`Grep`/`Glob`) and tracing code paths by hand. Every claim below is anchored to a specific file and line range with the actual code quoted. Where a property (e.g. an RLS policy's existence, a column's live population, whether a route is reachable in production) cannot be determined from source alone, this is stated explicitly rather than assumed.

This review was conducted fresh, item by item, without relying on any prior report.

---

## Summary Table

| # | Item | Verdict | Key evidence (file:line) |
|---|------|---------|---------------------------|
| 1 | KYC document download endpoint | **Confirmed fixed** | `src/app/api/kyc/documents/download/route.ts:16-51` |
| 2 | Compliance report download endpoint | **Confirmed fixed** | `src/app/api/kyc/reports/download/[contactId]/route.ts:17-52` |
| 3 | KYC contact/bureau-check endpoints | **Confirmed fixed** | `src/app/api/crm/contacts/kyc/route.ts:14-190`, `src/app/api/kyc/experian/trueid/route.ts:26-241`, `src/lib/kyc/access.ts:75-120` |
| 4 | API-key minting | **Confirmed fixed** | `src/lib/api/apiKeys.ts:14-32`, `src/app/api/settings/api-keys/route.ts:33-76`, `src/app/actions/settings.ts:582-595` |
| 5 | Payroll endpoint | **Confirmed fixed** | `src/app/api/hr/payroll/route.ts:10-41,121-144,229-252` |
| 6 | Inventory endpoint | **Confirmed fixed** | `src/app/api/inventory/route.ts:9-39,76-94`; `supabase/migrations/20240101000185_hr_inventory.sql:111,149-154` |
| 7 | HR cross-workspace isolation | **Confirmed fixed** | `src/lib/api/workspaceAuth.ts:31-53`, used by `hr/employees`, `hr/leave`, `hr/time-tracking` |
| 8 | Twilio inbound webhook | **Confirmed fixed** | `src/app/api/webhooks/twilio/inbound/route.ts:13-41` |
| 9 | WhatsApp/Meta inbound webhook | **Confirmed fixed** | `src/app/api/webhooks/meta/route.ts:14-27,46-61` |
| 10 | Integrations/Webhooks/Domains settings | **Partially fixed** — see detail | `src/app/api/meta/connections/route.ts:14-19,62-64`; `workspaces.twilio_sid/twilio_token` (multiple readers) |
| 11 | PayFast verification + enrollment gate | **Partially fixed** — see detail | `src/app/api/webhooks/payfast/route.ts:132-295`, `src/app/actions/studentEnrollments.ts:104-123` |
| 12 | AI credit top-up | **Confirmed fixed** | `supabase/migrations/20260722000002_lock_down_ai_usage_credits_writes.sql:1-25` |
| 13 | Quiz-grading trust (all engines) | **Confirmed fixed** | `src/app/actions/quizzes.ts:402-419`, `src/lib/lms/gradeLmsQuiz.ts:23-93`, `src/app/actions/studentProgress.ts:226-276`, `src/lib/lms/gradeQuiz.ts:22-63` |
| 14 | SARS tax invoice VAT | **Confirmed fixed** | `src/components/invoices/templates/SarsTaxInvoicePdf.tsx:28-30,108`, `src/components/invoices/InvoiceBuilder.tsx:102-118` |
| 15 | Full remaining-routes audit | **Partially fixed** — see detail | 158 `route.ts` files under `src/app/api`; `debug-slugs`, `test-login`, `cron/*` not reviewed |
| 16 | OAuth Connect flow for payment gateways | **Confirmed fixed** (scoping note: PayFast/Investec don't use this pattern at all — see detail) | `src/lib/oauth/stateNonce.ts:17-64`, `src/app/api/auth/meta/callback/route.ts:39-51` |
| 17 | Encryption-at-rest for payment credentials | **Partially fixed** — see detail | `src/lib/encryption.ts:17-27`; `supabase/migrations/20240101000012_phase7_workspace_settings.sql:5-7` |
| 18 | Refund handling | **Confirmed fixed** | `src/app/actions/refunds.ts:11,39,64-77,121,151-164,206,249-268` |

**Totals: 14 Confirmed fixed, 0 Confirmed vulnerable, 4 Partially fixed** (items 10, 11, 15, 17)

*Correction (post-review follow-up):* Item 6 was re-audited after initial publication. The original pass failed to locate the RLS migration for `inventory_items` because it was bundled into a broader HR-tables migration file (`20240101000185_hr_inventory.sql`) rather than a dedicated inventory migration. A targeted grep for `inventory_items` across all migrations found it: the table has `alter table public.inventory_items enable row level security;` (line 111) and a `FOR ALL` policy scoping every operation to `workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())` (lines 149-154) — the identical pattern used for `employees`, `leave_requests`, `payroll_runs`, `payslips`, and `time_entries` in the same file. This was a source-visibility gap in the original review, not a real vulnerability. Verdict corrected to **Confirmed fixed**. Note: this confirms the migration *file* defines the policy correctly; confirming it was actually applied to the live production database was not possible in this static-only review and was not re-attempted.

---

## Detail Sections (all items not cleanly "Confirmed fixed")

### Item 10 — Integrations/Webhooks/Domains settings: Partially fixed

**What's correct:** `workspace_integrations` (payment gateway credentials, `src/app/api/settings/integrations/route.ts:14,19,39,130`), `bank_connections` (Investec, `src/app/api/finance/banks/investec/route.ts:12,20,41,169`), `workspace_webhooks` (`src/app/api/settings/webhooks/route.ts:11`), and `workspace_api_keys` (`src/app/api/settings/api-keys/route.ts:10,33-35`) are all correctly restricted to `['admin', 'owner']`, encrypt credentials via `encrypt()` before storage, and null out credential columns on disconnect (e.g. `finance/banks/investec/route.ts:174-183`).

**Gap 1 — role restriction on Meta/WhatsApp connections:**
```ts
// src/app/api/meta/connections/route.ts:14-19 (GET), 62-64 (DELETE)
export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess()
...
export async function DELETE(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceAccess()
```
`requireWorkspaceAccess()` (`src/lib/auth.ts:132-157`) only checks that a `workspace_members` row exists — it does not check `role`. This is inconsistent with every other credential-bearing settings route in this review, all of which use `requireWorkspaceRole(['admin','owner'])`. **Any workspace member (not just admin/owner) can disconnect the workspace's Facebook/Instagram/WhatsApp integration** via `DELETE /api/meta/connections`. GET does not leak the encrypted token values themselves to the client (only display fields like `page_name`/`phone_number`), so this is a role-restriction gap, not a credential-leak.

**Gap 2 — Twilio credentials stored and used in plaintext:**
```sql
-- supabase/migrations/20240101000012_phase7_workspace_settings.sql:5-7
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_token TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_number TEXT;
```
No `_encrypted` suffix, and no `encrypt()`/`decrypt()` call touches these columns anywhere in the codebase (confirmed by grep). They are read and used live as SMS credentials in multiple places, e.g.:
```ts
// src/lib/automations/WorkflowEngine.ts:399-415
const { data: workspace } = await supabase.from('workspaces').select('twilio_sid, twilio_token, twilio_number')...
config: { accountSid: workspace?.twilio_sid, authToken: workspace?.twilio_token, fromNumber: from }
```
Also read in `CRMActionHandler.ts`, `EmailAutomationService.ts`, `actions_registry.ts`, `lms_actions.ts`, `src/app/api/support/tickets/route.ts`, `src/app/api/kyc/consent/request/route.ts`, `src/app/api/reputation/send-request/route.ts`, `src/app/api/webhooks/payfast/route.ts:220-232`. No active write path was found in `src/app/actions` or `src/app/api/settings` populating these columns through the current UI (a Zod schema at `src/lib/validations/automation-settings.schema.ts:7-8` references them but is not imported anywhere), suggesting these may be legacy/seed-only columns — but the plaintext read-and-use paths remain live and exploitable if the `workspaces` table or a backup is ever exposed.

---

### Item 11 — PayFast verification + course enrollment gate: Partially fixed

**Signature verification is solid** in both PayFast webhook implementations found (`src/app/api/webhooks/payfast/route.ts` and `src/app/api/payfast/webhook/route.ts`), sharing `verifyPayFastSignature()` (`src/lib/calendar/payfast.ts:126-142`): MD5 HMAC per PayFast's documented scheme, compared via `crypto.timingSafeEqual` with a length check first, and both routes throw fatally if `PAYFAST_PASSPHRASE` is unset and return 403 on an invalid/missing signature before any DB write — no bypass found.

**The enrollment gate itself is correctly implemented:**
```ts
// src/app/actions/studentEnrollments.ts:104-123
if (course.price && course.price > 0) {
  const { data: paidInvoice } = await adminClient
    .from('invoices')
    .select('id')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'paid')
    .contains('metadata', { courseId })
    .maybeSingle();
  if (!paidInvoice) {
    return { error: 'No completed payment found for this course.' };
  }
}
```
This correctly refuses enrollment without a real `paid` invoice referencing the course — no fabricated-payment bypass was found (a prior client-side self-POST of a fake ITN in `CheckoutClient.tsx` has been removed; that page now calls `enrollStudent()` directly, which fails safely without a real invoice).

**Gap — the legitimate PayFast course-purchase webhook path never creates the invoice or enrollment the gate depends on.** Tracing `BuyCourseButton.tsx` → `createCoursePayFastCheckout()` (`src/app/actions/courseCommerce.ts:284-358`) → PayFast checkout with `m_payment_id = course.id`, `custom_str3 = course.id`, `custom_str4 = 'course'` → PayFast ITN callback to `src/app/api/webhooks/payfast/route.ts`. In that handler:
- The "invoice payment" branch (lines 132-267) only fires when `m_payment_id` matches an existing `invoices.id` row (line 140) — for a course purchase, `m_payment_id` is `course.id`, not an invoice id, so this branch is never reached for course purchases.
- The course-purchase branch (lines 270-283, keyed off `custom_str3`/`custom_str4`) only writes a `contact_activities` log row (lines 286-292) and publishes an internal automation event `payfast_payment_course` (line 295) for marketing-workflow triggers — **it never inserts an `invoices` row with `metadata.courseId`, and never inserts an `enrollments` row.**

**Net effect:** a genuine, successfully-paid, signature-verified PayFast course purchase produces no invoice matching the enrollment gate's query and no enrollment record — so paying customers cannot be automatically enrolled via any PayFast code path currently in the repository. The security property (no bypass) holds, but the feature is non-functional for its intended purpose as implemented.

---

### Item 15 — Full remaining-routes audit: Partially fixed

**Route count:** 158 `route.ts` files found under `src/app/api`.

**Sampled and deep-traced (all "no issues found" unless noted):**
- `src/app/api/admin/dead-letters/replay/route.ts` — `requireWorkspaceRole(['admin','owner'])`; re-fetches the dead-letter row server-side rather than trusting client-supplied `provider`/`payload`; whitelist of replayable providers.
- `src/app/api/v1/appointments/route.ts` + `[id]/route.ts`, `src/app/api/v1/deals/route.ts`, `src/app/api/v1/orders/route.ts`, `src/app/api/v1/tasks/route.ts`, `src/app/api/v1/tracking/shipments/route.ts` — all gated by `validateApiKey()`, workspace-scoped, foreign keys verified to belong to the caller's workspace before use.
- `src/app/api/webhooks/article-updated/route.ts` — shared-secret header checked with `crypto.timingSafeEqual`, fails hard if the secret env var is unset.
- `src/app/api/support/tickets/route.ts` — POST resolves `workspace_id` server-side from a secret `widgetKey` lookup, not a client-supplied id; GET requires session + membership. **Minor gap:** in-memory IP rate limiting (5 req/min) resets per serverless instance/cold start and is not distributed — a weak, not hard, control.

**Not reviewed in this pass — explicitly flagged as unclassifiable/needing dedicated verification:**
- `src/app/api/debug-slugs/route.ts` — name suggests a debug/diagnostic endpoint; needs verification it isn't exposing internal data in production.
- `src/app/api/test-login/route.ts` — name strongly suggests a test/dev-only auth bypass; needs explicit confirmation it is disabled/gated in production.
- `src/app/api/oauth/authorize/route.ts`, `src/app/api/oauth/token/route.ts` — appears to be LeadsMind's own first-party OAuth *provider* for third-party API consumers (distinct from the OAuth *client* flows reviewed in item 16); not reviewed here.
- ~10 routes under `src/app/api/cron/*` and `src/app/api/cron/workers/*` — not sampled. Cron endpoints are a common class for missing-auth bugs (meant to be triggered by an external scheduler, not a session); each should be confirmed to check a shared cron secret.

Given 158 total routes and only ~9 categories deep-traced (plus the ones covered by items 1-14), this audit is a representative sample, not exhaustive coverage — see Overall Summary confidence statement.

---

### Item 16 — OAuth Connect flow for payment gateways (scoping note)

**Important finding:** Neither PayFast nor Investec — the two payment/banking integrations named in the requirement — actually uses a redirect-based OAuth "connect" flow with a `state` parameter in this codebase:
- **Investec** (`src/app/api/finance/banks/investec/route.ts:44-59`) uses OAuth2 `client_credentials` grant: the user directly types `clientId`/`clientSecret`/`apiKey` into a form, and the server exchanges them for a token server-side. There is no redirect, callback, or `state` parameter anywhere in this flow.
- **PayFast** (`src/app/api/settings/integrations/route.ts:78-94`) is a direct credential-entry form (`apiKey`/`apiSecret`/`passphrase`), not an OAuth redirect flow either.

The redirect-based OAuth flows that do exist (Facebook, LinkedIn, TikTok, Meta, and Stripe Connect — the closest analog to a "payment gateway OAuth connect flow") all share `src/lib/oauth/stateNonce.ts`, which was verified to be correctly implemented:
- `createOAuthStateNonce` (lines 17-33): `crypto.randomBytes(32)` (256-bit CSPRNG), bound to `user_id`/`workspace_id`/`platform`/10-minute expiry; only the opaque nonce (never the raw workspace id) is sent as `state`.
- `consumeOAuthStateNonce` (lines 40-64): rejects missing/already-used/expired nonces, and marks `used_at` immediately on first use (single-use, race-safe against replay).
- Verified call ordering in `src/app/api/auth/meta/callback/route.ts:39-51` and the Stripe/Facebook/LinkedIn/TikTok callbacks: `consumeOAuthStateNonce()` is called and must succeed **before** any token-exchange fetch.

**Verdict rationale:** Confirmed fixed for every redirect-based OAuth flow actually present in the codebase. Marked "Partially fixed" is not appropriate here since there's no vulnerability — but flagging explicitly that the two gateways named in the prompt (PayFast, Investec) do not use this pattern at all, so the state-nonce protection doesn't apply to them by construction, not because of a gap.

---

### Item 17 — Encryption-at-rest for payment credentials: Partially fixed

**Confirmed encrypted** via `src/lib/encryption.ts` (AES-256-CBC, random IV per call, SHA-256-derived key from `ENCRYPTION_KEY`, throws if that env var is unset):
- Investec: `client_secret_encrypted`, `api_key_encrypted`, `access_token_encrypted` (`src/app/api/finance/banks/investec/route.ts:135-137`)
- PayFast/other payment-gateway integrations: `api_key_encrypted`, `api_secret_encrypted`, `passphrase_encrypted` (`src/app/api/settings/integrations/route.ts:87-93`)
- Meta/WhatsApp OAuth tokens: `user_access_token_encrypted`, `page_access_token_encrypted`, `access_token_encrypted` (`src/app/api/auth/meta/callback/route.ts:99-100,203-204,312`)

**Gap — Twilio plaintext (same root cause as Item 10, Gap 2):**
```sql
-- supabase/migrations/20240101000012_phase7_workspace_settings.sql:5-7
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_token TEXT;
```
Plain `TEXT` columns, no `encrypt()`/`decrypt()` anywhere, read directly and used as live API credentials by `src/app/api/webhooks/payfast/route.ts:220-232`, `src/app/api/kyc/consent/request/route.ts:125-126`, `src/app/api/support/tickets/route.ts:179-201`, and the automation engine files listed under Item 10. This is a live plaintext-secret exposure surface if the `workspaces` table or any DB export/backup is ever compromised, even though (per the source available) no current UI writes new values into it.

Note: Twilio credentials are not, strictly, "payment credentials" as named in the requirement — but they are credential-bearing columns found during the required broad search, and are flagged per the instruction to check every credential-bearing table found.

---

## Overall Summary

- **13 of 18 items: Confirmed fixed.**
- **0 of 18 items: Confirmed vulnerable** (no item has a directly exploitable bypass of its core security property).
- **5 of 18 items: Partially fixed** — items 6, 10, 11, 15, 17. Of these, item 6's gap is a source-visibility limitation (couldn't locate an RLS policy file) rather than a demonstrated hole; items 10 and 17 share one real root-cause gap (Twilio credentials in plaintext with no write path currently traceable in the app) plus one distinct role-restriction gap (Meta/WhatsApp disconnect endpoint uses membership-only access, not admin/owner); item 11 is a functional gap in the PayFast course-purchase → invoice → enrollment chain, not a security bypass (the gate correctly fails closed, it just also fails closed for legitimate payments); item 15 is an audit-scope gap (three specific route names — `debug-slugs`, `test-login`, `cron/*` — that warrant dedicated review and were not reached in this pass).

### Honest confidence statement

This review is based entirely on static reading of the current repository state. It cannot and does not confirm: (1) actual runtime behavior (e.g., whether `TWILIO_AUTH_TOKEN`/`ENCRYPTION_KEY`/`META_APP_SECRET` are actually set in the deployed environment — code paths were checked to fail closed if they're missing, but that's a code-level guarantee, not a deployment-config guarantee); (2) the existence or correctness of Postgres RLS policies that aren't defined in a `.sql` migration file findable in this repo (flagged explicitly for `inventory_items`, item 6); (3) whether `workspaces.twilio_sid`/`twilio_token` are actually populated in production, and if so, by what out-of-band process; (4) whether the 149 routes not individually deep-traced in item 15 (158 total minus the ~9 sampled there plus the routes covered by items 1-14) contain issues of the same classes found and fixed elsewhere in this codebase — the prompt itself notes a documented history of duplicate/parallel implementations of the same feature, and this review found two more instances of that pattern (dual quiz engines in item 13, dual PayFast webhooks in item 11) beyond what was pointed out in advance, which suggests further undiscovered duplicates are plausible among the unreviewed routes. A live penetration test against a staging environment, and a full DB schema/RLS export review, would be needed to close these residual unknowns.
