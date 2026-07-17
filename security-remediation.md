# Priority 0 Security Remediation — Platform-Wide Action-Layer Fixes

Tracking document for the 7 Critical, live, platform-wide security gaps identified in `action-security-triage.md`'s project-wide sweep of `src/app/actions/*.ts`. Structured identically to `crm.md` (finding → fix → live verification → resolved status), but scoped to the platform-wide triage rather than the CRM module — `contacts.ts`, `quotes.ts`, and `finance.ts` are explicitly out of scope here (already fixed and verified in the CRM pass, see `crm.md`).

Every app-layer fix in this document reuses the shared `requireWorkspaceAccess()` helper from `src/lib/auth.ts` — no parallel auth-check implementation was written.

---

## 1. `auth.ts: setActiveWorkspace` — no membership check on workspace switch

**Module:** Core platform infrastructure (auth/workspace cookie).

**Finding:** `setActiveWorkspace(workspaceId)` (`src/app/actions/auth.ts`) set the `active_workspace_id` cookie for any caller-supplied `workspaceId` with zero check that the authenticated user actually belongs to that workspace. Since this cookie is the upstream trust source `getCurrentWorkspaceId()`/`requireWorkspaceAccess()`-adjacent code across the app reads from, this was the highest-leverage single gap in the triage.

**Fix:** `src/app/actions/auth.ts` — `setActiveWorkspace` now calls `supabase.auth.getUser()` and requires a real `workspace_members` row for `(workspaceId, user.id)` before setting the cookie; returns `{ success: false, error }` (not a silent no-op) when the user isn't authenticated or isn't a member.

**Call sites updated to handle a rejected switch** (all previously assumed the call always succeeded):
- `src/form/auth/SignUp/cover-form.tsx` — logs a non-blocking warning on failure (signup itself already succeeded; workspace auto-selection is best-effort).
- `src/form/auth/SignUp/basic-form.tsx` — same non-blocking warning pattern (already had a similar guard for `setupWorkspace` itself; extended to the follow-up switch call).
- `src/form/auth/SignIn/basic-form.tsx` — both the single-workspace auto-select path and `handleWorkspaceSelect` (multi-workspace picker) now check `result.success` and show a toast + abort navigation on failure instead of redirecting into a workspace that was never actually set.
- `src/components/layouts/header/DashboardHeader.tsx` — `handleWorkspaceSwitch` now checks `result.success`, shows an error toast, and skips the `router.refresh()`/reload on failure.
- `src/components/auth/DashboardWorkspacePicker.tsx` — `handleSelect` now checks `result.success` and shows an error toast instead of navigating to `/dashboard` on a rejected switch.
- `src/app/(portal)/portal/layout.tsx` — the server-action `handleSwitchWorkspace` now checks the result and redirects to an error query param instead of blindly redirecting to `/portal/dashboard` as if the switch succeeded.
- `src/app/dashboard/settings/account/page.tsx` — auto-selects the user's own first workspace from `getUserWorkspaces()` (already a verified membership list), left as-is; not a cross-tenant risk since the workspaceId here was never caller-supplied.

**Live verification:** Created a throwaway user + two throwaway workspaces (A, B) via the Supabase admin API; user was made a member of A only.
- Calling the new membership-check query shape for `(A, user)` → row found (accepted).
- Calling it for `(B, user)` → no row (rejected) — confirms a caller cannot set the cookie to a workspace they don't belong to.
- Confirmed the function's early-return shape (`{success:false, error:...}`) is what every updated call site now branches on, not a thrown exception.
Test data (user, both workspaces) cleaned up after.

**Status:** ✅ RESOLVED.

---

## 2. `builder.ts: handlePageFormSubmission` — live, public, unauthenticated cross-tenant IDOR

**Module:** Content & Marketing (page builder / public form submissions).

**Finding:** `handlePageFormSubmission(pageId, workspaceId, payload)` trusted a raw, client-supplied `workspaceId` with zero verification that it actually belonged to `pageId`, and zero auth check — reachable today from a fully public route (`src/app/api/builder/submit/route.ts`, no login required). An attacker could inject fake contacts and trigger real automation execution (`publishEvent`) into any workspace by guessing a `workspaceId`. The `contacts` table's "Public form submissions" INSERT policy was `WITH CHECK (true)` — its own migration comment (`20240101000077_phase44_universal_api_branding.sql`) admitted workspace validation was deferred to the application layer and never implemented.

**Fix (app layer):** `src/app/actions/builder.ts`
- Added `resolvePageWorkspaceId(pageId)` — looks up the real `workspace_id` from the `pages` row itself (the trusted source), same "derive from a trusted row" pattern already used correctly by `studentEnrollments.ts`.
- `handlePageFormSubmission` now ignores its `workspaceId` parameter entirely and always re-derives the real workspace via `resolvePageWorkspaceId(pageId)`; returns `{ success: false, error: 'Invalid page' }` if the pageId doesn't resolve.
- Switched the function's Supabase client from the session-based `createServerClient()` to `createAdminClient()` for the actual reads/writes. This was necessary, not incidental: an anonymous website visitor has no session, so anon-role RLS blocked the pre-existing-contact lookup and the insert's `RETURNING` re-check regardless of the IDOR fix (discovered live during verification, see below) — since workspace ownership is now verified server-side from the trusted `pages` row *before* any write, using the admin client here doesn't reopen the IDOR; it's the same "verify then bypass" pattern the DB policy below backstops for anyone going around the app layer entirely.

**Fix (route layer):** `src/app/api/builder/submit/route.ts` — no longer requires or trusts a client-supplied `workspaceId`; derives it via `resolvePageWorkspaceId(pageId)` up front and uses that verified value for the `builder_form_submissions` log insert and the webhook-dispatch `workspace_builder_settings` lookup (previously both used the raw client `workspaceId`, which meant even with `handlePageFormSubmission` fixed, an attacker could still have logged spoofed submissions and triggered a *different* workspace's webhooks by guessing its id).

**Fix (DB policy, 2 migrations):**
- `supabase/migrations/20260721000000_tighten_public_contacts_insert_policy.sql` — first pass, replaced `WITH CHECK (true)` with `WITH CHECK (EXISTS (SELECT 1 FROM pages WHERE pages.workspace_id = contacts.workspace_id))`.
- `supabase/migrations/20260721000001_fix_contacts_insert_policy_rls_subquery.sql` — **correction found during live verification**: the plain subquery ran under the calling (anon) role, and `pages` itself is RLS-restricted to workspace members, so the subquery always saw zero rows for an anonymous caller and the policy always evaluated false — this broke the legitimate public-submission path entirely when tested live. Replaced the subquery with a `SECURITY DEFINER` helper function `public.workspace_has_pages(workspace_id)` (owned by `postgres`, bypasses RLS internally, `EXECUTE` granted to `anon`/`authenticated` only) so the policy can validate "does this workspace have a real page" without granting anon direct read access to `pages`.

Both migrations applied to the live linked project via `supabase db push`.

**Live verification** (throwaway workspaces A/B, a real `pages` row in A, Supabase JS clients using the real anon and service-role keys against the linked project):
1. `resolvePageWorkspaceId` query shape resolved the test page to its true workspace (A), confirmed independent of any `workspaceId` argument.
2. Raw anon-key REST insert (bypassing the app layer entirely) into `contacts` scoped to workspace A (has a page) → **accepted** by the new RLS policy.
3. Raw anon-key REST insert scoped to workspace B (no page) → **rejected** (`new row violates row-level security policy`).
4. Raw anon-key REST insert scoped to a random, nonexistent UUID → **rejected**.
5. The real app-code path (admin client, workspace pre-verified) → contact successfully created, landed in workspace A.
6. The actual IDOR scenario — calling `handlePageFormSubmission(realPageId, forgedWorkspaceId=B, payload)` — confirmed by direct code inspection that the forged `workspaceId` argument is never read; `resolvePageWorkspaceId(pageId)` (verified correct in step 1) is the only source of truth.

**Legitimate use case confirmed not broken:** step 5 above is the exact operation a real anonymous visitor's form submission performs post-fix (admin client, workspace derived from a real page) — succeeded. Test data cleaned up after (throwaway workspaces, page, contacts, admin user).

**Status:** ✅ RESOLVED.

---

## 3. `calendar/appointments.ts: createAppointment` + related public booking surface

**Module:** Calendar & Booking.

**Finding:** `createAppointment` fetched the target `booking_calendars` row by raw `calendarId` with zero check that it belonged to the caller's workspace — could attach an appointment to another workspace's calendar. The shared `executeAction()` wrapper for this file (`getAppointments`, `createAppointment`, `updateAppointment`, `deleteAppointment`, `createInstantMeeting`) read the workspaceId straight off the `active_workspace_id` cookie via `getCurrentWorkspaceId()` with **no `getUser()` call at all** — any caller with a non-empty cookie value, member or not, could invoke these. The `appointments` table's "Public insert access for appointments" policy was `WITH CHECK (true)`, fully open. `getAppointmentById`, `logParticipantJoin`, `logParticipantLeave` (all live via `/meet/[id]`) had no meaningful scoping, and `meet_attendance_logs`' "Public access for meet_attendance_logs" policy was `USING (true)` for all commands — fully open reads/writes of any workspace's attendance logs.

**Fix (app layer):** `src/app/actions/calendar/appointments.ts`
- `executeAction()` wrapper now calls the shared `requireWorkspaceAccess()` (from `src/lib/auth.ts`) instead of the unauthenticated `getCurrentWorkspaceId()` cookie read — **this is the executeAction() wrapper fix flagged for a possible Priority 3 pass; it was fixed here, in this pass, not deferred**, since it was directly load-bearing for `createAppointment`'s own fix and touching the file was unavoidable.
- `createAppointment`'s `booking_calendars` fetch now adds `.eq('workspace_id', workspaceId)`, closing the cross-workspace calendar-attach gap.
- `getAppointmentById`, `logParticipantJoin`, `logParticipantLeave` switched from the session-based client to `createAdminClient()`. This is a capability-based public flow by design (a real meeting participant has no dashboard session) — the appointment/log id (an unguessable UUID) is the actual authorization, same pattern as `shipments.ts`'s HMAC-token guest flow. **Discovered live during verification, not assumed:** the previous session-based queries had no RLS path granting anonymous SELECT on `appointments` at all, meaning these would have returned nothing for a genuinely anonymous `/meet/[id]` guest regardless of this security pass — the admin-client switch is a correctness fix as much as a security one.
- `logParticipantLeave` no longer derives its workspace scope from the `active_workspace_id` cookie (meaningless for an anonymous meeting guest); it now looks the log row up by `logId` alone, which is itself the correct capability (the id this exact client received from its own preceding `logParticipantJoin` call).
- `getMeetingAnalytics` (same file, same cookie-trust pattern, reads financial `invoices.amount_paid`) was **not** in this item's required-fix list and was left unchanged — flagged as a follow-up below, not silently assumed covered.

**Fix (DB migration):** `supabase/migrations/20260721000002_tighten_calendar_public_policies.sql`
- `appointments` "Public insert access for appointments": `WITH CHECK (true)` → requires `calendar_id IS NOT NULL AND EXISTS (... booking_calendars WHERE id = calendar_id AND workspace_id = appointments.workspace_id)`. Plain correlated subquery (no `SECURITY DEFINER` needed) since `booking_calendars` already has a public `USING (true)` SELECT policy.
- `meet_attendance_logs` "Public access for meet_attendance_logs": `USING (true)` → `USING/WITH CHECK (public.appointment_workspace_matches(appointment_id, workspace_id))`, a new `SECURITY DEFINER` helper function (same pattern as item 2's `workspace_has_pages`, needed here because `appointments` has no public SELECT policy for a plain subquery to see through).

**Live verification** (throwaway workspaces A/B, a real calendar in A, real anon + service-role Supabase clients against the linked project):
1. Raw anon-key insert into `appointments` with `calendar_id` belonging to A but `workspace_id = B` → **rejected**.
2. Real production booking path (admin client, mirroring `calendar/public.ts: bookAppointment`) with matching calendar/workspace → **succeeded**, row landed in the correct workspace.
3. Raw anon-key insert into `meet_attendance_logs` with `appointment_id`/`workspace_id` mismatched → **rejected**.
4. Raw anon-key insert into `meet_attendance_logs` with a correct, matching pairing → **succeeded**.
5. Admin-client lookups mirroring `getAppointmentById`/`logParticipantLeave` succeeded for a simulated anonymous caller.
6. `booking_calendars` fetch scoped to the wrong workspace (mirroring `createAppointment`'s new query) returned `null`; scoped to the correct workspace returned the row.

**Discovered, out of scope, flagged for follow-up (not fixed in this pass):**
- A raw anon-key REST insert into `appointments` (bypassing the app entirely) additionally trips an **unrelated, pre-existing** RLS gap: the `tr_booking_analytics` trigger writes to `booking_slot_analytics` as the invoking role, and that table has no anon-write policy — confirmed this trigger fires regardless of the policy content fixed here (i.e., it pre-dates this change). The real public booking flow (`calendar/public.ts: bookAppointment`) always uses the admin client and is unaffected. Flagging because a *different* future public write path that doesn't use the admin client could hit this.
- `getMeetingAnalytics` (same file) still trusts `getCurrentWorkspaceId()` with no membership check — not in this item's required-fix list, left unchanged.
- `calendar/core.ts`, `calendar/calendars.ts`, `calendar.ts` (the legacy `booking_calendars`/appointment CRUD duplicates flagged in the triage's Duplicate Implementation Finding #4/#5) were **not** touched — out of scope for this specific item.

**Status:** ✅ RESOLVED (scoped to the functions and policies named in this item).

---

## 4. `settings.ts: getWorkspaceMembers` — admin-client PII leak, live in team settings

**Module:** Settings.

**Finding:** `settings.ts`'s `getWorkspaceMembers()` used `createAdminClient()` (bypasses RLS entirely) scoped only by a cookie-read `workspaceId`, with zero auth or membership check — a full PII leak (member emails, names, avatars, roles, permissions) for any caller. `workspace.ts` has a second, differently-shaped implementation of the same name.

**Investigation (per the item's explicit instruction to check before picking a direction):** grepped every call site of both functions.
- `settings.ts`'s version is imported by `src/app/settings/page.tsx` (team settings tab), `src/components/conversations/ContactInfoPanel.tsx`, and `src/app/hr/employees/page.tsx` — all three need the rich shape: `role`, `permissions`, and `user.email`/`user.avatar_url` (confirmed `SettingsClient.tsx` reads `member.role`, `member.permissions`, and `member.user?.email` directly).
- `workspace.ts`'s version is imported by `src/app/contacts/[id]/edit/page.tsx` and `src/app/pipelines/page.tsx` — both only need `{id, name}` (it returns a pre-flattened display-name array), a materially smaller shape.

**Direction taken: fix-in-place, not repoint-and-delete.** The two implementations return meaningfully different data for different real consumers — repointing the settings UI onto `workspace.ts`'s version would have broken the team-settings page (no role/permissions/email) rather than fixed it. `workspace.ts`'s version was left as-is (out of scope for this item; it already uses `createServerClient()` and a real user check, so it isn't part of this Critical finding).

**Fix:** `src/app/actions/settings.ts` — `getWorkspaceMembers()` now calls the shared `requireWorkspaceAccess()` and uses `createServerClient()` (RLS-enforced) instead of `createAdminClient()`.

**Additional, unrelated bug found and fixed while verifying "doesn't break the legitimate use case":** the original query used a PostgREST embed (`user:users(...)`) that **was already broken before this fix** — `workspace_members.user_id` has a schema-registered foreign key to `auth.users`, not `public.users`, so PostgREST can't resolve that embed at all (confirmed live: the same query shape returns `PGRST200: Could not find a relationship` even via the admin client, i.e. independent of this security change). Replaced with a two-step fetch (member rows, then a separate `users` lookup by id list merged in app code) so the function actually returns member profiles rather than erroring — this was necessary for the "confirm legitimate use case still returns the same data" verification requirement to be meaningful at all.

**Live verification:** created two real users, two throwaway workspaces (A, B), made user A a member of A only. Signed in as user A (real session, mirrors `requireWorkspaceAccess()`'s `createServerClient()` path) and ran the exact new query shape:
- Fetching A's members (own workspace) → succeeded, returned the member row with profile (email visible).
- Fetching B's members (not a member there) → returned 0 rows (RLS-enforced, not just app-layer denial).
Test data cleaned up after.

**Status:** ✅ RESOLVED.

---

## 5. `tasks.ts: getAssignableMembers` — admin-client PII leak, live in 4 components

**Module:** Tasks.

**Finding:** Same pattern as item 4 — `createAdminClient()` (bypasses RLS), scoped only by a cookie-read `workspaceId`, no auth/membership check. Live in `AssigneePicker.tsx`, `CreateTaskModal.tsx`, `TaskDetailDrawer.tsx`, `TasksToolbar.tsx`.

**Fix:** `src/app/actions/tasks.ts` — `getAssignableMembers()` now calls `requireWorkspaceAccess()` and uses `createServerClient()` instead of the admin client. Applied the same `user:users(...)` PostgREST-embed fix as item 4 (same underlying schema issue — `workspace_members.user_id` has no registered FK to `public.users` — so the embed would have silently failed here too); replaced with a two-step fetch merged in app code. Return shape (`{ data: [{ user_id, role, user: {...} }] }`) is unchanged, so none of the 4 consuming components needed changes.

**Live verification:** two real users, two throwaway workspaces, user A a member of A only, signed in as A with a real session.
- Fetching A's assignable members (own workspace) → succeeded, member profile with email resolved correctly (confirms the legitimate in-workspace assignment use case still works).
- Fetching B's assignable members (not a member there) → 0 rows.
Test data cleaned up after.

**Status:** ✅ RESOLVED.

---

## 6. `shipments.ts: createShipment` — admin-client, zero auth, quota abuse

**Module:** Commerce & Ops (shipments/courier tracking).

**Finding:** `createShipment(workspaceId, payload)` had zero auth/membership check, used `createAdminClient()`, and read/wrote billing quota (`tracking_quota`) plus inserted shipment/tracking records for a raw caller-supplied `workspaceId` — any caller (no login required) could burn another workspace's tracking quota.

**Fix:** `src/app/actions/shipments.ts` — added a check at the top of `createShipment` before any read/write. **Judgment call, documented explicitly per the task's instruction to investigate before guessing:** this file already had a local `requireWorkspaceMember(workspaceId)` helper (lines 10–27, pre-existing — not introduced by this pass) used by 4 sibling functions in the same file (`getShipmentById`-style lookups, `syncShipmentTracking`, etc.). Used that existing helper here instead of the shared `requireWorkspaceAccess()` from `src/lib/auth.ts`, because `requireWorkspaceAccess()` only validates the *cookie-derived active workspace* — `createShipment` takes `workspaceId` as an explicit argument that isn't necessarily the caller's active cookie workspace (see the internal call site below), so what actually needs verifying is "is the caller a member of *this specific* `workspaceId` argument," which is exactly what the file's existing `requireWorkspaceMember()` does. This is reusing an established in-file pattern, not introducing a second, new parallel auth mechanism.

**Quota check and insert scoping confirmed:** both the `tracking_quota` read/insert and the `courier_shipments` insert were already scoped with `.eq('workspace_id', workspaceId)` / `workspace_id: workspaceId` — no change needed there once `workspaceId` itself is verified up front.

**Internal call site checked, not assumed:** `finance.ts:481` calls `createShipment(data.workspace_id, ...)` from inside `updateInvoiceStatus`. Confirmed by code inspection (`finance.ts:376-391`, part of the prior CRM pass's #13b fix) that `updateInvoiceStatus` already calls `requireWorkspaceAccess()` at its own top and verifies the target invoice's `workspace_id` matches that verified workspace *before* reaching the shipment-creation side effect — so `data.workspace_id` passed into `createShipment` is always a workspace the calling user is already a confirmed member of. The new check inside `createShipment` is therefore a safe, non-breaking (if technically redundant for this one call path) re-verification, not a double-check that blocks the internal flow. `updateInvoiceStatus` itself is only reachable from `InvoiceMasterDetail.tsx` (a real authenticated dashboard component), not from any unauthenticated webhook/cron path, so there's no session-less internal caller that this new check could break.

**Live verification:** two real users, two throwaway workspaces, each user a member of their own workspace only.
- Confirmed the `requireWorkspaceMember` query shape returns a row for `(wsA, userA)` — legit call would proceed.
- Confirmed it returns no row for `(wsB, userA)` — the actual quota-abuse IDOR scenario is now rejected before touching `tracking_quota`/`courier_shipments`.
- Confirmed by code inspection that the internal `finance.ts` call path always supplies an already-membership-verified `workspaceId`.
Test data cleaned up after.

**Status:** ✅ RESOLVED.

---

## 7. `messaging.ts: getQuickReplies` / `createQuickReply` / `deleteQuickReply` — open RLS policy

**Module:** Communication (messaging/conversations).

**Finding:** All three functions trusted the `active_workspace_id` cookie with no membership check. More importantly, the underlying `quick_replies` table's RLS policies were themselves the primary bug — "Allow authenticated to manage quick replies" (`FOR ALL USING (true)`) and "Allow authenticated to select quick replies" (`FOR SELECT USING (true)`), both restricted only to the `authenticated` role, not to workspace membership. Any authenticated user, regardless of which workspace they belonged to, could read/write/delete any other workspace's quick replies.

**Fix (DB migration — the primary fix):** `supabase/migrations/20260721000003_fix_quick_replies_rls.sql` — dropped both open policies, replaced with a single `FOR ALL USING/WITH CHECK (public.check_workspace_access(workspace_id))` policy using the codebase's existing `check_workspace_access()` helper (the same one already used correctly by `appointments`/`booking_calendars`/etc.), matching the standard pattern elsewhere in this codebase.

**Fix (app layer — defense in depth, per this pass's stated requirement):** `src/app/actions/messaging.ts` — `getQuickReplies`, `createQuickReply`, `deleteQuickReply` now call the shared `requireWorkspaceAccess()` instead of the unauthenticated `getCurrentWorkspaceId()` cookie read.

**Live verification (both layers confirmed independently, per the task's explicit requirement):**
- **RLS policy, bypassing the app layer entirely** (raw Supabase client with a real session, no server action involved): a user who is a member of workspace A only, attempting to `SELECT` workspace B's quick replies directly → 0 rows (previously would have returned the row — confirmed by planting a real quick-reply row in B first). Attempting a direct `DELETE` on B's row → 0 rows affected, row confirmed still present after. Managing (`INSERT`/`SELECT`) their own workspace A's quick replies → succeeded normally, confirming the fix doesn't break legitimate same-workspace usage.
- **App layer:** confirmed an unauthenticated caller (no session) fails `auth.getUser()`, which is what `requireWorkspaceAccess()` gates on — matches the same tested-and-confirmed pattern from item 1.
Test data (2 users, 2 workspaces, quick-reply rows) cleaned up after.

**Status:** ✅ RESOLVED.

---

## Closing Summary

All 7 Priority 0 items are RESOLVED, each verified live against the actual linked Supabase project with real (throwaway, cleaned-up-after) cross-workspace test data — not code review alone. `requireWorkspaceAccess()` (`src/lib/auth.ts`) was reused for every app-layer check across all 7 items except item 6, which reuses this codebase's pre-existing, file-local `requireWorkspaceMember(workspaceId)` helper in `shipments.ts` for the documented reason that it validates an explicit `workspaceId` argument rather than the cookie-derived active workspace — not a new parallel implementation. Four migrations were applied to the live project: `20260721000000`/`20260721000001` (contacts public-insert policy, item 2), `20260721000002` (appointments/meet_attendance_logs public policies, item 3), `20260721000003` (quick_replies policy, item 7).

**Two unrelated, pre-existing bugs were discovered and fixed as a side effect of verification**, not part of the original 7 findings but necessary for the "confirm the legitimate use case still works" requirement to be meaningful:
1. `workspace_members.user_id` has no schema-registered foreign key to `public.users` (only to `auth.users`), so PostgREST embeds (`user:users(...)`) used by `settings.ts: getWorkspaceMembers` and `tasks.ts: getAssignableMembers` were silently broken *before* this pass, independent of the security fix — confirmed live via the admin client. Both were rewritten as a two-step fetch.
2. Anonymous `/meet/[id]` participants had no RLS path to read `appointments` under the session-based client at all — `getAppointmentById`/`logParticipantJoin` would have returned nothing for a true anonymous guest regardless of this security pass. Fixed by switching those two functions (plus `logParticipantLeave`) to the admin client, justified because workspace/appointment ownership is now verified server-side before use.

**Flagged, not fixed in this pass (explicitly out of scope for the 7 items given):**
- `calendar/appointments.ts: getMeetingAnalytics` — same cookie-trust pattern as the rest of that file, reads financial data, not in item 3's required-fix list.
- A raw anon-key REST insert into `appointments` (bypassing the app) trips an unrelated pre-existing RLS gap on `booking_slot_analytics` via the `tr_booking_analytics` trigger — the real public booking flow uses the admin client and is unaffected, but a future non-admin-client public write path could hit this.
- `calendar/core.ts`, `calendar/calendars.ts`, `calendar.ts` (legacy duplicate `booking_calendars`/appointment CRUD, per the triage's Duplicate Implementation Findings #4/#5) — untouched, out of scope for item 3.
- `contacts.ts`, `quotes.ts`, `finance.ts` — explicitly out of scope for this entire pass (already fixed and verified in the prior CRM pass, see `crm.md`).

---

# Priority 1 — Live Security Gaps (Reputation, Blog, Compliance, Shipments, Course Commerce)

Next tier down from Priority 0: still live, still real, narrower blast radius or requiring build-level confirmation before scoping. Spans Content & Marketing (Reputation, Blog), Settings/Compliance (POPIA), Commerce & Ops (Shipments), and LMS & Education (Course Commerce). `contacts.ts`, `quotes.ts`, `finance.ts`, and the 7 Priority 0 files were not touched beyond what's already fixed above.

## 1. `reputation_actions.ts: submitPrivateFeedback` — public, unauthenticated, no rate limiting

**Module:** Content & Marketing (Reputation).

**Finding:** Live on the public `/feedback` page, uses `createAdminClient()`, zero rate limiting or abuse resistance — anyone could flood fake reviews into any workspace and spam the workspace owner's inbox.

**Investigation — existing patterns reused, not reinvented:** grepped for existing rate-limiting/honeypot patterns before adding anything new. `src/app/api/public/forms/[id]/submit/route.ts` already has both: an in-memory per-key rate-limit scaffold (`checkRateLimit(key, limit, windowMs)`) and a honeypot field (`lm_hp_field`, silently "succeeds" if filled so the bot doesn't adapt). Reused both patterns rather than introducing a new mechanism or a third-party CAPTCHA service.

**Fix:**
- `src/lib/security/rateLimit.ts` — extracted the forms route's in-memory rate-limit scaffold into a shared utility (the forms route itself was left untouched, out of scope — this is a new reusable copy of the same logic, not a refactor of existing working code).
- `src/app/actions/reputation_actions.ts: submitPrivateFeedback` — now checks rate limits both per-IP (`feedback:ip:<ip>`, 5/min, via `headers()` from `next/headers`) and per-workspace (`feedback:workspace:<id>`, 30/min) — the per-workspace limit specifically bounds the mass-email vector regardless of how many IPs an attacker rotates through. Added an optional `honeypot` parameter (same `lm_hp_field` name/silent-success pattern as the forms route) and basic `rating` bounds validation (must be 1–5).
- `src/app/feedback/FeedbackClient.tsx` — added the actual hidden honeypot input (visually hidden via CSS + `tabIndex={-1}` + `aria-hidden`, not `display:none`/`type=hidden` which some bots skip), wired into the `submitPrivateFeedback` call.

**workspaceId trust, investigated per the item's explicit ask:** checked whether a more trusted source than the raw `workspaceId` query param exists (e.g. a feedback-form entity with its own ID mapping to a workspace, the way `builder.ts`'s `pageId` mapped to a workspace in Priority 0 item 2). There is no such entity — `/feedback` is a single generic page differentiated only by `?workspaceId=`, the same design already used (and previously confirmed safe-by-design in the triage) by `getPublicReputationSettings(workspaceId)`. This is not a smuggled/incidental parameter being misused — routing anonymous feedback to a business by its own workspace ID is the intended design of a public "contact this business" form, and there's no better identifier to derive it from. No change made here; documenting the investigation per the task's explicit instruction to confirm rather than assume.

**Mass-email vector confirmed bounded:** the alert email always goes to the workspace's own `support_email`/owner email (server-derived from the `workspace_branding`/`workspaces` tables, never attacker-controlled), so the insert can't be abused to email an arbitrary third party — only to flood the same workspace owner's inbox, which the per-workspace rate limit now bounds.

**Live verification:**
- Rate-limit unit test (exact logic from `rateLimit.ts`): 8 rapid requests against a 5/window limit → 5 allowed, 3 blocked; a fresh key's first request → allowed. Confirms both the burst-block and the "legitimate single submission still succeeds" requirement.
- Confirmed the email-alert recipient is always resolved server-side from the workspace's own branding/owner record, never from request input.

**Status:** ✅ RESOLVED.

---

## 2. `publicBlog.ts: getPublicBlogPost` — confirmed live IDOR via `?preview=1`

**Module:** Content & Marketing (Blog).

**Finding:** `preview=true` skipped the published-only filter based solely on a cookie-read `workspaceId` (or skipped filtering entirely if that cookie was absent) — for a fully anonymous visitor, the query became unscoped, letting any workspace's unpublished draft be read by slug.

**Fix:** `src/app/actions/publicBlog.ts: getPublicBlogPost` — `preview=true` now only ever bypasses the published filter for an authenticated user (`supabase.auth.getUser()`) who is verified, via an explicit `workspace_members` check, to belong to *that specific post's* `workspace_id` (fetched from the candidate row itself, not a cookie). If the user isn't authenticated, or is authenticated but not a member of that post's workspace, the function falls through to the exact same published-only query used for ordinary public visitors — no error path that would reveal an unpublished post exists.

**Live verification** (throwaway workspaces A/B, a real draft post in B, a real published post in A):
- Anonymous caller (`auth.getUser()` confirmed null) attempting `?preview=1` on B's draft → falls back to the published-only lookup → `null`, not found, no leak.
- Real authenticated editor (a genuine member of B) previewing their own draft → candidate fetch succeeds (RLS-backed), membership check against the post's own `workspace_id` passes → preview succeeds, confirming the legitimate editor-preview use case still works.
- Cross-tenant attempt: a real authenticated user who is a member of A (not B) attempting to preview B's draft → blocked (RLS already denies the candidate fetch, defense in depth with the app-layer membership check).
- A true anonymous visitor reading a real published post (no preview) → succeeds normally.
Test data cleaned up after.

**Status:** ✅ RESOLVED.

---

## 3. `popia.ts: invokeRightToErasure` — irreversible PII anonymization, RLS-only backstop

**Module:** Settings/Compliance (POPIA).

**Finding:** Already called `getUser()` + the unverified `getCurrentWorkspaceId()` cookie read (RLS was the only real backstop against cross-tenant abuse) for an irreversible action (PII anonymization, workflow cancellation, suppression-list write).

**Fix:** `src/app/actions/popia.ts: invokeRightToErasure` now calls the shared `requireWorkspaceAccess()` instead of `getUser()` + `getCurrentWorkspaceId()` — explicit app-layer defense in depth regardless of what RLS already permits.

**Product decision flagged, not silently resolved (per the task's explicit instruction):** should this action additionally require a secondary confirmation step — e.g. re-entering a password, or restricting it to admin-role members rather than any workspace member — given it's irreversible? **Not implemented in this pass.** Recommendation: gate on admin role (`requireAdmin()`-style check, already an established pattern in this codebase) rather than a password re-prompt — it fits the existing role model without adding a new UX pattern, and "any team member can irreversibly anonymize a customer record" is a materially different risk posture than "any team member can view/edit one," which is the kind of distinction a role gate is meant to express. This is a product call, not something to decide unilaterally inside a security-patch pass — flagging for explicit sign-off.

**Live verification:** two real users, two throwaway workspaces, a real contact in A.
- Legit path: user A fetching their own workspace's contact (the exact query shape `requireWorkspaceAccess()` + the contact-ownership check now perform) → succeeds.
- Forged-workspace shape: fetching A's contact scoped to B → `null`.
- Confirmed user A has no `workspace_members` row in B, meaning `requireWorkspaceAccess()` would throw `ForbiddenError` before any erasure logic runs if their session ever pointed at workspace B.
Test data cleaned up after.

**Status:** ✅ RESOLVED (app-layer fix); secondary-confirmation question flagged for product decision, not resolved.

---

## 4. `popia.ts: unsubscribeEmail` — no signature/token, plus a functional bug

**Module:** Settings/Compliance (POPIA).

**Finding:** Two issues in one function. Security: accepted raw `email`/`workspaceId` URL params with no signature, letting anyone construct a URL to unsubscribe an arbitrary email from an arbitrary workspace. Functional: used the session-based `createServerClient()`, so for a real anonymous unsubscriber (no session), RLS silently no-op'd every write — the feature likely didn't even work for legitimate users.

**Fix (security):** `src/lib/security/unsubscribeToken.ts` — new signed-HMAC-token utility (`generateUnsubscribeToken`/`verifyUnsubscribeToken`, `timingSafeEqual` comparison), explicitly reusing the same pattern as `shipments.ts`'s delivery-confirmation token (Priority 0 item 5) rather than inventing a new scheme. Deliberately a **plain utility, not a `'use server'` export** — the token *generator* must never be its own independently-callable Server Action, for exactly the reason Priority 0 item 5 found `generateShipmentTokenAction` was: a plain function has no client-invocable boundary at all. `unsubscribeEmail(email, workspaceId, token)` now requires and verifies the token before doing anything.

**Fix (functional, same code path as required):** once the request is verified by a signed token instead of a session, `unsubscribeEmail` now uses `createAdminClient()` for the actual writes — the token *is* the authorization, so there's no longer a reason to depend on RLS/session scoping that a real anonymous caller never has. This directly fixes the silent no-op.

**UI updated:** `src/app/public/unsubscribe/page.tsx` now reads a `token` URL param, requires it alongside `email`/`workspace_id` before allowing submission, and passes it through to `unsubscribeEmail`. The previously free-text-editable email field is now read-only (it's cryptographically tied to the link's signature — editing it would just fail verification, so the UI no longer pretends that's a supported flow).

**Discovered, out of scope, flagged for follow-up:** grepped for any existing caller that generates real unsubscribe links — found none. `src/lib/builder/emailRenderer.ts` has an `{{unsubscribe_link}}` template placeholder in the campaign-email footer, but nothing in the codebase ever substitutes it — the feature is currently unwired end-to-end, independent of this fix. Wiring `generateUnsubscribeToken` into the campaign-dispatch email-sending path (so real outbound emails carry a working, signed unsubscribe link) is a real follow-up but is a send-path feature change, not a security patch to the existing (currently unreachable) action — out of scope for this pass.

**Live verification:**
- Valid token for the real (email, workspace) pair → accepted.
- The same valid token replayed against a *different* workspace → rejected.
- The same valid token replayed for a *different* email → rejected.
- A garbage/guessed token → rejected.
- Functional fix: performed the exact admin-client write sequence the fixed code now runs (suppression-list upsert + contact `is_invalid_email` update) for a simulated anonymous caller with a verified token → both writes landed and were confirmed present afterward, proving the no-op bug is actually fixed, not just the security gate added.
Test data cleaned up after.

**Status:** ✅ RESOLVED (both the security and functional fix, per the task's requirement that they be treated as equally mandatory).

---

## 5. `shipments.ts: generateShipmentTokenAction` — investigated, confirmed reachable, escalated and fixed

**Module:** Commerce & Ops (Shipments).

**Finding / investigation required before any fix, per the task:** does minting the HMAC token `confirmReceiptAction` treats as proof of recipient authorization actually reach the client as an invocable Server Action?

**Evidence gathered (build-level, not guessed):**
1. Ran a full production build (`npm run build`).
2. `grep`'d `.next/static/` for the function name — not found (expected; production Server Action references are hashed IDs, not literal names).
3. Located the actual compiled action-ID mapping in the server bundle for `/track/[shipmentId]`: `"05ed4449a11a0893eb5b13d75053f6c50347b333":()=>...generateShipmentTokenAction`.
4. Searched `.next/static/` for that exact hash — **found it** in two client-side chunks: `app/shipments/page-*.js` and `app/track/[shipmentId]/page-*.js`.
5. Cross-checked against `.next/server/server-reference-manifest.json`: the entry for this hash has `"layer": {"app/shipments/page": "action-browser", ...}` — Next's own build tooling labels this specific action ID as browser-invocable for the `/shipments` route. (`app/shipments/page` is the internal dashboard shipments page; `ShipmentsClient.tsx`, a Client Component there, imports other actions — `updateShipmentStatus`, etc. — from the same `shipments.ts` module, and Next's Flight compiler bundles the *whole* module's action-ID map into that client chunk as a result, not just the specific actions that component calls.)

**Conclusion: CONFIRMED REACHABLE.** Any authenticated platform user (any workspace, not necessarily a member of the target shipment's workspace — the function itself performed zero checks) could invoke this action directly from the browser with an arbitrary `shipmentId` and receive back the exact token `confirmReceiptAction` treats as proof of recipient authorization for *any* workspace's shipment. Per the task's own instruction, this is escalated to Priority-0 severity and fixed accordingly, not left as a Priority-1 "confirmed safe" entry.

**Fix:** eliminated the exposed Server Action entirely rather than adding an auth check to it (there's no legitimate caller-supplied-shipmentId use case to protect — the only real caller is the `/track/[shipmentId]` page rendering a shipment it already fetched itself).
- `src/lib/courier/shipmentToken.ts` — new plain utility (`generateShipmentToken`, not `'use server'`) holding the HMAC logic.
- `src/app/actions/shipments.ts` — `generateShipmentTokenAction` export **deleted**; `confirmReceiptAction` now calls the shared utility for its own token comparison instead of duplicating the HMAC inline.
- `src/app/track/[shipmentId]/page.tsx` (a Server Component) now calls `generateShipmentToken(shipment.id)` directly instead of `await generateShipmentTokenAction(shipment.id)` — same computed value, but now genuinely server-only: a plain function has no Server Action wire protocol, no action ID, nothing for a client bundle to reference.
- Confirmed via `grep` that no other file in `src/` still imports `generateShipmentTokenAction`.

**Discovered, out of scope, flagged for follow-up:** `/track/[shipmentId]` (meant to be a fully public tracking page) is not in the middleware's public-page allowlist (`src/lib/supabase/middleware.ts`), so an anonymous visitor with no session is currently redirected to `/auth/signin-basic` before ever reaching the page — a separate, pre-existing bug that likely already breaks the legitimate "share a tracking link with a customer who has no account" use case, independent of this security fix. Not fixed here (not one of the 6 Priority 1 items; flagging per this project's established convention of surfacing adjacent findings rather than silently expanding scope).

**Status:** ✅ RESOLVED-AS-CONFIRMED-REACHABLE — treated as Priority 0 severity per the task's own escalation instruction, fixed by removing the action surface entirely (not just adding a check to it).

---

## 6. `courseCommerce.ts: getWorkspacePaymentIntegration` — admin-client leak of Stripe Connect status + publishable key

**Module:** LMS & Education (Course Commerce).

**Finding:** No auth check, `createAdminClient()`, discloses whether Stripe Connect is active for a workspace plus its publishable key.

**Severity assessment, reported per the task's explicit request:** a Stripe publishable key is designed by Stripe to be public/client-embeddable — its disclosure alone is low-risk, since it's meant to end up in client-side checkout code eventually anyway. The more relevant exposure is the boolean-shaped side effect: this endpoint lets an unauthenticated caller enumerate *which specific workspaces have payment processing enabled at all*, which is workspace configuration/business-intelligence data (e.g., "is this competitor's shop live yet"), not something Stripe's public-key model makes safe by design. Assessment: **low-to-moderate severity** — worth closing consistently with every other fix in this project, but not comparable to e.g. item 5's forgeable-delivery-confirmation or the Priority 0 PII leaks.

**Fix:** `src/app/actions/courseCommerce.ts: getWorkspacePaymentIntegration` now calls the shared `requireWorkspaceAccess()` before the admin-client read (which stays on the admin client afterward, since it's now workspace-verified — same "verify then read" shape as other fixes in this project). Only caller (`CoursePricingForm.tsx`) is an authenticated dashboard component, so no other call site is affected.

**Live verification:** two real users, two throwaway workspaces, a real `workspace_integrations` (Stripe) row in A.
- Legit in-workspace fetch (the query the fixed action runs once `requireWorkspaceAccess()` passes) → succeeds, publishable key resolvable.
- Confirmed user A has no `workspace_members` row in B, so `requireWorkspaceAccess()` would reject before the admin-client read ever runs if invoked against workspace B.
Test data cleaned up after.

**Status:** ✅ RESOLVED.

---

## Priority 1 Closing Summary

All 6 items resolved, each investigated and verified against real (throwaway, cleaned-up-after) data — items 1–4 and 6 via direct Supabase queries mirroring the exact fixed code paths (both the anon/session-scoped and admin-client shapes as appropriate), item 5 via actual Next.js production build artifacts (`server-reference-manifest.json`, static chunk contents), which is the only artifact that can answer a "is this build-level reachable" question. `requireWorkspaceAccess()` was reused for items 3 and 6; items 1, 2, and 4 don't use it because their entire premise is legitimate public/unauthenticated access (feedback submission, blog preview fallback, signed-token unsubscribe) — auth was never the right tool for those, which the task's own framing anticipated ("the fix is not require login").

**New shared utilities added this pass** (all plain functions, deliberately not `'use server'` exports, per the lesson item 5 surfaced): `src/lib/security/rateLimit.ts`, `src/lib/security/unsubscribeToken.ts`, `src/lib/courier/shipmentToken.ts` (replaces the inline HMAC previously duplicated between `confirmReceiptAction` and the now-deleted `generateShipmentTokenAction`).

**One item escalated mid-pass:** item 5 was investigated as instructed and found to be Priority-0-severity, not Priority-1 — treated accordingly (action surface removed, not just gated) and reported as such rather than silently downgraded to match its original batch.

**Flagged for future work, not fixed in this pass:**
- Item 3: whether `invokeRightToErasure` needs a secondary confirmation step (password re-prompt or admin-role gate) — product decision, recommendation given (admin-role gate), not implemented.
- Item 4: no code anywhere currently generates a real unsubscribe link (`{{unsubscribe_link}}` in `emailRenderer.ts` is an unsubstituted template placeholder) — wiring `generateUnsubscribeToken` into the campaign-send path is a follow-up feature, not a patch to existing reachable code.
- Item 5: `/track/[shipmentId]` isn't in the middleware's public-page allowlist, likely breaking the legitimate anonymous-tracking use case independent of this security fix.

**Fresh rebuild:** a full `npm run build` was run once during item 5's investigation (clean, used as the evidence source above) and a second full rebuild was started after all 6 fixes landed to satisfy this pass's "fresh rebuild, confirm clean" requirement, but was deferred at the user's explicit request ("skip the build, I will verify it manually") in favor of a targeted sanity pass instead: grep-confirmed no file still imports the deleted `generateShipmentTokenAction`, and confirmed every new/changed import (`requireWorkspaceAccess`, `checkRateLimit`, `verifyUnsubscribeToken`, `generateShipmentToken`) resolves against files that actually export it. A full clean build was **not** independently re-confirmed by this pass for the final state of the code — noting this explicitly rather than claiming a verification that didn't happen.

---

# Priority 2 — Consolidate Duplicate Implementations (Repoint/Delete, Not Rebuild)

Cleanup pass: `action-security-triage.md` found the same feature implemented multiple times — one safe/live version and one dangerous/dead version — rather than six new functions each needing a fresh security fix. Approach throughout: investigate which copy is actually live, repoint/harden that one, delete the rest — not harden every copy or build new code. `contacts.ts`, `quotes.ts`, `finance.ts`, and all resolved Priority 0/1 files were not touched.

**Method note, applies to every item below:** the triage's "confirmed dead" claims were re-verified fresh in this pass, not assumed — every deletion below is preceded by a repo-wide `grep` for the function name (not just the call sites the triage already named), pasted inline as required.

## 1. `booking_calendars` CRUD implemented three times

**Module:** Calendar & Booking.

**Investigation:** confirmed the live path is `calendar/calendars.ts` (`createCalendar`/`updateCalendar` imported by `CalendarPagesView.tsx`). `calendar/core.ts`'s copy (`getCalendars`/`createCalendar`/`updateCalendar`/`deleteCalendar`) and `calendar.ts`'s copy (`createCalendar` only — it never had update/delete/list versions) both re-confirmed dead:

```
$ grep -rn "from ['\"]@/app/actions/calendar/core['\"]" src
src/app/book/[slug]/page.tsx:2:import { getPublicCalendarBySlug } from '@/app/actions/calendar/core';
```
(only `getPublicCalendarBySlug` — a different, genuinely public function in the same file, kept — is imported; none of `getCalendars`/`createCalendar`/`updateCalendar`/`deleteCalendar` have any importer.)

```
$ grep -rn "from ['\"]@/app/actions/calendar['\"]" src
src/components/calendar/WaitlistManager.tsx: import { offerWaitlistSpot, addContactToWaitlist, getWaitlistEntries } ...
src/components/calendar/OutcomeManager.tsx: import { createOutcome } ...
src/components/calendar/AppointmentsList.tsx: import { updateAppointmentStatus } ...
src/components/calendar/IntakeFormBuilder.tsx: import { saveIntakeForm } ...
src/app/calendar/waitlist/page.tsx: import { getWaitlistEntries } ...
src/app/calendar/analytics/page.tsx: import { getComprehensiveCalendarAnalytics } ...
```
(6 files, 7 named imports total — `createCalendar` is not among them.)

**Also discovered mid-investigation and folded into this item:** `calendar/calendars.ts`'s own `deleteCalendar` has zero UI callers either (same as `core.ts`'s copy) — not one of the two functions the task named as live (`createCalendar`/`updateCalendar`), but since it's the sole surviving copy of delete-calendar logic once `core.ts` is removed, it was hardened rather than deleted (matches this project's established doctrine: unreferenced server actions are still real attack surface, not free to leave insecure just for being currently unwired from a delete-calendar UI button).

**Fix:** `src/app/actions/calendar/calendars.ts`
- `executeAction()` wrapper now calls `requireWorkspaceAccess()` (was the unauthenticated `getCurrentWorkspaceId()` cookie read — zero auth check at all).
- Added a real field allow-list (`EDITABLE_CALENDAR_FIELDS = ['name', 'calendar_type', 'meeting_mode', 'location', 'description', 'price']`), verified against `CalendarSettingsModal.tsx`'s actual zod schema/form fields (not core.ts's differently-shaped camelCase interface, which would have been the wrong shape to port — checked the real form before assuming). `createCalendar`/`updateCalendar` now pick only these fields instead of spreading the raw client payload into the insert/update.

**Deleted:** `calendar/core.ts`'s `getCalendars`/`createCalendar`/`updateCalendar`/`deleteCalendar` (kept `getPublicCalendarBySlug`); `calendar.ts`'s `createCalendar`.

**Status:** ✅ RESOLVED — repointed/hardened the live copy, deleted the two dead ones.

---

## 2. Appointment creation/mutation implemented twice, `getAppointments` implemented twice

**Module:** Calendar & Booking.

**Investigation:** confirmed `calendar.ts`'s `getAppointments`, `createBooking`, `deleteAppointment` have zero live callers — the same `grep` above (7 named imports from `@/app/actions/calendar`) shows none of these three among them. `CalendarClient.tsx` (the real calendar UI) imports `getAppointments`/`createAppointment`/`updateAppointment`/`deleteAppointment` from `@/app/actions/calendar/appointments` — a different module — confirmed by reading its import statement directly:
```
src/components/calendar/CalendarClient.tsx:17: import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '@/app/actions/calendar/appointments';
```

**Priority 0 fix confirmed actually in place before treating this consolidation as safe** (per the task's explicit requirement not to delete a duplicate until the survivor is confirmed correct): re-checked `calendar/appointments.ts` — `executeAction()` calls `requireWorkspaceAccess()` (Priority 0 item 3's fix), confirmed still present, not reverted by any later change.

**Deleted:** `calendar.ts`'s `getAppointments`, `createBooking`, `deleteAppointment` (all confirmed dead, none had a live caller the triage missed — no repoint was needed).

**Status:** ✅ RESOLVED — dead duplicates deleted, live version's Priority 0 fix independently re-confirmed first.

---

## 3. `getWorkspaceTags` implemented twice

**Module:** Tasks / CRM.

**Investigation:**
```
$ grep -rn "\bgetWorkspaceTags\b" src --include="*.tsx" --include="*.ts" | grep -v "src/app/actions/tasks.ts\|src/app/actions/contacts.ts"
src/app/contacts/page.tsx:8:import { getWorkspaceTags } from '../actions/contacts';
src/app/contacts/tags/page.tsx:2:import { getWorkspaceTags } from '@/app/actions/contacts';
src/modules/crm/service/ContactService.ts:179:  async getWorkspaceTags(workspaceId: string) {
```
Every real caller resolves to `contacts.ts`'s version (delegating to `ContactService`, already covered by the earlier CRM fix pass) or is `ContactService`'s own method definition. `tasks.ts`'s copy has zero callers anywhere.

**Deleted:** `tasks.ts`'s `getWorkspaceTags`. No change needed in `contacts.ts`.

**Status:** ✅ RESOLVED — dead duplicate deleted.

---

## 4. `getExpenses` (dead) vs. `getExpensesLive` (live)

**Module:** Commerce & Ops / Finance-adjacent.

**Investigation:**
```
$ grep -rn "\bgetExpenses\b" src --include="*.tsx" --include="*.ts" | grep -v "src/app/actions/operations.ts"
(no output)
```
Zero references anywhere outside its own definition in `operations.ts`. `expenses.ts`'s `getExpensesLive` (already hardened, serves `ExpenseLiveClient.tsx`/`finance/expenses/page.tsx`) is untouched — no fix needed there.

**Deleted:** `operations.ts`'s `getExpenses`.

**Status:** ✅ RESOLVED — dead duplicate deleted.

---

## 5. `affiliates.ts: getProgrammes` / `getProgrammeById` — dead duplicates

**Module:** Commerce & Ops (Affiliates).

**Investigation:**
```
$ grep -rn "\bgetProgrammes\b" src --include="*.tsx" --include="*.ts" | grep -v "src/app/actions/affiliates.ts"
(no output)
$ grep -rn "\bgetProgrammeById\b" src --include="*.tsx" --include="*.ts" | grep -v "src/app/actions/affiliates.ts"
(no output)
```
Both confirmed zero callers. Double-checked how the real `/affiliates` page actually loads programme data, since `AffiliatesClient.tsx` only imports mutation functions (`createProgramme`, `updateProgramme`, etc.), not a getter: `src/app/affiliates/page.tsx` (the Server Component) queries `affiliate_programmes` directly via Supabase itself (`.from('affiliate_programmes')...`), never through either of these two functions — confirming they're genuinely unused, not a case of "the triage missed a caller."

**Deleted:** both `getProgrammes` and `getProgrammeById`.

**Status:** ✅ RESOLVED — dead duplicates deleted, not hardened (no reason to secure code nothing calls).

---

## 6. `getInvoiceAnalytics` vs. `getDashboardStats`/`getConversionAnalytics` — investigated, not a clean repoint

**Module:** Settings/Compliance-adjacent (Analytics).

**Investigation, as required before any action:**
- `analytics/invoices.ts: getInvoiceAnalytics(workspaceId)` returns `{ total_collected, total_overdue, bad_debt_total }` — invoice-specific financial totals only.
- `analytics.ts: getDashboardStats()` returns `{ leads, orders, tasks, conversations }` — counts across four unrelated tables (`contacts`, `orders`, `tasks`, `conversations`), none of them invoices.
- **Conclusion: the shapes are genuinely different, not two generations of the same output** — confirmed by reading both functions' actual return values, not inferred from the triage's "two generations of the same concept" framing alone. `getDashboardStats` aggregates strictly more, and entirely different, data. **Repointing `settings.ts`'s dashboard onto `getInvoiceAnalytics` is not viable** — it would silently drop the leads/orders/tasks/conversations counts the real settings page displays.
- Live-caller check: `getDashboardStats` is imported by `src/app/settings/page.tsx` (live). `getInvoiceAnalytics` and `getConversionAnalytics` both have zero callers anywhere in `src/`.
- **Functional-viability check on the two dead functions** (needed to decide "redundant, delete" vs. "narrower, keep" — not guessed): queried the live database directly.
  - `getInvoiceAnalytics` has a built-in fallback for when its `get_invoice_metrics` RPC doesn't exist (confirmed live: the RPC genuinely doesn't exist) — the fallback queries `invoices` and `invoice_write_offs`, both confirmed to exist live. **This function is dead but functional** — it would work correctly if called.
  - `getConversionAnalytics` queries `conversion_events` with no fallback — confirmed live that `conversion_events` **does not exist** as a table in the linked database at all (`to_regclass('public.conversion_events')` returns `null`). **This function is dead and non-functional** — it could never have worked, regardless of who called it.

**Direction taken, with reasoning:**
- `getDashboardStats` — **fixed in place**: `src/app/actions/analytics.ts`, now calls `requireWorkspaceAccess()` instead of `getUser()` + the unverified `getCurrentWorkspaceId()` cookie read. This is the correct outcome per the task's own branching instruction ("if shapes are genuinely different... fix getDashboardStats in place").
- `getInvoiceAnalytics` — **kept, not deleted.** It is dead but not a duplicate of anything (no other function returns invoice financial totals), it's already correctly secured (explicit `workspace_members` check inline, predating this pass), and it's genuinely functional via its fallback path. Deleting a safe, working, non-duplicate function just because nothing currently calls it would be scope creep beyond this task's actual concern (dangerous *duplicates*, not general dead-code removal) — kept as an intentionally narrower, differently-scoped, ready-to-use function (e.g. for a future invoice-summary widget).
- `getConversionAnalytics` — **deleted**, not kept. Unlike `getInvoiceAnalytics`, this one is not "narrower and scoped" — it's non-functional. It queries a table that doesn't exist in the live schema and has no fallback, so "keep as intentionally scoped" doesn't apply to something that could never have returned data. Removed from `analytics.ts`.

**Status:** ✅ RESOLVED — `getDashboardStats` fixed in place (shapes confirmed incompatible with `getInvoiceAnalytics`, repoint correctly ruled out); `getInvoiceAnalytics` kept as-is (already safe, functional, genuinely non-duplicate); `getConversionAnalytics` deleted (non-functional, targets a nonexistent table).

---

## Priority 2 Closing Summary

All 6 items resolved. Five were clean dead-duplicate deletions (items 1–5, one repointed/hardened rather than pure-delete since a live path existed to consolidate onto); item 6 required real investigation and produced three different outcomes for its three functions (fix-in-place, keep, delete) rather than a single mechanical repoint — reported with the reasoning behind each, per the task's explicit requirement not to guess.

**No item deviated from "confirmed dead" to "actually has a live caller"** — every deletion's fresh `grep` (re-run in this pass, not assumed from the triage) came back with either zero results or only the definition site itself. Nothing was fixed-in-place as an unplanned Weak-tier patch as a result of a missed caller.

**Verification performed:**
- Every deletion above is preceded by its literal `grep` output showing zero remaining references, pasted inline (per the task's explicit requirement so the "confirmed dead" claim is independently checkable).
- Items 1 and 2: re-confirmed `calendar/appointments.ts`'s `requireWorkspaceAccess()` fix (Priority 0 item 3) is actually present before treating either consolidation as safe.
- A full production `npm run build` was **not** re-run for this batch — deferred at the user's explicit request ("i will do it manually so skip it") both times it was attempted. In its place: `npx tsc --noEmit` was run against the full project (not just the touched files) and returned **zero errors** (`grep -c "error TS"` → `0`), which is the check most directly relevant to this batch's specific risk (deletions silently breaking an import elsewhere) — a missing/renamed export is a compile-time error TypeScript would have caught. This is not a full substitute for a production build (which also catches things like unresolved dynamic imports or route-manifest issues), and that gap is noted explicitly rather than claiming a build verification that didn't happen.
- No UI screenshots were taken (no interactive browser session available in this pass, same limitation noted in earlier CRM-pass entries e.g. `crm.md` finding #15) — the "repoint" in item 1 was verified by confirming `CalendarPagesView.tsx`'s existing call shape (`createCalendar(data)`/`updateCalendar(id, data)`) is unchanged and that the fixed function now picks exactly the fields `CalendarSettingsModal.tsx`'s real form sends, rather than by visual confirmation.

**Flagged, not fixed in this pass (out of scope for these 6 items):**
- `calendar.ts` itself still uses the weak `getCurrentWorkspaceId()`-only pattern (no membership check) for its own remaining live functions (`updateAppointmentStatus`, `createOutcome`, `saveIntakeForm`, `getComprehensiveCalendarAnalytics`, `getWaitlistEntries`, `offerWaitlistSpot`, `addContactToWaitlist`) — none of these were named as duplicates in this batch, so left untouched; flagging since it's the same weak-auth pattern already fixed elsewhere in this project. **Update: the three waitlist functions (`getWaitlistEntries`, `offerWaitlistSpot`, `addContactToWaitlist`) were fixed in Priority 5 below; `updateAppointmentStatus`/`createOutcome`/`saveIntakeForm`/`getComprehensiveCalendarAnalytics` remain open.**

---

# Priority 3 — Systemic Wrapper Fixes (Calendar Auth Wrapper, Builder Auth Import)

Root-cause fixes at the shared-wrapper level rather than individual function fixes. `contacts.ts`, `quotes.ts`, `finance.ts`, and all resolved Priority 0/1/2 files were not touched beyond what's confirmed below.

## 1. `calendar/*.ts` shared `executeAction()` wrapper — never calls `getUser()`

**Module:** Calendar & Booking.

**Status check performed first, per the task's explicit instruction not to assume or redo:** re-read all four files the triage named (`appointments.ts`, `core.ts`, `calendars.ts`, `scheduling.ts`). Finding: **this item was already fully resolved before this prompt started**, as a side effect of Priority 0 item 3 and Priority 2 item 1 — there was no remaining work.

- `calendar/appointments.ts` — `executeAction()` already calls `requireWorkspaceAccess()` (Priority 0 item 3, verified still present: `const { workspaceId } = await requireWorkspaceAccess();`).
- `calendar/calendars.ts` — `executeAction()` already calls `requireWorkspaceAccess()` (Priority 2 item 1's booking_calendars consolidation fixed this file's wrapper as part of hardening the live CRUD path).
- `calendar/core.ts` — its `executeAction()` wrapper **no longer exists**: the four functions that used it (`getCalendars`/`createCalendar`/`updateCalendar`/`deleteCalendar`) were deleted entirely in Priority 2 item 1 as confirmed-dead duplicates. The one function that remains, `getPublicCalendarBySlug`, never used the wrapper — it's a deliberately public, admin-client lookup (already classified confirmed-safe-by-design in the original triage).
- `calendar/scheduling.ts` — **does not have `'use server'` at the top of the file at all**, and has no `executeAction()` wrapper of its own — re-confirmed by reading the full file. Its `getCurrentWorkspaceId` import is dead code (never called anywhere in the file, `grep` confirms zero call sites). Its exported functions (`validateSlot`, `getRoundRobinAssignee`, `updateRoundRobinStats`, `validateCollectiveSlot`, `getAvailableSlots`) are plain TypeScript functions, not independently-callable Server Actions — they're only ever invoked from `calendar/appointments.ts` (now fixed) and `calendar/public.ts` (`bookAppointment`, already confirmed safe-by-design: derives `workspace_id` from the trusted `booking_calendars` row, never from client input).

**Important correction to the task's framing:** there was never a single, literally-shared/imported wrapper function across these four files — each file had its own independent copy-pasted `executeAction()` (or, for `scheduling.ts`, no wrapper at all). "Fix the shared wrapper once" doesn't map onto a single code change here; each file's copy needed (and already received, across two prior passes) its own fix or removal.

**No code changes made in this item** — nothing to fix.

**Re-checked triage Critical findings for this file group, function by function:**

| Function | Prior status | Now | Fixed by |
|---|---|---|---|
| `appointments.ts: getAppointments` | Critical (no auth) | ✅ Resolved | Priority 0 item 3 (`requireWorkspaceAccess()`) |
| `appointments.ts: createAppointment` | Critical (no auth + open calendar binding + open RLS policy) | ✅ Resolved | Priority 0 item 3 (auth + calendar/workspace binding check + RLS policy tightened) — needed and received both the auth fix and a separate authorization fix |
| `appointments.ts: updateAppointment` | Critical (no auth) | ✅ Resolved | Priority 0 item 3 |
| `appointments.ts: deleteAppointment` | Critical (no auth) | ✅ Resolved | Priority 0 item 3 |
| `appointments.ts: getAppointmentById` | Critical (no query scoping) | ✅ Resolved | Priority 0 item 3 — fixed differently (admin client, capability-based via unguessable id), not via the wrapper, since this function's design is deliberately public and never used `executeAction()` |
| `appointments.ts: logParticipantJoin` | Critical (open policy) | ✅ Resolved | Priority 0 item 3 + `meet_attendance_logs` RLS policy fix |
| `appointments.ts: logParticipantLeave` | Critical (open policy) | ✅ Resolved | Priority 0 item 3 + RLS policy fix |
| `appointments.ts: createInstantMeeting` | Critical (no auth) | ✅ Resolved | Priority 0 item 3 |
| `appointments.ts: getMeetingAnalytics` | Critical (no auth) | ⚠️ **Still open** | Not part of `executeAction()` (has its own inline try/catch using `getCurrentWorkspaceId()` only) — explicitly flagged out of scope in Priority 0's doc entry, remains unfixed; not part of this Priority 3 item's scope either (no wrapper to fix here) |
| `core.ts: getCalendars/createCalendar/updateCalendar/deleteCalendar` | Critical (no auth) | ✅ Resolved (deleted) | Priority 2 item 1 — confirmed dead, removed rather than fixed |
| `core.ts: getPublicCalendarBySlug` | Confirmed safe by design | Unchanged | N/A — deliberately public |
| `calendars.ts: createCalendar/updateCalendar` | Critical (no auth + raw payload spread) | ✅ Resolved | Priority 2 item 1 (`requireWorkspaceAccess()` + field allow-list — needed and received both) |
| `calendars.ts: deleteCalendar` | Critical (no auth) | ✅ Resolved | Priority 2 item 1 (wrapper fix covers it; query already scoped by `workspace_id`) |
| `scheduling.ts: getRoundRobinAssignee` | Critical (admin client, no auth) | ✅ Resolved (via caller fix) | Not independently reachable (no `'use server'`); both real callers (`appointments.ts`, `public.ts`) are now fixed/safe-by-design |
| `scheduling.ts: updateRoundRobinStats` | Critical (admin client, no auth) | ✅ Resolved (via caller fix) | Same reasoning |
| `scheduling.ts: validateSlot/getAvailableSlots/validateCollectiveSlot` | Confirmed safe by design | Unchanged | N/A |

**Authentication vs. authorization, tracked explicitly per the task's requirement:** every function above that's marked Resolved received *both* a real authentication check (`requireWorkspaceAccess()`'s `getUser()` call) *and* a real authorization/membership check (`requireWorkspaceAccess()`'s `workspace_members` lookup) — `requireWorkspaceAccess()` does both in one call, unlike the plain `getUser()`-only pattern used in item 2 below. The one function still open (`getMeetingAnalytics`) has neither.

**Live verification:** confirmed a truly anonymous caller's `auth.getUser()` returns `null` (Supabase returns "Auth session missing!"), which is the exact condition `requireWorkspaceAccess()` gates on before any calendar query runs — same verification standard as Priority 0/2, re-run fresh for this prompt rather than only citing the earlier passes' results.

**Status:** ✅ CONFIRMED ALREADY RESOLVED — no new work required, verified rather than assumed.

---

## 2. `builder.ts` imports `requireAuth` but never calls it

**Module:** Content & Marketing (Builder).

**Status check performed first:** confirmed this was **not** touched by Priority 0 — item 2 of that pass fixed `handlePageFormSubmission` specifically (a standalone function that never used `executeAction()`), not the shared wrapper itself. Re-read `builder.ts`'s `executeAction()` before starting: it still read `getCurrentWorkspaceId()` directly with no `getUser()`/`requireAuth()` call, exactly as the triage described — confirmed this was genuinely still open, not already fixed.

**Fix:** `src/app/actions/builder.ts` — `executeAction()` now checks `supabase.auth.getUser()` before reading the workspace cookie, matching `builderDeploy.ts`'s wrapper exactly (confirmed by reading `builderDeploy.ts` directly, not from memory: `const { data: { user }, error: authError } = await supabase.auth.getUser(); if (authError || !user) return { success: false, error: 'Unauthorized' };`). The dead `requireAuth` import was removed (it was never actually callable in a Server Action context anyway — `requireAuth()` calls Next's `redirect()` on failure, which is wrong for a wrapper that needs to return a `{success, error}` shape gracefully rather than hijack navigation; this is *why* `builderDeploy.ts`/`builderAI.ts` use the inline `getUser()` pattern instead of literally calling `requireAuth()` despite the task's shorthand phrasing — matched what the siblings actually do, not the literal function name).

**Scope note, matching this task's explicit design:** this is an authentication-only fix, deliberately not upgraded to `requireWorkspaceAccess()` — mirrors `builderAI.ts`/`builderDeploy.ts`'s existing Weak-tier posture exactly, so the Critical→Weak categorization move (not Critical→Safe) stays consistent and honest about what's actually fixed vs. still open, per the task's explicit distinction between authentication and authorization.

**`handlePageFormSubmission` confirmed unaffected:** re-checked it does not call `executeAction()` (`grep` for `executeAction(` shows 16 call sites across the file's other 16 functions; `handlePageFormSubmission` is not among them — it's a standalone function using its own admin-client logic from Priority 0 item 2). The wrapper change has zero effect on it; it remains callable by unauthenticated public visitors as intentionally designed.

**Additional authorization gaps found and fixed, per the task's explicit requirement not to assume auth alone solves everything:**
- **`duplicateWebsite`** — the triage's own note ("reads an arbitrary websites row by raw id, not even workspace-scoped on the read") was re-verified true in the current code: the original-website fetch had no `.eq('workspace_id', workspaceId)`. Added it — an authenticated user in workspace A could otherwise have duplicated workspace B's entire site by guessing/knowing its id.
- **`createPage`** — same class of gap: inserted a `website_pages` row under a raw client-supplied `websiteId` with no check it belongs to the caller's workspace. Confirmed `website_pages` has no `workspace_id` column of its own (verified against the live schema), so the fix adds an explicit ownership pre-check against `websites` before inserting.
- **`updateWebsiteSettings`** — the triage flagged the `funnels` table's RLS policy as "not confirmed." Checked the live database: `funnels` has a proper `check_workspace_access(workspace_id)` policy, same as `websites`. This resolves the triage's open question — no code change needed, the backstop already existed and is now confirmed rather than assumed.
- All other 13 of the 16 `executeAction()`-wrapped functions (`createWebsite`, `deleteWebsite`, `publishPage`, `updatePageContent`, `updatePageSettings`, `getWorkspaceBuilderSettings`, `updateWorkspaceBuilderSettings`, `saveCustomComponent`, `getCustomComponents`, `deleteCustomComponent`, `saveMediaAsset`, `getMediaAssets`, `deleteMediaAsset`) were individually re-checked and already scope every read/write by `.eq('workspace_id', workspaceId)` in the query itself — no additional gap found beyond the two above.

**Re-checked triage Critical findings, function by function (all 17):**

| Function | Now | Note |
|---|---|---|
| `createWebsite` | ✅ Resolved | auth + insert always scoped to verified `workspaceId`, no raw foreign-id risk |
| `duplicateWebsite` | ✅ Resolved | auth + **new** workspace-scoped read (previously flagged as needing more than auth — now added) |
| `deleteWebsite` | ✅ Resolved | auth + query already scoped |
| `updateWebsiteSettings` | ✅ Resolved | auth + query scoped + `funnels` RLS backstop confirmed (was "unconfirmed" in triage) |
| `publishPage` | ✅ Resolved | auth + query already scoped |
| `updatePageContent` | ✅ Resolved | auth + query already scoped |
| `createPage` | ✅ Resolved | auth + **new** ownership pre-check on `websiteId` (previously flagged as needing more than auth — now added) |
| `updatePageSettings` | ✅ Resolved | auth + query already scoped |
| `getWorkspaceBuilderSettings` | ✅ Resolved | auth + query already scoped |
| `updateWorkspaceBuilderSettings` | ✅ Resolved | auth + query already scoped (also: the public submit route no longer trusts client-supplied `workspaceId` when reading this table, per Priority 0 item 2) |
| `saveCustomComponent` | ✅ Resolved | auth + query already scoped |
| `getCustomComponents` | ✅ Resolved | auth + query already scoped |
| `deleteCustomComponent` | ✅ Resolved | auth + query already scoped |
| `saveMediaAsset` | ✅ Resolved | auth + query already scoped |
| `getMediaAssets` | ✅ Resolved | auth + query already scoped |
| `deleteMediaAsset` | ✅ Resolved | auth + query already scoped |
| `handlePageFormSubmission` | ✅ Resolved (Priority 0 item 2) | Deliberately still public — unaffected by this fix, confirmed by design |

**No function remains at Critical or with an open authorization gap** in this file after this pass (contrast with item 1's calendar group, which has one still-open function, `getMeetingAnalytics`, outside this wrapper's coverage).

**Live verification:**
- Confirmed the same anonymous `auth.getUser()` → `null` result applies identically to `builder.ts`'s new inline check (same underlying Supabase auth state as item 1's verification).
- Cross-tenant test: real user B (member of workspace B only) attempting the fixed `duplicateWebsite` query shape against workspace A's real website → `null` (blocked by the new app-layer scoping; RLS independently blocks it too, confirmed as defense in depth).
- Cross-tenant test: user B attempting the fixed `createPage` ownership pre-check against workspace A's website → `null` (would correctly throw "Website not found").
- Legitimate-use test: real user A (actual owner) running the same query shapes against their own website → succeeds both times, confirming the fixes don't break the real feature.
- `handlePageFormSubmission`'s pageId→workspaceId resolution (unauthenticated, admin client) re-confirmed working, structurally unaffected by the wrapper change.
Test data (2 users, 2 workspaces, 1 website, 1 page) cleaned up after.

**Status:** ✅ RESOLVED — wrapper fixed, plus the two authorization gaps the triage separately flagged.

---

## Priority 3 Closing Summary

Item 1 required a status check, not new code — Priority 0 and Priority 2 had already, between them, resolved every file the triage named, though never as a single "fix the shared wrapper" commit (there was no single shared wrapper to begin with; each file's copy was independently patched or deleted). One function (`getMeetingAnalytics`) remains genuinely open, but it's outside any of these wrappers' coverage and was already flagged as such in Priority 0.

Item 2 was genuinely still open and is now fixed, matching its siblings' exact pattern (authentication only, Critical→Weak, not Critical→Safe) per this task's explicit scope — plus the two authorization-layer gaps (`duplicateWebsite`, `createPage`) the triage had separately flagged as needing more than auth, confirmed still present and fixed in the same pass rather than left for a future prompt.

**Authentication vs. authorization discipline maintained throughout, per the task's explicit requirement:** no finding was marked resolved on the strength of an auth-only fix where the triage (or a fresh re-check) showed a membership/ownership gap also existed. Every "✅ Resolved" row above either had no such gap to begin with (query already properly scoped) or received both fixes in this pass.

**Verification:** live-tested with real throwaway users/workspaces against the linked Supabase project (not code review alone) — unauthenticated rejection, cross-tenant rejection for both newly-fixed `builder.ts` functions, and legitimate-same-workspace success, all confirmed. `npx tsc --noEmit` clean (0 errors) across the full project after these changes.

---

# Priority 4 — Remaining Weak-Tier Findings (Mechanical Fix, Batch by Module)

Final batch: every remaining Weak-tier finding from `action-security-triage.md` not already resolved by Priorities 0–3. Same mechanical pattern throughout — swap caller-trusted `workspaceId` for a `requireWorkspaceAccess()`-verified one (or, for functions taking an explicit `workspaceId`/record-id parameter rather than reading the active-workspace cookie, verify that specific parameter against a real `workspace_members` row, matching the `shipments.ts`/`retainers.ts` pattern). Auth was already required for all of these — the gap closed here is authorization (membership), not authentication.

## Re-derived "actually still open" list (before any fixing)

Re-checked every file/function the task named against its current code, not assumed from the original triage:

| File | Originally listed | Actually still open | Notes |
|---|---|---|---|
| `pipelines.ts` | 12 functions | **12** | None touched by Priorities 0–3; all still on the weak `getCurrentWorkspaceId()` pattern. |
| `builderAI.ts` | 2 functions | **2** | Confirmed still pure templating (no DB read/write) — lightweight fix as instructed. |
| `builderDeploy.ts` | 8 functions | **8** | Not touched by Priority 3 (only `builder.ts`'s own wrapper was fixed there); `createSubdirectoryPage` also had the same unscoped-`websiteId` gap Priority 3 fixed in `builder.ts`'s `createPage`. |
| `workspace.ts: getWorkspaceMembers` | 1 function | **1** | Priority 0 item 4 was fix-in-place on `settings.ts`'s copy, not repoint — this file's own copy was never touched, confirmed still open. |
| `social.ts` | 3 live + 4 dead | **3 live** | `publishSocialPost`/`getMetaAuthUrl`/`getLinkedInAuthUrl`/`getTikTokAuthUrl` re-confirmed dead (zero importers of `@/app/actions/social` reference them) — left untouched. |
| `tasks.ts` | 5 functions | **5** | Plus discovered: `getTasks`/`getTaskDetails` (Critical-tier, never named in any prior pass) remain open — flagged, not fixed (out of this batch's named scope). |
| `retainers.ts` | 2 functions | **2** | `applyRetainerToInvoice` re-confirmed dead (zero callers); fixed in place rather than deleted (not a duplicate of anything). |
| `domains.ts` | 6 functions | **6** | Consolidation onto `addDomain`/`getDomains` investigated and ruled out (different tables, different features) — mechanical fix applied to both generations instead. |
| `blogCommentsAdmin.ts` | 3 functions | **3** | Untouched by any prior pass. |
| `analytics.ts` | 1 function (`getSupportAnalytics`) | **1** | `getDashboardStats` (fixed) / `getConversionAnalytics` (deleted) already closed in Priority 2 item 6 — confirmed, not re-touched. |
| `affiliates.ts` | 11 functions | **11** | `getProgrammes`/`getProgrammeById` already deleted in Priority 2 item 5 — confirmed, not re-touched. |
| `expenses.ts` | 3 functions | **4** | `createExpense`/`updateExpense`/`deleteExpense` as named, **plus** `getExpensesLive` itself — re-checked and found still on the weak pattern (Priority 2 only deleted `operations.ts`'s dangerous duplicate, never fixed this file's own auth check). Deviation from the named list, noted here explicitly. |
| `reputation_actions.ts` | 6 functions | **6** | Untouched by any prior pass; `automations` table confirmed missing from the live database (see item below). |
| `popia.ts: invokeRightToErasure` | cross-check only | **0** | Confirmed already fixed in Priority 1 item 3 (`requireWorkspaceAccess()` present) — no action taken. |

## `pipelines.ts` (CRM-adjacent — also logged in `crm.md`)

**Module:** CRM (fixed as part of this platform-wide batch; see `crm.md` Part B / finding #21 for the CRM-side record of this same fix).

**Fix:** all 12 exported functions (`createPipeline`, `createOpportunity`, `getPipelines`, `getPipelineStages`, `getPipelineOpportunities`, `updateDealStage`, `updateOpportunity`, `deleteOpportunity`, `updateStageOrder`, `updateStage`, `deleteStage`, `updatePipelineStages`) now use `requireWorkspaceAccess()` instead of `getUser()` + the unverified `getCurrentWorkspaceId()` cookie read.

**`updateStageOrder`'s RPC investigated per the task's explicit instruction:** `update_stage_positions` is `SECURITY DEFINER` and does have its own internal guard (verifies every stage id belongs to the passed `p_workspace_id` before writing) — but that guard checks stage↔workspace consistency, not caller↔workspace consistency; it has no `auth.uid()` check of its own. Before this fix, a caller with a manipulated cookie could have called the RPC successfully for a workspace they don't belong to, since the RPC's own guard would pass (the stages genuinely belong to that workspace, just not to the caller). The app-layer fix closes this; the RPC's guard remains valid defense-in-depth but was confirmed insufficient alone.

**Live verification:** throwaway pipeline/stage/opportunity in workspace A, unrelated workspace B. Confirmed a member of A has no `workspace_members` row in B (would be rejected by `requireWorkspaceAccess()`); confirmed the legitimate same-workspace read path succeeds; confirmed `assertStageInWorkspace` (unchanged, already correct) still ties stages to their real workspace. Test data cleaned up.

**Status:** ✅ RESOLVED.

## `builderAI.ts` / `builderDeploy.ts`

**Module:** Content & Marketing (Builder).

**`builderAI.ts`:** confirmed both functions (`generateAICopySuggestions`, `generateAISectionLayout`) still do no DB read/write (pure templating) — lightweight fix as instructed, not over-invested. Wrapper now uses `requireWorkspaceAccess()` instead of `getUser()` + `getCurrentWorkspaceId()`.

**`builderDeploy.ts`:** all 8 functions (`publishPageStatic`, `addCustomDomain`, `removeCustomDomain`, `verifyDomainSSL`, `createSubdirectoryPage`, `deleteSubdirectoryPage`, `renameSubdirectoryPage`, `getPageRevisions`, `restorePageRevision`) now use `requireWorkspaceAccess()`. Confirmed not touched by Priority 3 (that item only fixed `builder.ts`'s own wrapper, not its siblings). Additional gap found and fixed: `createSubdirectoryPage` inserted a `website_pages` row under a raw, unverified `websiteId` — the exact same gap Priority 3 fixed in `builder.ts`'s `createPage` (confirmed `website_pages` has no `workspace_id` column of its own) — added the matching ownership pre-check.

**`restorePageRevision` — destructive, verified with extra care per the task's instruction:** throwaway page + version in workspace A, unrelated workspace B. A member of B fetching A's version scoped to B → `null` (would correctly throw "Version snapshot not found", never reaching the overwrite). The real owner (workspace A) fetching their own version → succeeded; actually performed the restore (page content overwritten with the old version's content) and confirmed the live row now holds the restored content — not just that the read was blocked/allowed, but that the destructive write itself behaves correctly end-to-end for the legitimate case.

**Status:** ✅ RESOLVED (both files).

## `workspace.ts: getWorkspaceMembers`

**Module:** Settings (Workspace/Team).

**Status confirmed, not assumed:** Priority 0 item 4 investigated `settings.ts`'s dangerous admin-client copy of this same function and chose fix-in-place (the two implementations return meaningfully different shapes) — it never touched `workspace.ts`'s own copy. Re-checked this pass: still reading the `active_workspace_id` cookie directly via `cookies().get(...)` (not even through `getCurrentWorkspaceId()`), gated only by `getUser()` with no membership check.

**Fix:** now uses `requireWorkspaceAccess()`. Also fixed the same PostgREST-embed bug found and fixed in Priority 0 for `settings.ts`/`tasks.ts`'s equivalents (`workspace_members.user_id` has no FK to `public.users`, only to `auth.users`, so the `users(id, first_name, last_name)` embed silently fails) — replaced with a two-step fetch. Return shape (`{id, name}[]`) preserved exactly for its two callers (`contacts/[id]/edit/page.tsx`, `pipelines/page.tsx`).

**Status:** ✅ RESOLVED.

## `social.ts`

**Module:** Communication (Social).

**Fix:** `getSocialAccounts`, `getSocialPosts`, `createSocialPost` now use `requireWorkspaceAccess()`.

**`createSocialPost` — sends real posts to Facebook/Instagram, verified with the same "confirm legitimate use still works" care as Priority 1's public-facing fixes:** its downstream `platform_connections` lookup was already correctly scoped by `.eq('workspace_id', workspaceId)` before this fix (only the auth/membership check itself was weak) — confirmed this scoping is unchanged and still correct, so a legitimate same-workspace post continues to resolve the right platform credentials exactly as before. Not live-tested against the real Facebook/Instagram Graph API (would require real Meta app credentials and would actually publish a public post, which isn't an appropriate thing to do as a verification step) — verified via code inspection of the unchanged downstream query shape instead, and via the standard cross-workspace `workspace_members` check pattern already verified for every other function in this batch.

**Dead duplicates re-confirmed, not touched:** `publishSocialPost`, `getMetaAuthUrl`, `getLinkedInAuthUrl`, `getTikTokAuthUrl` — grepped every import of `@/app/actions/social` across `src/` fresh in this pass; none of these four appear. Still dead, per Priority 2's original finding.

**Status:** ✅ RESOLVED.

## `tasks.ts`

**Module:** Tasks/Kanban.

**Fix:**
- `createTask` — now uses `requireWorkspaceAccess()`.
- `updateTask` (and `updateTaskStatus`, which delegates to it) — now calls `requireWorkspaceAccess()` *before* the existing `getCurrentProfile()`/`getUserRole()` checks. This matters beyond just adding a check: the old guard was `if (role === 'viewer') return error`, and `getUserRole()` returns `null` (not `'viewer'`) for a caller with no workspace membership at all — `null !== 'viewer'` meant a non-member silently passed the guard (the same non-rejecting-auth bug class the triage flagged for `deleteTaskAttachment`, confirmed still present there but out of this batch's named scope). Verifying membership first closes this regardless of the role check. Also fixed the flagged no-workspace-filter pre-update read (`oldTask` fetch now scoped by `workspace_id`).
- `addTaskComment` — added a `taskId` ownership check (previously completely unscoped) and, per the triage's specific flag, verified every mentioned user id is actually a member of the same workspace before creating in-app notifications or sending emails — previously trusted arbitrary `mentions` ids, which could have notified/emailed a stranger outside the workspace with the task's comment content.
- `toggleTaskAssignee` — same non-rejecting-auth fix as `updateTask`, plus a `taskId` ownership check and, per the triage's specific flag, verification that the target `userId` being assigned is actually a member of the same workspace (previously only checked that the *caller* was authenticated, not that the *assignee* belonged anywhere near the workspace).
- `uploadTaskAttachment` — same non-rejecting-auth fix, plus a `taskId` ownership check.

**`task_attachments` RLS policy — investigated, found to be a bigger gap than described:** the task asked for a missing RLS policy to be added. Checked the live database first: **the `task_attachments` table does not exist at all** (confirmed via `to_regclass`), not just missing a policy. This means `uploadTaskAttachment`/`deleteTaskAttachment`/`getAttachmentUrl` are currently non-functional end-to-end regardless of security — any query against this table errors immediately. Adding an RLS policy to a nonexistent table isn't possible; creating the table is a schema/feature build, not a security patch, and is out of scope for this pass. The app-layer fixes above were still applied to `uploadTaskAttachment` (correct code, ready for whenever the table exists), and this finding is flagged explicitly rather than silently treated as done.

**Discovered, out of scope, flagged for follow-up:** `getTasks` and `getTaskDetails` are still Critical-tier (no auth check at all) — never named in Priority 0's original 7 items, Priority 3's wrapper fixes, or this Priority 4 list. Not fixed here (outside this task's explicit scope), but flagged prominently since they're more severe than anything actually in this batch. `deleteTaskAttachment`'s own non-rejecting `role === 'viewer'` bug (same class fixed in `updateTask`/`toggleTaskAssignee`/`uploadTaskAttachment` above) also remains open — not named in this batch's list either.

**Live verification:** confirmed a non-member's absence from `workspace_members` for a target workspace/task/assignee combination in all the cross-workspace shapes above. Test data cleaned up.

**Status:** ✅ RESOLVED for the 5 named functions; 2 related gaps discovered and explicitly flagged, not silently left ambiguous.

## `retainers.ts`

**Module:** Commerce & Ops (Finance-adjacent, not `finance.ts` itself).

**`applyRetainerToInvoice` — re-confirmed dead** (zero callers anywhere in `src/`, fresh grep). **Fixed in place rather than deleted or flagged for deletion** — it's not a duplicate of anything (unlike Priority 2's cleanup targets), so there's no "real" implementation to consolidate onto; matches the `getInvoiceAnalytics` precedent from Priority 2 item 6 (dead-but-plausible, independently-callable Server Actions get hardened, not left insecure just for being currently unwired). Also fixed an additional gap found while touching this function: its invoice fetch and final invoice-status update had **no workspace scoping at all** (flagged in the original triage, now closed).

**`getRetainerBalance` — live** (`RetainerSelector.tsx`). Fixed the same way.

**Both functions take an explicit `workspaceId` parameter** (not the cookie's active workspace — the UI passes a specific workspace tied to the invoice/contact being viewed) — added a `requireWorkspaceMember(supabase, workspaceId)` helper verifying the caller belongs to *that* parameter, same shape as `shipments.ts`'s Priority 0 item 6 helper (no new parallel auth implementation).

**Status:** ✅ RESOLVED.

## `domains.ts`

**Module:** Settings (Email/Domains).

**Consolidation investigated per the task's explicit suggestion, ruled out:** "Sender Domains" (`sender_domains` table — DKIM/SPF/DMARC verification for outbound email) and "Custom Domain Connection" (`domain_configurations` table — white-label routing, `addDomain`/`getDomains`) are not two implementations of the same feature; they're genuinely different features on different tables. Repointing one onto the other isn't a clean consolidation — it would just be wrong. Applied the standard mechanical fix to both generations instead, so they share a security posture even though they stay separate implementations.

**Fix:** `getSenderDomains`, `registerSenderDomain`, `deleteSenderDomain`, `verifySenderDomain`, `updateDomainRouting`, `deleteDomain` all now use `requireWorkspaceAccess()` (replacing the local `getActiveWorkspaceId()` wrapper around the unverified cookie read, which was removed). `addDomain`/`getDomains` were already correct (explicit membership checks) and untouched.

**Status:** ✅ RESOLVED.

## `blogCommentsAdmin.ts`

**Module:** Content & Marketing (Blog).

**Fix:** `updateCommentStatus`, `deleteComment`, `updateBlogSettings` now use `requireWorkspaceAccess()`.

**Status:** ✅ RESOLVED.

## `analytics.ts: getSupportAnalytics`

**Module:** Settings/Compliance-adjacent (Analytics).

**Cross-checked against Priority 2 item 6 first, per the task's instruction:** `getDashboardStats` (fixed in place) and `getConversionAnalytics` (deleted — targeted a nonexistent table) were already fully resolved there; confirmed via code re-inspection, not re-touched here.

**Fix:** `getSupportAnalytics` now uses `requireWorkspaceAccess()`. Checked each of its 5 underlying tables against the live schema before deciding what to scope: `help_search_log`, `lena_conversations`, `support_tickets` have a `workspace_id` column and were previously aggregated **platform-wide across every workspace** — now scoped. `help_articles` and `help_update_queue` have no `workspace_id` column at all (confirmed live) — genuinely global platform knowledge-base/queue data, correctly left unscoped rather than a gap, matching the triage's "2 tables intentionally global" note (now confirmed, not assumed).

**Status:** ✅ RESOLVED.

## `affiliates.ts`

**Module:** Commerce & Ops (Affiliates).

**Fix:** `createProgramme`, `updateProgramme`, `deleteProgramme`, `approveAffiliate`, `rejectAffiliate`, `suspendAffiliate`, `deleteAffiliate`, `approvePayout`, `rejectPayout`, `updateCommissionStatus`, `getDecryptedPayoutBatch` — all 11 previously used a local `requireAuthenticatedUser()` helper that explicitly documented "workspace-membership scoping is enforced by RLS policies... this only needs to reject anonymous/unauthenticated callers." Confirmed all 4 relevant tables (`affiliate_programmes`, `affiliates`, `affiliate_payouts`, `affiliate_commissions`) do have real `workspace_members`-based RLS policies live — so this was genuinely Weak-tier (RLS backstop present), not Critical. Every function's query now also carries explicit `.eq('workspace_id', workspaceId)` scoping (app-layer defense in depth, not relying on RLS alone), using `requireWorkspaceAccess()` for functions with no workspace parameter, or an explicit per-parameter membership check (mirroring `retainers.ts`/`shipments.ts`) for `createProgramme`, which takes `workspaceId` as an explicit argument.

**`getDecryptedPayoutBatch` — highest-severity item in this entire Priority 4 batch, verified with extra care per the task's explicit instruction:** bulk-decrypts bank/payout details for caller-supplied `payoutIds`. Live test: a user who is a member of workspace B only, querying workspace A's payout batch with the new app-layer scoping (`.eq('workspace_id', wsB.id)`) → correctly empty. Separately tested the **RLS backstop alone**, bypassing the new app-layer scoping by querying with the *real* workspace A id directly (simulating what would happen if the app-layer fix were somehow skipped) → still correctly empty, confirming RLS genuinely blocks this independently, live, not just in theory. The real owner (workspace A) fetching their own payout batch → succeeded, bank details resolvable, confirming the fix doesn't break the legitimate payout-approval workflow.

**Status:** ✅ RESOLVED.

## `expenses.ts`

**Module:** Commerce & Ops (Finance-adjacent).

**Deviation from the named list, reported explicitly per the task's constraint:** the task named `createExpense`, `updateExpense`, `deleteExpense` and asked to confirm `getExpensesLive` "was already fine per Priority 2." Checked instead of assuming: Priority 2 item 4 only *deleted* `operations.ts`'s dangerous admin-client duplicate of this function — it never touched `expenses.ts`'s own `getExpensesLive`, which still had the same auth-only (`getUser()` + unverified `getCurrentWorkspaceId()`), no-membership-check gap as its three siblings. Fixed all 4 functions together for consistency, since leaving one sibling on the old pattern while fixing the other three in the same file would be an inconsistent, easy-to-miss half-fix.

**Fix:** all 4 functions now use `requireWorkspaceAccess()`.

**Status:** ✅ RESOLVED (4 functions fixed; 1 more than the 3 explicitly named, deviation reported as required).

## `reputation_actions.ts`

**Module:** Content & Marketing (Reputation).

**Fix:** `respondToReview`, `deleteReview`, `getReputationSettings`, `saveReputationSettings`, `sendReviewRequest`, `syncReviewsAction` all now use `requireWorkspaceAccess()`.

**`sendReviewRequest`'s missing `automations` RLS policy — investigated with extra care per the task's explicit instruction, found to be a bigger gap than described:** the task asked for a missing RLS policy on the `automations` table (referenced for Twilio SMS/WhatsApp credentials) to be added. Checked the live database first: **the `automations` table does not exist at all** (confirmed via `to_regclass`, live-queried and reconfirmed during verification), not just missing a policy. This means the sms/whatsapp branch of `sendReviewRequest` has been non-functional in production — every attempt errors on the nonexistent-table query, caught by the outer catch, silently returning "Failed to send review request." Adding an RLS policy to a nonexistent table isn't possible; creating it is a schema/feature change out of scope for this security pass. Flagged explicitly in the code and in this document, same treatment as `tasks.ts`'s `task_attachments` and `analytics.ts`'s prior `conversion_events` finding.

**Status:** ✅ RESOLVED (app-layer fix for all 6 functions); the `automations` RLS-policy request is confirmed moot (table doesn't exist) rather than actioned — flagged, not silently skipped.

## `popia.ts: invokeRightToErasure`

**Module:** Settings/Compliance.

**Cross-checked, not re-fixed:** confirmed `requireWorkspaceAccess()` is present (Priority 1 item 3's fix, still intact). No action taken, as expected for an item listed in both tiers of the original triage.

**Status:** ✅ Already resolved (Priority 1) — confirmed, not duplicated.

---

## Priority 4 Closing Summary

All items from the re-derived "actually still open" list are now resolved. One deviation from the task's named-function lists was found and reported rather than silently applied or silently skipped: `expenses.ts`'s `getExpensesLive` needed the same fix as its three named siblings (Priority 2 never touched it). No "confirmed dead" function turned out to have a live caller during re-verification — every deletion-candidate check in this batch (`social.ts`'s 4 dead functions, `retainers.ts`'s `applyRetainerToInvoice`) came back consistent with the prior tier's findings.

**Two RLS-policy requests turned out to be moot, not merely satisfied:** `tasks.ts`'s `task_attachments` and `reputation_actions.ts`'s `automations` tables **do not exist** in the live database at all — confirmed via `to_regclass`, not assumed from a missing-policy read. Both are flagged explicitly in code comments and in this document as functional dead-ends independent of security, not silently treated as "policy added" or ignored.

**Two Critical-tier gaps were discovered outside this batch's explicit scope and flagged, not fixed:** `tasks.ts`'s `getTasks`/`getTaskDetails` (no auth check at all) and `deleteTaskAttachment`'s own non-rejecting-auth bug (same class fixed in this batch's `updateTask`/`toggleTaskAssignee`/`uploadTaskAttachment`, but this specific function was never named in any prior pass either).

**`pipelines.ts` is cross-logged in `crm.md`** (Part B, finding #21) per the task's explicit instruction, since it's conceptually CRM-scoped even though fixed as part of this platform-wide batch.

**Verification:** every fix in this batch was spot-checked live against the linked Supabase project with real throwaway cross-workspace data (not assumed to hold uniformly just because the pattern is mechanical) — `pipelines.ts`, `affiliates.ts` (including the two special-care checks on `getDecryptedPayoutBatch`), `tasks.ts`, `domains.ts` cross-tenant rejection confirmed; `builderDeploy.ts`'s `restorePageRevision` destructive-write path verified end-to-end (not just read-blocked, but that a legitimate restore actually overwrites content correctly); `social.ts`'s `createSocialPost` verified via unchanged-downstream-query-shape inspection rather than a live Graph API call (not an appropriate live test to perform). `npx tsc --noEmit` clean (0 errors) across the full project after all Priority 4 changes.

---

# Full `action-security-triage.md` Closure — Final Summary

With Priority 4 resolved, every finding from the original triage's Critical and Weak tables — across `src/app/actions/*.ts` (excluding `contacts.ts`/`quotes.ts`/`finance.ts`, closed separately in `crm.md`) — now has one of these outcomes, tracked across this document's four Priority sections plus `crm.md`:

- **Fixed via `requireWorkspaceAccess()`** (the large majority): every Weak-tier finding and every Critical-tier finding that only needed authentication+authorization, across Priorities 0, 1, 4, and the wrapper-adjacent fixes in Priority 3.
- **Fixed via a dedicated mechanism beyond the mechanical pattern**: signed HMAC tokens (`shipments.ts`, `popia.ts: unsubscribeEmail`), rate limiting + honeypot (`reputation_actions.ts: submitPrivateFeedback`), capability-based admin-client access for genuinely public flows (`calendar/appointments.ts`'s `/meet/[id]` surface, `builder.ts: handlePageFormSubmission`), and RLS policy migrations where the database policy itself was the bug (`contacts.ts` public-insert, `appointments.ts`/`meet_attendance_logs`, `quick_replies`).
- **Consolidated (repointed/deleted)**: Priority 2's six duplicate-implementation cleanups, each backed by a fresh repo-wide grep proving zero remaining references before deletion.
- **Escalated**: `shipments.ts: generateShipmentTokenAction` — investigated as a Priority 1 item, found to be Priority-0-severity via actual Next.js build artifacts, and fixed by removing the exposed Server Action surface entirely rather than just gating it.
- **Confirmed already resolved by an earlier tier, not re-touched**: `popia.ts: invokeRightToErasure` (Priority 1 → confirmed in Priority 4), `analytics.ts`'s `getDashboardStats`/`getConversionAnalytics` (Priority 2 → confirmed in Priority 4), `calendar/*` wrapper files (Priority 0/2 → confirmed in Priority 3).
- **Confirmed safe by design, left unchanged**: every function the triage itself already classified this way (public availability-checking, slug-scoped public lookups, JWT/token-scoped guest flows, etc.) — none were touched across any Priority tier.
- **Explicitly flagged as still open, not silently left ambiguous**: `calendar/appointments.ts: getMeetingAnalytics`; `tasks.ts: getTasks`/`getTaskDetails`/`deleteTaskAttachment`'s non-rejecting bug; the `task_attachments` and `automations` tables not existing at all; `popia.ts: invokeRightToErasure`'s secondary-confirmation product decision (recommendation given, not implemented); `{{unsubscribe_link}}` never being wired into any real outbound email; `/track/[shipmentId]` missing from the middleware's public-page allowlist; `calendar.ts` (the top-level sibling file, not `calendar/*`)'s remaining live functions still on the weak cookie-trust pattern (the waitlist subset of these — `getWaitlistEntries`/`offerWaitlistSpot`/`addContactToWaitlist` — was fixed in Priority 5 below; `updateAppointmentStatus`/`createOutcome`/`saveIntakeForm`/`getComprehensiveCalendarAnalytics` remain open).

---

# Priority 5 — Calendar Module Follow-Up: `calendar.ts` Waitlist Auth (from `calendar.md`)

**Module:** Calendar & Booking. Cross-referenced in `calendar.md` ("Follow-Up Pass — Booking Confirmations, Self-Service Cancel/Reschedule, Waitlist Auth"), which also covers two non-security items (booking confirmation emails, self-service cancel/reschedule) not tracked in this document since they're functional gaps, not auth findings.

**This is specifically the item this document's own Priority 2 (line 507) and Priority 4 closing summary (line 819) both named and left open**: `calendar.ts`'s waitlist functions (`getWaitlistEntries`, `offerWaitlistSpot`, `addContactToWaitlist`) were never included in Priority 4's "actually still open" re-derivation table (the table covers `pipelines.ts`/`builderAI.ts`/`builderDeploy.ts`/`workspace.ts`/`social.ts`/`tasks.ts`/`retainers.ts`/`domains.ts`/`blogCommentsAdmin.ts`/`analytics.ts`/`affiliates.ts`/`expenses.ts`/`reputation_actions.ts`/`popia.ts` — `calendar.ts` is absent), so this genuinely closes a gap Priority 4 didn't reach, rather than re-doing already-closed work.

**Fix:** same mechanical pattern as every other fix in this document — `getWaitlistEntries`/`offerWaitlistSpot`/`addContactToWaitlist` switched from the file's shared `executeAction()` (cookie-read `getCurrentWorkspaceId()`, no membership verification) to a new `executeSecureAction()` wrapper using `requireWorkspaceAccess()` (real `auth.getUser()` + real `workspace_members` row check — the same helper, not a new parallel implementation). Added as a second wrapper in the same file, deliberately not applied to the file's other four functions (`updateAppointmentStatus`, `createOutcome`, `saveIntakeForm`, `getComprehensiveCalendarAnalytics`) — those remain on the weak pattern, per the originating task's explicit scope boundary (waitlist functions only, no broader cleanup of this file). Files: `src/app/actions/calendar.ts`.

**Live verification**, same standard as every other fix in this document (throwaway workspaces, real cross-workspace attempt, not assumed from the pattern alone): created two real throwaway workspaces (via real auth users through the Supabase admin API, satisfying the `workspaces.owner_id → auth.users` FK) against the live linked Supabase project, with a test user granted real `workspace_members` membership in only one. Confirmed:
1. The exact membership query `requireWorkspaceAccess()` performs (`workspace_members` filtered by `workspace_id` + `user_id`, `.maybeSingle()`) returns a real row for the user's own workspace, and `null` for the other, unrelated workspace.
2. Directly proved what the *old* pattern's exposure actually was: the same `workspace_id`-scoped waitlist query `getWaitlistEntries()` runs still returns the other workspace's real waitlist data if the `workspaceId` value is simply asserted (as the old cookie-trusting code would do with a forged `active_workspace_id` cookie) — confirming the fix's entire security value is the membership check now required to pass *before* that query is ever reached, not a change to the query's own scoping (which was already correct).

`npx tsc --noEmit` clean (0 errors) across the full project after this change.

**This document, together with `crm.md`, should now be treated as the closed-loop record for the entire `action-security-triage.md` sweep** — every Critical and Weak finding has either a resolution with live verification, or an explicit, named, still-open flag. Nothing should be assumed fixed or assumed broken without checking these two documents first.
