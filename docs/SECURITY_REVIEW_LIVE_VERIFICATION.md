# Security review — live verification checklist

Every fix below was made through static code review only — no running server, no live database,
no real session. Each item traces cleanly through the code, but Postgres RLS behavior, actual
webhook delivery, and real user flows have not been observed executing. Work through this list
against a real (ideally staging, not production) environment before treating any of these as
fully closed. Checkboxes are for your own tracking; nothing here has been checked off yet.

Migrations must be applied in filename order — they're already numbered sequentially
(`20260725000001` through `20260725000004`) and depend on each other in places (e.g. the webhook
consolidation migration assumes the RLS-hardening migration ran first).

---

## A. Migrations to apply, in order

- [ ] `20260725000001_lock_down_student_self_report_writes.sql` — drops the ownership-only INSERT
      policies on `enrollments`, `quiz_attempts`, `course_progress`.
- [ ] `20260725000002_tighten_oauth_clients_rls_to_admin_owner.sql` — replaces `oauth_clients`
      RLS with admin/owner-only SELECT/INSERT/UPDATE/DELETE.
- [ ] `20260725000003_harden_webhook_endpoints_rls.sql` — adds real admin/owner-scoped RLS
      policies to `webhook_endpoints` (previously zero policies = accidental deny).
- [ ] `20260725000004_consolidate_webhook_tables.sql` — adds `webhook_endpoints.label`, repoints
      the `webhook_delivery_logs.webhook_id` FK from `workspace_webhooks` to `webhook_endpoints`,
      marks `workspace_webhooks` deprecated via `COMMENT ON TABLE` (does **not** drop it).

## B. Manual data-migration step (before dropping `workspace_webhooks`)

- [ ] Run `select count(*) from workspace_webhooks;` — if this is 0, skip to the last checkbox
      in this section.
- [ ] If non-zero: run `node scripts/migrate-workspace-webhooks-to-webhook-endpoints.js` with
      `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ENCRYPTION_KEY` set in the
      environment. Review its console output for per-row migrated secrets.
- [ ] For every row it migrated, hand the printed signing secret to whichever workspace
      admin configured that webhook — it's a **brand-new** secret (the old table never stored
      one), so their receiving endpoint needs to be updated to verify against it.
- [ ] Confirm the script reports `Failed: 0` before proceeding.
- [ ] Only after the above is clean: write and run a follow-up migration that
      `DROP TABLE public.workspace_webhooks;` (deliberately not included in this session's
      migrations — dropping a table is irreversible and I didn't want to bundle it with an
      assumption that the script above had already run).

## C. RLS rejection tests (Postgres-level, not app-level)

For each, use a real non-admin/non-owner workspace member's session (not the service-role key)
and confirm Postgres itself rejects the write — not just that the app never triggers it.

- [ ] `enrollments`: `insert into enrollments (contact_id, course_id, status) values (...)` as a
      student — should fail with a row-level-security violation, not succeed.
- [ ] `quiz_attempts`: same insert attempt with `passed: true` — should fail.
- [ ] `course_progress`: same insert attempt — should fail.
- [ ] `oauth_clients`: insert/delete as a plain `'member'`-role user — should fail. Insert/delete
      as `'admin'`/`'owner'` — should succeed.
- [ ] `webhook_endpoints`: insert/delete as a plain member — should fail. As admin/owner —
      should succeed.

## D. Application-flow tests

- [ ] **PayFast course purchase → enrollment** (Item 11): buy a real paid course through the
      actual PayFast checkout flow, confirm the webhook creates a `paid` invoice, confirm
      `enrollStudent()` grants access only after that invoice exists — and separately confirm a
      direct `enrollments` insert attempt (per section C) is now blocked, so the *only* path to
      enrollment for a paid course is the real payment flow.
- [ ] **Quiz grading + certificate** (Item 13, first engine): take a real quiz through the
      student portal, confirm the score comes back server-graded, confirm `markLessonComplete()`
      now enforces the enrollment + quiz-pass checks added to it, and confirm the certificate
      route (`/api/student/courses/[id]/certificate`) now correctly rejects issuance when a
      quizzed lesson has no passing `quiz_attempts` row.
- [ ] **Quiz grading, second engine** (Item 13, LMS quiz builder / `lms_quiz_submissions`): this
      engine was reasoned about but **not changed** — its RLS is workspace-member-scoped
      (`check_workspace_access`), not reachable by anonymous portal students, so it was assessed
      as lower risk and left alone. Confirm live that this reasoning holds — specifically, that a
      portal student truly has no way to become a `workspace_members` row and reach this table.
- [ ] **`lms/progress` route consolidation** (follow-up to Item 13): confirm a real quiz
      submission still calls `markLessonComplete()` successfully (the quiz-pass row must already
      exist by the time the new check runs — verified statically, not live). Confirm a raw POST
      to `/api/lms/progress` for a course the caller isn't enrolled in returns 403.
- [ ] **OAuth client minting** (Item 4 follow-up): confirm `createOAuthClient`/`deleteOAuthClient`/
      `getOAuthClients` in `src/app/actions/settings.ts` now reject a plain-member session and
      succeed for admin/owner.
- [ ] **`createWebhook` CSPRNG fix** (Item 4 follow-up): confirm new webhook secrets look like
      `whsec_<64 hex chars>`, not the old short `Math.random()`-based format.
- [ ] **Legacy webhook actions** (Item 10 follow-up): confirm `getWebhooks`/`createWebhook`/
      `deleteWebhook`/`getWebhookLogs` in `settings.ts` now reject non-admin sessions, and that
      the created secret is encrypted at rest (`select secret from webhook_endpoints` should show
      `iv:hex` format, not a readable `whsec_...` string).
- [ ] **Webhook dispatcher decrypt fallback** (Item 10 follow-up): confirm
      `webhookDispatch.ts`'s `resolveWebhookSecret()` correctly decrypts a newly-created
      (encrypted) secret and produces a valid HMAC signature the receiving endpoint can verify.
      If any pre-existing plaintext-secret rows exist from before the encryption fix, confirm the
      fallback path still signs correctly for those too.
- [ ] **Webhook table consolidation, end to end** (Item 10 + follow-up): create a webhook via
      `/settings/developer`, trigger a real dispatch-worthy event (e.g. mark an invoice paid),
      and confirm (a) an HTTP POST actually arrives at the target URL, and (b) a
      `webhook_delivery_logs` row is now successfully recorded (previously impossible — see the
      FK bug above).
- [ ] **`crm/contacts/[id]/verifications` cooldown** (Item 3 follow-up): call this route twice in
      a row for the same contact/checkType and confirm the second call is rejected with 429
      `RECHECK_COOLDOWN`; confirm `forceRecheck: true` is rejected for a non-admin/owner caller
      and accepted for admin/owner.
- [ ] **`reputation/send-request`** (Item 15 follow-up): call as a plain member — expect 403.
      Call as admin/owner with a mix of real and fabricated contacts in the payload — expect the
      fabricated ones to be silently dropped (counted in `failed`) and only real contacts to
      actually receive a message.
- [ ] **`platform/release-notes`**: confirm an unauthenticated request now gets 401, and that
      the two real callers (`DashboardHeader.tsx`, `HelpDrawer.tsx`) still load release notes
      normally for a logged-in user.

## E. Known, deliberately out-of-scope items (not fixed, just flagged during this review)

These came up during the review but were left alone for stated reasons — worth a conscious
decision at some point rather than being silently forgotten:

- `src/lib/automation/lms_actions.ts`'s `update_community_privilege`/`send_whatsapp_template`
  still use the session-scoped client — untouched because they don't write to any of the tables
  this session's fixes targeted, not because they were reviewed and cleared.
- The generic OAuth-provider `oauth_clients` UPDATE policy has zero callers anywhere in the app —
  harmless dead policy, not removed.
- `workspace_webhooks` itself is marked deprecated, not dropped (see section B).
