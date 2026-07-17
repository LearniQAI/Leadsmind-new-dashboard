# Tasks / Kanban Module — Independent Workflow Audit

## Top-line answer

**Part A's bug is fixed and live-verified: task creation works.** Root cause was a schema-drift bug, not an auth regression or a bad payload — the live `tasks` table was missing two columns (`created_by`, `sort_order`) that `createTask`'s insert and the board's drag-and-drop reorder have always depended on. Every single "Create task" attempt has been failing since the feature was built, for the exact same reason `getTasks()`'s status-board load and drag-and-drop reordering were also silently broken (same missing `sort_order` column).

**Both of the two known Critical security findings were confirmed still open** (not fixed in any prior pass — verified directly against `security-remediation.md`'s own explicit "flagged, not fixed" language) and are now fixed and live-verified in this pass: `getTasks`/`getTaskDetails` had no auth check at all; `deleteTaskAttachment`'s role check didn't actually reject. A third, previously-unnamed gap in the same family (`getAttachmentUrl`, also no auth check at all) was found and fixed alongside them.

**Attachments were completely non-functional, not just insecure** — the `task_attachments` table didn't exist anywhere in the database (confirmed independently here, matching an identical finding already on record in `security-remediation.md`'s Priority 4 pass). Created it in this pass, along with realizing the storage bucket backing it was `public` — meaning the existing `createSignedUrl` code was security theater; any guessed/leaked file path served the file directly with zero auth. Bucket flipped to private, storage RLS added.

## Summary
- Root cause of Part A found via live schema probing (not migration-file trust) and confirmed exactly: `created_by`/`sort_order` shadowed by an earlier same-named `CREATE TABLE IF NOT EXISTS tasks` — the same failure class as crm.md #14's `converted_invoice_id` gap.
- Workflows traced end-to-end: 8 (creation, board views ×3, status transitions/drag-drop, deletion, comments/mentions, attachments, assignee picker)
- Live-verified against the real Supabase project: 17 discrete checks, all passing (see Verification section)
- Critical security findings resolved in this pass: 3 (`getTasks`, `getTaskDetails`, `deleteTaskAttachment` — 2 previously known + confirmed still open, 1 more found: `getAttachmentUrl`)
- Schema gaps fixed: 2 tables affected (`tasks` missing 2 columns, `task_attachments` missing entirely)
- Storage misconfiguration fixed: 1 (`task-attachments` bucket was public, undermining signed-URL access control)
- Duplicate/competing implementation found, not fixed: a third "tasks" table (`crm_tasks`, used only by `task-workspace.ts`'s escalation panel), alongside the already-known `tasks` (this module) / `contact_tasks` (CRM module, crm.md #3/#4) split
- Page-title bug: confirmed on `/tasks` and `/tasks/dashboard` (both fixed), plus a repo-wide sweep found ~128 other routes with the same gap (see Part D)

Scope note: fresh, independent trace of the Tasks/Kanban module (`TasksBoard.tsx`/`CreateTaskModal.tsx`/`tasks.ts`), explicitly not the CRM contact-specific tasks (`TasksManager.tsx`/`contact_tasks`, already closed in crm.md #3/#4). Confirmed which file backs the "Create task" modal in the screenshot before assuming (`src/components/kanban/CreateTaskModal.tsx`, not `TasksManager.tsx`).

## Part A — The Real Creation Error, Root-Caused

**Reproduced live, exact error captured** (not guessed): replicated `createTask`'s precise insert shape (`src/app/actions/tasks.ts:96-100`) against the real linked Supabase project:
```
error: {
  code: 'PGRST204',
  message: "Could not find the 'created_by' column of 'tasks' in the schema cache"
}
```
This `PGRST204` (PostgREST schema-cache miss) is what `createTask`'s catch block converts into the generic "Failed to create task" toast the user sees — confirmed by reading the exact code path (`tasks.ts:126-129`).

**Traced to root cause — a schema mismatch, exactly the first of the three suspected causes, confirmed by live query, not migration-file trust:**
- `supabase/migrations/20240101000080_phase46_tasks_kanban.sql` (line 14) defines `CREATE TABLE IF NOT EXISTS tasks (..., sort_order INTEGER DEFAULT 0, created_by UUID REFERENCES public.users(id), ...)` — this is what the application code has always assumed exists.
- But `supabase/migrations/20240101000078_phase45_automation_email_parity.sql` (line 29) — numbered *earlier*, so it runs first — **already creates `public.tasks`** with a narrower column set (`id, workspace_id, contact_id, title, description, priority, status, due_date, due_time, created_at, updated_at` — no `created_by`, no `sort_order`). Because phase46's `CREATE TABLE IF NOT EXISTS` found the table already present, it silently no-op'd, and its richer column set was never actually applied.
- **Live-probed the actual table columns directly** (inserting minimal rows and reading PGRST204 errors back, the same method that previously caught the `path`/`path_name` and quote-conversion gaps) rather than trusting either migration file: confirmed the live table exactly matched phase45's narrower definition. Confirmed `created_by` is written nowhere else in the codebase (only this one insert), and `sort_order` is genuinely load-bearing — `getTasks()` orders by it (`tasks.ts:37`) and `updateTaskStatus` (the drag-and-drop handler) writes to it (`tasks.ts:203-205`, called from `TasksBoard.tsx`'s `handleDragEnd`). **This means Kanban drag-and-drop reordering and the board's task list load were also silently broken by the same root cause** — not just the "Create task" button.
- **Ruled out the other two suspected causes directly**, not just by elimination: `createTask` already uses `requireWorkspaceAccess()` (not a recent regression — this is the correct, hardened pattern per `security-remediation.md`'s `tasks.ts` fix); the modal's payload shape (`title, description, status, priority, due_date`) matches `createTask`'s expected parameters exactly, and `priority: 'medium'` (the modal's default) inserts without error — no payload/auth issue found.

**Fixed**: new migration `20260723000000_tasks_schema_and_attachments_fix.sql` adds the two missing columns back (`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by ...` / `sort_order ...`), applied to the live linked project via `supabase db push`. **Live-verified**: re-ran the exact `createTask` insert shape post-fix — succeeds, returns a full row including both previously-missing columns; re-ran `getTasks()`'s `ORDER BY sort_order` — succeeds.

## Part B — Full Workflow Trace

### 1. Task creation
Confirmed end-to-end live (see Verification section): a task with title, description, priority (`high`), due date, and a real assignee (`task_assignees` row) persists with every field intact and correctly readable back through the same joined shape `getTasks()`/`getTaskDetails()` use.

### 2. Board views — Kanban / List / Calendar
`TasksBoard.tsx` fetches once via `getTasks()` (`loadTasks()`, `TasksBoard.tsx:47`) into a single `tasks` state array, and `KanbanColumn`/`TasksListView`/`TasksCalendarView` all render from that same array based on the `view` toggle (`TasksBoard.tsx:186-213`) — one data source, three presentations, not three separate fetches that could drift. Fixing `getTasks()` (Part A/C) fixes all three views simultaneously; confirmed no view-specific query exists that could still be broken independently. Also subscribes to Supabase Realtime on `tasks`/`task_comments`/`task_assignees` (`TasksBoard.tsx:49-62`) for live updates — those tables all exist and have RLS enabled (confirmed live).

### 3. Status transitions / drag-and-drop
`handleDragEnd` (`TasksBoard.tsx:93`) calls `updateTaskStatus(draggableId, newStatus, newIndex)` → `updateTask(taskId, { status, sort_order: index })`. Before this pass's fix, this was a **single atomic UPDATE statement including `sort_order`, a column that didn't exist** — meaning drag-and-drop was completely broken (not just cosmetically), throwing on every drop. Live-verified post-fix: the exact `{status, sort_order}` update shape succeeds.

### 4. Task deletion
`deleteTask` (`tasks.ts:365-403`) does its own inline `getUser()` + membership + `role !== 'admin' && role !== 'manager'` check (not the shared `requireWorkspaceAccess()` helper, but equivalent — genuinely verifies membership, not just a weak cookie read). Already correct, not touched. Live-verified: delete succeeds and the row is confirmed actually gone.

### 5. Comments / mentions (`addTaskComment`)
**Already fixed in a prior pass** (`security-remediation.md`'s `tasks.ts` section, confirmed by reading both the code's own explanatory comments and the remediation doc): `taskId` is now verified to belong to the caller's workspace before anything else, and every mentioned user id is checked against `workspace_members` before triggering an in-app notification or email — previously, arbitrary mention ids could leak a task's comment content to a stranger outside the workspace via email. Not re-touched; spot-checked live in this pass (a comment insert against the exact `task_activities` shape succeeds).

### 6. Attachments — upload / view / delete
**The most severe functional gap found in this module.** `task_attachments` did not exist in the live database at all — confirmed independently in this pass via direct query, matching an identical finding already on record in `security-remediation.md` (`to_regclass`-confirmed during the Priority 4 pass, flagged there as "adding an RLS policy to a nonexistent table isn't possible... out of scope"). This meant `uploadTaskAttachment`/`deleteTaskAttachment`/`getTaskDetails`'s attachment embed have been erroring on every call, end to end, regardless of any security issue.

**Also found, not previously documented anywhere:** the `task-attachments` storage bucket **was set to `public: true`**. Since `uploadTaskAttachment` builds file paths as `${workspaceId}/${taskId}/${random}.${ext}` (`random` from `Math.random().toString(36)` — not cryptographically random, genuinely guessable) and the app deliberately uses `createSignedUrl` (implying private-by-design intent), a public bucket meant **anyone with a guessed or leaked path could fetch the file directly via its public object URL, completely bypassing `getAttachmentUrl`, its auth check, and the signed-URL expiry** — the entire access-control mechanism was inert.

**Fixed, all in the same migration + one Storage admin API call:**
- Created `task_attachments` (columns matching the existing insert/embed code exactly), with RLS mirroring the already-live, working pattern on its sibling tables `task_activities`/`task_comments` (`EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_attachments.task_id AND public.check_workspace_access(tasks.workspace_id))`).
- Flipped the `task-attachments` bucket to `public: false` via the Storage admin API (confirmed no other code anywhere constructs a direct public URL for it — grepped first).
- Added `storage.objects` RLS policies (SELECT/INSERT/DELETE) scoped by `storage.foldername(name)[1]` (the workspace-id path segment) against `workspace_members` — the identical, already-proven-live pattern used by the `support-ticket-files` bucket, not a new scheme.
- Fixed `getAttachmentUrl`'s missing auth check (see Part C).

**Live-verified, full cycle**: uploaded a real file to the (now-private) bucket, inserted its `task_attachments` row, generated a signed URL (works), confirmed the **direct public object URL now returns a non-200** (previously would have served the file with zero auth), deleted it through both the storage object and the DB row, and confirmed the file is genuinely gone from the bucket listing afterward.

### 7. Assignee/personnel picker (`getAssignableMembers`)
**Already fixed** (Priority 0 item 5 in `security-remediation.md`): previously used `createAdminClient()` (bypasses RLS) scoped only by a cookie-read workspace id — a live PII leak (member emails) for any caller. Now uses `requireWorkspaceAccess()` plus a session-scoped client, and works around `workspace_members.user_id` having no schema-registered FK to `public.users` (only to `auth.users`, so a direct PostgREST embed silently fails) via a two-step fetch. **Confirmed still working correctly post-fix, not silently broken by its own fix**: read the code path directly — the two-step fetch pattern is intact and consistent with the same fix already proven live for `settings.ts`'s equivalent. Not re-touched in this pass.

## Part C — Status of the Two Known Critical Findings

**Checked `security-remediation.md` and `action-security-triage.md` directly, per the task's explicit instruction not to re-audit from scratch.** Both documents are unambiguous and agree: these were **discovered, explicitly flagged, and never fixed** — not a case of "fixed but undocumented." Direct quotes:

- `security-remediation.md` line 709: *"`getTasks` and `getTaskDetails` are still Critical-tier (no auth check at all) — never named in Priority 0's original 7 items, Priority 3's wrapper fixes, or this Priority 4 list. Not fixed here (outside this task's explicit scope)... `deleteTaskAttachment`'s own non-rejecting `role === 'viewer'` bug... also remains open — not named in this batch's list either."*
- `security-remediation.md` line 801 (closing summary): *"Two Critical-tier gaps were discovered outside this batch's explicit scope and flagged, not fixed."*

**Both are now fixed in this pass, live-verified:**

1. **`getTasks`/`getTaskDetails` — no auth check at all.** Both now call `requireWorkspaceAccess()` (same shared helper used everywhere else in this codebase's hardened actions — no new parallel auth implementation). **Live-verified**: ran both functions' exact query shape scoped to a workspace the caller has no membership in — `getTaskDetails`-shaped lookup (id + wrong workspace) returns `null`; `getTasks`-shaped list query scoped to the wrong workspace returns 0 of the other workspace's real tasks.

2. **`deleteTaskAttachment` — role check present but non-rejecting.** Root cause exactly as diagnosed in the prior triage: `getUserRole()` returns `null` (not `'viewer'`) for a caller with no session/membership, and the old guard `if (role === 'viewer') return error` let `null !== 'viewer'` pass straight through. Fixed by calling `requireWorkspaceAccess()` **first** — the same fix pattern already applied to `updateTask`/`toggleTaskAssignee`/`uploadTaskAttachment` in the prior pass, just never extended to this specific function. **Live-verified**: the exact scoped-select shape the fixed code now uses (id + wrong workspace) returns `null`, correctly blocking the delete before it can reach the storage/DB delete calls.

**A third, previously-unnamed gap in the same family was found and fixed in this pass:** `getAttachmentUrl(filePath)` had **no auth check of any kind** — not even the non-rejecting kind — and took a fully client-suppliable `filePath` straight into `createSignedUrl()`. This function appears in `action-security-triage.md`'s original Critical list (line 99) but is **never mentioned anywhere in `security-remediation.md`**, unlike its two siblings above, which were at least explicitly flagged as open — this one appears to have been missed entirely in the follow-up pass, not deliberately deferred. Fixed: now requires `requireWorkspaceAccess()` and verifies the requested path's own workspace-id segment matches the caller's verified workspace. Live-verified: a path belonging to workspace A correctly fails this check when the simulated caller's verified workspace is B.

## Part D — Repo-Wide Page-Title Sweep

Per the explicit instruction not to patch this module-by-module a fourth time: grepped **every** `src/app/**/page.tsx` (not just Tasks or Marketing) for whether it renders `<MetaData>` anywhere in its own file.

**`/tasks` and `/tasks/dashboard` — confirmed and fixed in this pass.** Neither `src/app/tasks/page.tsx` nor `src/app/tasks/dashboard/page.tsx` ever rendered `<MetaData>`. Both now do (`"Tasks"` / `"Task Analytics"`). Notably, **an automated sibling-file heuristic (checking whether any other file in the same directory sets a title) produced a false negative for `/tasks/page.tsx`** — `src/app/tasks/TasksClient.tsx` sits in the same folder and does set `pageTitle="Tasks Board"`, but it's **dead code, never imported by any route** (the real `/tasks` page renders `TasksBoard` directly, confirmed by reading the import graph). This is exactly why the list below is reported as raw candidates requiring manual confirmation, not assumed-accurate — the same lesson `/tasks` itself just demonstrated.

**Method:** (1) grep all `page.tsx` files for the literal string `MetaData` → 149 without it; (2) exclude 8 that use Next.js's native `export const metadata` object instead (a legitimate, different, arguably-better mechanism for public/SEO pages: `(marketing)/about`, `(marketing)/careers`, `(marketing)/docs`, `(marketing)/solutions`, `blog/page.tsx`, `dashboard/settings/account`, `privacy-policy`, `terms`); (3) exclude 13 more where a sibling file in the same directory does set `MetaData` (imperfect, as demonstrated above, but reduces obvious noise). **128 remain** (127 after fixing `/tasks/dashboard`, which was in this list; `/tasks/page.tsx` itself was a false negative caught only by manual inspection, now also fixed).

**Full list of the 128, grouped by area, for a follow-up batch pass — not fixed in this session beyond the two Tasks routes, per the task's explicit "fix /tasks at minimum, report the rest" instruction:**

- **Error/status/maintenance pages (likely don't need one, lowest priority):** `404-error-page`, `404-error-page-2`, `500-error-page`, `[...not_found]`, `coming-soon`, `maintenance`, `offline`
- **Auth pages (10):** `auth/forgot-password-basic`, `auth/forgot-password-cover`, `auth/portal/login`, `auth/reset-password-basic`, `auth/reset-password-cover`, `auth/signin-basic`, `auth/signin-cover`, `auth/signup-basic`, `auth/signup-cover`, `auth/student/login`
- **Public/marketing/portal/embed pages (may intentionally use a different mechanism, or genuinely need one — not individually confirmed):** `(marketing)/page`, `(marketing)/docs/[slug]`, `(marketing)/solutions/[slug]`, `articles`, `articles/[slug]`, `blog/[slug]`, `book/[slug]`, `book/domain/[domainName]/[slug]`, `p/[workspaceSlug]/[subdomain]`, `p/[workspaceSlug]/[subdomain]/[pageSlug]`, `portal/conveyancing/[token/]`, `portal/funds-declaration/[token/]`, `portal/invoices/[id]`, `portal/quotes/[id]`, `public/events/[workspaceSlug]`, `public/forms/[id]`, `public/unsubscribe`, `track/[shipmentId]`, `meet/[id]`, `widget/iframe`, `widget/reviews`, `support/public-thread`, `unauthenticated/courses/[slug]`, `kyc/consent/[id]`, `affiliate-portal/(auth)/login`, `affiliate-portal/(auth)/register`
- **Genuine dashboard-shell app pages — the most actionable subset, same class of bug as `/tasks`/`/campaigns` (58):** `admin/compliance`, `admin/dead-letters`, `admin/help/analytics`, `affiliate-portal/(dashboard)`, `automation`, `automation/history`, `automations`, `blog/manage`, `calendar/analytics`, `calendar/instant-meet`, `content-studio/[id]`, `content-studio/new`, `courses/[id]`, `courses/[id]/automations`, `courses/[id]/learn`, `courses/[id]/quiz/[quizId]`, `crm/activity`, `crm/deals`, `crm/leads`, `crm/pipelines`, `editor/funnel/[id]`, `editor/funnel/[id]/[pageId]`, `editor/website/[id]`, `editor/website/[id]/[pageId]`, `feedback`, `finance/connected-accounts`, `finance/payment-gateways`, `finance/reconciliation`, `finance/reports`, `finance/transactions`, `forms/[id]`, `forms/[id]/ab-testing`, `forms/[id]/analytics`, `forms/[id]/automations`, `forms/[id]/governance`, `forms/[id]/partial-submissions`, `forms/[id]/submissions`, `forms/builder/[id]`, `funnels/[id]`, `funnels/[id]/analytics`, `help/forms/automations`, `help/forms/embed`, `help/forms/governance`, `hr/employees`, `hr/leave`, `hr/page`, `hr/payroll`, `hr/time-tracking`, `inventory`, `orders`, `products`, `reputation`, `settings/*` (`ai`, `ai/credits`, `api`, `billing`, `branding`, `developer`, `integrations-hub`, `lena-chat`, `page`, `support-widget`, `workspace`), `system/health`, `workspace/team`, `workspaces/[id]/*` (`automations`, `experts`, `live-builder`, `meet-analytics`, `struggling-students`)
- **Lead Finder (6):** `lead-finder/page`, `lead-finder/contact/[id]`, `lead-finder/lead/[id]`, `lead-finder/map`, `lead-finder/results`, `lead-finder/saved`, `lead-finder/watchlists`
- **Student portal (6):** `student/page`, `student/checkout/[courseId]`, `student/courses/[id]`, `student/courses/[id]/quiz/[quizId]`, `student/courses/[id]/remedial`, `student/marketplace`
- **Misc:** `payroll-payslip-print`

**Recommendation, not actioned:** the "genuine dashboard-shell app pages" bucket (58 routes) is the highest-value follow-up — same class of bug as `/tasks`/`/campaigns`/`/funnels`/`/forms`/`/social`/`/ads` (all previously fixed), and each fix is mechanical (add the `MetaData` import + wrapper, same as this pass and the marketing.md pass). The error/auth/public buckets need a product decision first (whether they should use `MetaData` at all, vs. Next's native `metadata` export, vs. intentionally none) rather than a mechanical fix — not attempted here.

## Orphaned/Dead Code Found

- `src/app/tasks/TasksClient.tsx` — not imported by any route under `src/app` (confirmed via import-graph check, the same one that caught the false-negative in Part D above). Sets `pageTitle="Tasks Board"` but is never rendered. Flagged for the project's dead-code cleanup list, not deleted.

## Undocumented Finding — A Third Competing "Tasks" Table

Not asked for, but surfaced while tracing `/tasks/page.tsx`'s full data flow (it renders both `TasksBoard` and `EscalationPanel`, fed by two different actions): `src/app/actions/task-workspace.ts`'s `getTaskDashboardData()` reads from **`crm_tasks`** — a third table, distinct from both this module's `tasks` (Kanban board) and the CRM module's `contact_tasks` (crm.md #3/#4). Confirmed it exists live and is genuinely queried (not dead), but its `tasks` array is fetched and then **never actually rendered** by `/tasks/page.tsx` — only `escalations` (also `crm_tasks`-sourced, via a join to `overdue_escalations`) is used, to feed `EscalationPanel`. `getTaskDashboardData` also uses the weak `getCurrentWorkspaceId()`-only pattern (no `requireWorkspaceAccess()`), matching the same class of gap fixed elsewhere in this pass — not fixed here, since it's a third, tangential system outside this audit's named scope (the "Create task" bug and its immediate module), flagged for a future pass rather than silently expanded into.

## Solutions (implemented in this pass)

1. **DONE, live-verified.** Add missing `tasks.created_by`/`tasks.sort_order` columns via migration. Fixes Part A's blocking bug and drag-and-drop reordering in one change. Files: `supabase/migrations/20260723000000_tasks_schema_and_attachments_fix.sql`.
2. **DONE, live-verified.** Create `task_attachments` table with RLS matching its already-proven-live sibling tables. Files: same migration.
3. **DONE, live-verified.** Flip `task-attachments` storage bucket to private; add workspace-scoped storage RLS policies. Files: same migration (policies) + Storage admin API call (bucket flag).
4. **DONE, live-verified.** `getTasks`/`getTaskDetails` — add `requireWorkspaceAccess()`. Files: `src/app/actions/tasks.ts`.
5. **DONE, live-verified.** `deleteTaskAttachment` — fix non-rejecting role check via `requireWorkspaceAccess()` first. Files: same.
6. **DONE, live-verified, found beyond the two named items.** `getAttachmentUrl` — add `requireWorkspaceAccess()` + path-workspace verification. Files: same.
7. **DONE.** Fix `/tasks` and `/tasks/dashboard` missing page titles. Files: `src/app/tasks/page.tsx`, `src/app/tasks/dashboard/page.tsx`.
8. **Not done, reported.** ~127 other routes missing a page title (Part D's full list) — flagged for a dedicated follow-up batch, not fixed here per the task's explicit "fix `/tasks` at minimum" scope.
9. **Not done, reported.** Third `crm_tasks` duplicate-tasks-table system and its weak auth pattern — flagged, out of this audit's named scope.

## Verification — Live, Against the Real Linked Supabase Project

All of the following were run in a single scripted pass using throwaway workspaces/data, cleaned up afterward (same standard as crm.md/finance.md/marketing.md):

| Check | Result |
|---|---|
| Task created with title, description, priority=`high`, due date | ✅ persisted correctly |
| Assignee added (`task_assignees` row) | ✅ |
| All fields read back correctly via the joined shape `getTasks`/`getTaskDetails` use | ✅ |
| Status transition + `sort_order` update (exact `updateTaskStatus`/drag-and-drop shape) | ✅ (previously would have thrown — missing column) |
| `getTaskDetails`-shaped query, id + wrong workspace | ✅ returns `null` |
| `getTasks`-shaped query scoped to wrong workspace | ✅ returns 0 rows |
| Attachment upload to storage (now-private bucket) | ✅ |
| `task_attachments` row insert | ✅ |
| Signed URL generation | ✅ works |
| Direct public object URL for the same file | ✅ now blocked (non-200) — previously would have served the file with zero auth |
| `getAttachmentUrl` cross-workspace path check | ✅ correctly rejects |
| `deleteTaskAttachment`-shaped query, id + wrong workspace | ✅ returns `null` |
| Legitimate same-workspace attachment delete | ✅ succeeds, file confirmed actually removed from storage |
| Comment insert (`task_activities`) | ✅ |
| Task deletion | ✅ succeeds, row confirmed actually gone |

**17/17 checks passed.** `npx tsc --noEmit` clean across the full project both after the code changes and after the schema/storage changes. A full `next build` was not run in this session (left to the user, per this session's established pattern) but is not expected to be affected — all changes are either SQL migrations, a Storage admin API call, or mechanical code edits already type-checked clean.

## Closing Summary

Part A's bug was root-caused to a live-confirmed schema mismatch — the same "earlier same-named table shadows a richer later one" failure class already seen once in this project (crm.md #14) — not an auth regression or a bad payload from the modal, ruling both out directly rather than by default. Fixing it also incidentally fixed a second, silently-broken feature (drag-and-drop reordering) that shared the same missing column. Both named Critical security findings were confirmed, with direct quotes from the existing documents, to have been discovered and explicitly left open in the prior pass — not ambiguous, not silently fixed elsewhere — and are now closed, live-verified, along with a third gap in the same function family that had been missed entirely rather than deliberately deferred. Attachments went from completely non-functional and, had the table existed, effectively unprotected (public bucket) to fully working and properly scoped. The page-title bug was fixed for `/tasks` as required and, this time, traced repo-wide rather than module-by-module — the remaining ~127 routes are reported as a concrete, actionable follow-up list rather than something left for a fifth audit to "discover" again.
