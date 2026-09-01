# Schema-Drift Sweep — Full Inventory (audit-only)

One dedicated pass to find **every** place a Supabase query references a table or column
that does not exist on the live database, so a prioritised fix plan can follow instead of
discovering these one at a time.

**No fixes in this pass.**

---

## STEP 0 — Ground truth

- **Live schema pulled directly from `information_schema.columns`** via `supabase db query --linked`
  (`select table_name, column_name from information_schema.columns where table_schema='public'`)
  → **375 tables, 3 871 columns**. This is the single source of truth for the whole audit;
  saved to `scratch/schema.json` during the sweep (not committed).
- **Stale / untrusted schema-definition files in the repo** (their names are NOT trusted anywhere):
  - `src/supabase/lms_schema.sql` — PRD-era LMS schema (`courses.name`, `modules`, `lessons`,
    `quizzes`, `quiz_attempts.score_pct`, `student_portal_assignments`, `course_categories`,
    `certificates`, `certificate_template_id`…). **Confirmed the repeat offender.**
  - `src/lib/supabase/schema.sql` — old "Phase 2 CRM" snapshot (7 tables), not migration-tracked;
    e.g. it declares `contacts.last_name NOT NULL` while live is nullable.
  - `supabase_global_search.sql` (repo root) — a `CREATE FUNCTION global_search(...)` definition,
    not a schema snapshot; out of scope for table/column drift.
- Method: parsed every `.from('<table>')` in `src/` + `libs/` (2 309 files, worktree copies
  under `.claude/` excluded), took the query chain to the next `.from(`, and cross-checked the
  table plus every `.select()` bare column, every `.eq/.neq/.gt/.gte/.lt/.lte/.like/.ilike/.is/.in/.order/.not`
  filter column, and every `.insert/.update/.upsert` object key against the live schema.
  Storage `.from('<bucket>')` calls, embedded-resource names, and window-bleed artefacts were
  filtered out and each survivor was hand-verified by reading the file.
- Raw SQL: no raw-SQL execution paths against these tables were found (`.rpc()` calls are
  function invocations — a separate "function drift" concern, not covered here).

---

## Priority 1 — LIVE + reachable + user-visible (fix first)

### 1a. `enrollments.workspace_id` — the table has **no `workspace_id`** (workspace is derived via `course_id → courses.workspace_id`). Widest single cluster.

| file:line | ref | reach | R/W | error handling → real effect |
|---|---|---|---|---|
| `src/app/api/webhooks/payments/route.ts:97` | `.insert({ …, workspace_id })` | Stripe **paid-course purchase** webhook | WRITE | `logger.error(...'enrollment_insert.failed')` — **swallowed**. Every paid enrolment insert hard-fails → student pays, is **never enrolled**. |
| `src/app/api/webhooks/payments/route.ts:178` | `.select('workspace_id, contact_id, course_id')` | subscription **payment-failed** webhook | read | query errors → `enrollData` null → `payment.failed` telemetry event never emitted |
| `libs/workers/src/automation-executor.ts:46` and `:80` | `.insert({ workspace_id, … })` | automation actions `grant_full_access` / `grant_partial_access` | WRITE | `if (error) throw` — **not swallowed**; the automation action hard-fails |
| `src/lib/analytics.ts:95` and `:103` | `.select('*',{count}).eq('workspace_id', …)` | main **analytics dashboard** "Course Enrollments" KPI | read | `?? 0` → the KPI **always shows 0** |
| `src/app/(portal)/portal/courses/page.tsx:24` | `.select('*, courses(*)').eq('contact_id',…).eq('workspace_id', workspace.id)` | **client portal → My Courses** | read | whole query errors → `[]` → page **always empty** |
| `src/app/(portal)/portal/dashboard/page.tsx:70` | `.select('*, courses(*)').eq('workspace_id', workspace.id)` | **client portal → dashboard** course-progress card | read | → `[]` → progress always empty |

### 1b. `.eq('workspace_id', …)` on tables that are **not** workspace-scoped (scoped by `user_id`, `project_id`, or keyed by `id`)

| file:line | table.col | real scope | reach | R/W | effect |
|---|---|---|---|---|---|
| `src/app/actions/lead-workspace.ts:90, 132, 137, 152, 156, 236` | `lead_finder_results.workspace_id` | `user_id` | Lead Finder — list / qualify / status / owner | R + W | queries error; some `logger.error` + return error (visible), some return empty |
| `src/app/actions/watchlist-workspace.ts:77, 92, 107` | `lead_watchlists.workspace_id`, `lead_alerts.workspace_id` | `user_id` | Lead Finder → Watchlists (delete / toggle / alerts) | WRITE | returns `"Failed to delete watchlist."` etc — **visibly errors** |
| `src/app/actions/help.ts:273, 280` | `help_articles.workspace_id` (also a duplicated `.eq('workspace_id')` on `:273`) | none — global catalog | Help Centre → "Was this helpful?" | R + W | `.single()` errors → `throw NotFoundError` → feedback **always fails** |
| `src/app/actions/seo.ts:192, 233, 288, 359` | `seo_tracked_keywords.workspace_id`, `seo_content_pipeline.workspace_id` | `project_id` | SEO → keyword / content-pipeline delete + status update | WRITE | `if (error) throw` → caught, op fails |
| `src/app/api/support/tickets/[id]/route.ts:96` | `users.workspace_id` | `users` has no `workspace_id` | Support → assign ticket → notify agent | read | `if (u)` — **swallowed**; agent email never resolved → **assignment e-mail silently not sent** |
| `src/app/actions/settings.ts:520` | `workspaces.workspace_id` (spurious extra `.eq`; `.eq('id', …)` is already correct) | keyed by `id` | Settings → view/get API key | read | `.single()` errors → action fails |
| `src/app/actions/pipelines.ts:466, 576` | `pipeline_stages` — table has `workspace_id`, but the `.update({ name, updated_at })` writes **`updated_at`** which does not exist | — | Pipeline → rename stage | WRITE | `if (error)` → returns error — **visibly errors** |

### 1c. Missing columns on live, workspace-scoped tables

| file:line | table.col(s) | real columns | reach | R/W | effect |
|---|---|---|---|---|---|
| `src/app/api/lena/messages/route.ts:29` | `lena_conversations.agent_typing_until` | `mode`, `lead_captured`, `assigned_agent_id`… (no typing field) | **LENA chat widget** — message poll | read | `if (convError) throw` → **endpoint 500s**; widget can't load messages |
| `src/app/api/social/publish/route.ts:106` | `social_posts.platform`, `.image_url`, `.external_post_id` | `platforms[]`, `media_urls[]`, `external_post_ids[]` (all plural) | Social → publish post | WRITE | `.then(() => {})` — **swallowed**; every published post is **never saved to `social_posts`** |
| `src/app/actions/expenses.ts:53` | `accounting_transactions.{type, amount, category, status, vendor, notes}` | `total_amount, currency, source_type, source_id, account_id, reference` | Finance → Expenses → add expense | WRITE | `if (error) throw` — **visibly errors**; expense never saved |
| `src/app/actions/order_actions.ts:18` | `orders.updated_at` | no `updated_at` | Orders → change status | WRITE | `if (error)` → returns error — **visibly errors** |
| `src/lib/calendar/sms.ts:11` | `workspaces.twilio_phone_number` | `twilio_number` | Calendar → appointment **SMS reminders** | read | selecting an unknown column 400s → `workspace` null → `return false` → **SMS silently not sent** |
| `src/hooks/useItemPricing.ts:16` | `contacts.price_list_id` | no such column | Quotes / Invoices → per-contact price list | read | `if (!error && data?.price_list_id)` — **swallowed**; assigned price list **never applied** |
| `src/lib/automations/CRMActionHandler.ts:87, 270` | `contact_tasks.priority` | `title, description, due_date, status, assigned_to, created_by` (no `priority`) | Workflow action **"Create task"** | WRITE | `const { error }` surfaced; workflow task insert fails |
| `src/lib/automation/actions_registry.ts:430`, `src/lib/automations/CRMActionHandler.ts:300` | `workspaces.whatsapp_transcript_enabled` | not present | Workflow action **"Send WhatsApp"** | read | `.single()` 400s → `workspace` null → downstream null / WA-transcript feature off |
| `src/lib/intelligence/LeadScoringEngine.ts:190` | `crm_contacts.{lead_score, lead_score_explanation, tags}` (the row just above, on the real `contacts` table, is fine — those columns exist there) | `crm_contacts` has `metadata`, no score/tags | Email-deliverability webhook → `LeadScoringEngine.trackScoringEvent` | WRITE | `try/catch → logger.error(...'track_scoring_event.failed')` — **swallowed** |

### 1d. CRM contact detail — `user_id` where the real FK is `created_by`

| file:line | ref | R/W | effect |
|---|---|---|---|
| `src/app/actions/contact-workspace.ts:69, 75` | `.select('*, auth_user:user_id(email)')` on `contact_notes` / `contact_activities` | read | embedded-resource FK `user_id` doesn't exist → query errors → `notes`/`activities` fall back to `[]` (notes & activity feed **always empty** on the contact page) |
| `src/app/actions/contact-workspace.ts:91` | `contact_activities.insert({ …, user_id })` (`logActivity`) | WRITE | no error check → activity-log rows **silently never written** |
| `src/app/actions/contact-workspace.ts:107` | `contact_notes.insert({ …, user_id })` (`addContactNote`) | WRITE | `if (error)` → returns `"Failed to add note."` — **visibly errors** |

### 1e. Missing table — `automations` (does not exist; real: `workflows` / `automation_workflows`)

| file:line | ref | reach | R/W | effect |
|---|---|---|---|---|
| `src/app/actions/analytics.ts:45` | `.from('automations').select('*',{count}).eq('workspace_id', …)` | **main dashboard** stat cards | read | count → `undefined` → the "Automations" stat renders blank/0 |
| `src/app/actions/reputation_actions.ts:368` | `.from('automations').select('settings').eq('workspace_id', …).maybeSingle()` | Reputation → send review request | read | **known** (in-code comment: "creating a new table is a schema/feature change beyond scope"); `.maybeSingle()` → `null` → Twilio creds empty → SMS/WhatsApp review request **silently not sent** |
| `src/app/api/reputation/send-request/route.ts:81` | same as above | Reputation review-request API | read | same — swallowed, not sent |

### 1f. Missing table — `employee_attendance` (does not exist)

| file:line | ref | reach | R/W |
|---|---|---|---|
| `src/app/actions/hr/attendance.ts:10, 30, 39, 58` | `.from('employee_attendance')` insert / select / update | **HR → `AdminAttendanceTable.tsx`** (imports `getAttendanceRecords`, `clockIn`, `clockOut`) | R + W — every call hard-fails; clock-in/out and the attendance table are non-functional |

### 1g. Missing table — `certificates` (does not exist; the fresh `course_certificates` now exists but this code doesn't use it)

| file:line | ref | reach | R/W | effect |
|---|---|---|---|---|
| `src/app/actions/lms/certificates.ts:15` | `.from('certificates').select('*, courses(name), students:contacts(...)')` (`getAdminCertificates`) | **admin Certificates page** (`src/app/courses/certificates/page.tsx`) | read | `catch → return { success: true, data: [] }` — **error-swallowed**; page renders as a permanently-empty "working" feature |

---

## Priority 2 — dead / orphaned code (batch into a cleanup pass; still worth removing)

| file:line | ref | does-not-exist | why dead |
|---|---|---|---|
| `src/app/api/lms/transcript/route.ts:17, 19` | `courses.name`, `quiz_attempts.score_pct`, `quizzes(lesson_id)` join | col + table | zero callers (Task 58 stub — student-portal audit) |
| `src/app/api/lms/analytics/route.ts:18, 35` | table `student_portal_assignments`, `quiz_attempts.score_pct` | table + col | zero callers (Task 59 stub) |
| `src/app/actions/lms.ts:414, 437, 450` | `modules.workspace_id` (also uses legacy `modules` table at all) | col | `updateModule` / `deleteModule` — **no importers** |
| `src/app/actions/lms.ts:569, 592, 605` | `lessons.workspace_id` | col | `updateLesson` / `deleteLesson` — **no importers** |
| `src/app/actions/lms.ts:186` | `forum_posts.parent_id` (flat board model, no threading) | col | `getForumPosts` — **no importers** |
| `src/app/actions/lms/ai-quiz.ts:31` | table `quizzes` | table | file **not imported anywhere** |
| `src/app/actions/lms/ai-essay.ts:37` | `quiz_attempts.{score_pct, grading_feedback, teacher_notes, graded_by}` | col (WRITE) | file **not imported anywhere** |
| `src/app/actions/lms/lessons.ts:58, 87` | `lessons.content_blocks` (WRITE) | col | file **not imported anywhere** |
| `src/app/actions/lms/categories.ts:14, 37, 60` | table `course_categories`, `courses.category_id` (WRITE) | table + col | file **not imported anywhere** — the dead category scaffolding |
| `src/app/actions/lms/certificates.ts:39` | `courses.certificate_template_id` (WRITE, `saveCertificateTemplate`) | col | `saveCertificateTemplate` — **no importers** |
| `src/app/actions/hr/documents.ts:31, 57` | table `employee_documents` | table | `actions/hr/documents.ts` — **no importers** |
| `src/app/actions/hr/payroll.ts:13, 35` | `payroll_runs.{payment_date, amount, currency, employee_id}` (real: `period_start/end`, `total_gross/net`, `paid_at`, workspace-scoped) | col | `actions/hr/payroll.ts` — **no importers** |
| `src/lib/production/OnboardingManager.ts:11, 27, 35, 40` | `onboarding_progress.{user_id, module, is_completed, completed_at}` (real: `completed_steps[]`, `dismissed_at`) | col (R + W) | **duplicate/orphan file** — the live one is `src/lib/launch/OnboardingManager.ts` |

---

## Priority 3 — LIVE but low-impact / needs a per-site handling check

| file:line | ref | note |
|---|---|---|
| `src/app/actions/portal.ts:399`, `src/app/api/webhooks/support/inbound/route.ts:150` | `support_tickets.updated_at` (WRITE) — no such column | portal ticket update / inbound-support webhook; confirm whether the surrounding `if (error)` is surfaced or swallowed |
| `src/app/api/webhooks/resend/inbound/route.ts:251` | `messages.error_message` (WRITE) — real table has `bridge_metadata`, no `error_message` | e-mail→SMS bridge; fire-and-forget update |
| `src/lib/automation/lms_actions.ts:225, 234` | `lms_bundle_enrollments.grace_period_expires_at` (WRITE) — the `enrollments` table has this column, `lms_bundle_enrollments` does not | bundle-revoke-with-grace automation; no error check → silently fails |
| `src/lib/automation/actions_registry.ts:313` | `contacts.user_id` filter — real is `owner_id` | automation contact lookup |

---

## Consolidated table (sorted: Priority 1 → 3)

| # | file:line | table / column referenced | real? | reachable / live vs dead | read / write | error-swallowed vs would-visibly-error |
|--:|---|---|---|---|---|---|
| 1 | api/webhooks/payments/route.ts:97 | `enrollments.workspace_id` | **no col** | LIVE — paid-course purchase | write | swallowed (`logger.error`) → paid student not enrolled |
| 2 | api/webhooks/payments/route.ts:178 | `enrollments.workspace_id` | no col | LIVE — payment-failed webhook | read | degraded (event not emitted) |
| 3 | libs/workers/src/automation-executor.ts:46,80 | `enrollments.workspace_id` | no col | LIVE — grant access automations | write | throws — action fails |
| 4 | lib/analytics.ts:95,103 | `enrollments.workspace_id` | no col | LIVE — analytics dashboard KPI | read | swallowed → KPI always 0 |
| 5 | (portal)/portal/courses/page.tsx:24 | `enrollments.workspace_id` | no col | LIVE — client portal My Courses | read | swallowed → page empty |
| 6 | (portal)/portal/dashboard/page.tsx:70 | `enrollments.workspace_id` | no col | LIVE — client portal dashboard | read | swallowed → empty |
| 7 | app/actions/lead-workspace.ts:90,132,137,152,156,236 | `lead_finder_results.workspace_id` | no col | LIVE — Lead Finder | read+write | mixed |
| 8 | app/actions/watchlist-workspace.ts:77,92,107 | `lead_watchlists`/`lead_alerts.workspace_id` | no col | LIVE — Watchlists | write | visibly errors |
| 9 | app/actions/help.ts:273,280 | `help_articles.workspace_id` (+ dup `.eq`) | no col | LIVE — "Was this helpful?" | read+write | visibly errors (feedback fails) |
| 10 | app/actions/seo.ts:192,233,288,359 | `seo_tracked_keywords`/`seo_content_pipeline.workspace_id` | no col | LIVE — SEO mgmt | write | throws (caught) |
| 11 | api/support/tickets/[id]/route.ts:96 | `users.workspace_id` | no col | LIVE — ticket assign notify | read | swallowed → agent e-mail not sent |
| 12 | app/actions/settings.ts:520 | `workspaces.workspace_id` (spurious `.eq`) | no col | LIVE — Settings API key | read | action fails |
| 13 | app/actions/pipelines.ts:466,576 | `pipeline_stages.updated_at` | no col | LIVE — rename stage | write | visibly errors |
| 14 | api/lena/messages/route.ts:29 | `lena_conversations.agent_typing_until` | no col | LIVE — chat widget poll | read | **endpoint 500s** |
| 15 | api/social/publish/route.ts:106 | `social_posts.{platform,image_url,external_post_id}` | no cols | LIVE — social publish | write | swallowed → never saved |
| 16 | app/actions/expenses.ts:53 | `accounting_transactions.{type,amount,category,status,vendor,notes}` | no cols | LIVE — add expense | write | visibly errors |
| 17 | app/actions/order_actions.ts:18 | `orders.updated_at` | no col | LIVE — order status | write | visibly errors |
| 18 | lib/calendar/sms.ts:11 | `workspaces.twilio_phone_number` | no col (`twilio_number`) | LIVE — appointment SMS | read | swallowed → SMS not sent |
| 19 | hooks/useItemPricing.ts:16 | `contacts.price_list_id` | no col | LIVE — per-contact pricing | read | swallowed → never applied |
| 20 | lib/automations/CRMActionHandler.ts:87,270 | `contact_tasks.priority` | no col | LIVE — "Create task" workflow | write | error surfaced |
| 21 | lib/automation/actions_registry.ts:430 · CRMActionHandler.ts:300 | `workspaces.whatsapp_transcript_enabled` | no col | LIVE — "Send WhatsApp" workflow | read | 400 → workspace null |
| 22 | lib/intelligence/LeadScoringEngine.ts:190 | `crm_contacts.{lead_score,lead_score_explanation,tags}` | no cols | LIVE — deliverability webhook | write | swallowed (`logger.error`) |
| 23 | app/actions/contact-workspace.ts:69,75 | `contact_notes`/`contact_activities` embed `user_id` | no FK (`created_by`) | LIVE — contact detail | read | swallowed → notes/activities empty |
| 24 | app/actions/contact-workspace.ts:91 | `contact_activities.user_id` (insert) | no col | LIVE — logActivity | write | swallowed → not logged |
| 25 | app/actions/contact-workspace.ts:107 | `contact_notes.user_id` (insert) | no col | LIVE — addContactNote | write | visibly errors |
| 26 | app/actions/analytics.ts:45 | table `automations` | **no table** | LIVE — dashboard stat | read | count → blank |
| 27 | app/actions/reputation_actions.ts:368 | table `automations` | no table | LIVE — send review request | read | swallowed (`.maybeSingle()`) → not sent |
| 28 | api/reputation/send-request/route.ts:81 | table `automations` | no table | LIVE — review-request API | read | swallowed → not sent |
| 29 | app/actions/hr/attendance.ts:10,30,39,58 | table `employee_attendance` | no table | LIVE — HR AdminAttendanceTable | read+write | hard-fails |
| 30 | app/actions/lms/certificates.ts:15 | table `certificates` | no table | LIVE — admin Certificates page | read | **swallowed** → permanently-empty "working" page |
| 31 | app/actions/portal.ts:399 · api/webhooks/support/inbound/route.ts:150 | `support_tickets.updated_at` | no col | LIVE (P3) | write | needs handling check |
| 32 | api/webhooks/resend/inbound/route.ts:251 | `messages.error_message` | no col | LIVE (P3) | write | fire-and-forget |
| 33 | lib/automation/lms_actions.ts:225,234 | `lms_bundle_enrollments.grace_period_expires_at` | no col | LIVE (P3) — bundle revoke | write | swallowed |
| 34 | lib/automation/actions_registry.ts:313 | `contacts.user_id` filter | no col (`owner_id`) | LIVE (P3) | read | needs check |
| 35 | api/lms/transcript/route.ts:17,19 | `courses.name`, `quiz_attempts.score_pct`, `quizzes(…)` | no col/table | **DEAD** — zero callers | read | — |
| 36 | api/lms/analytics/route.ts:18,35 | table `student_portal_assignments`, `quiz_attempts.score_pct` | no table/col | **DEAD** — zero callers | read | — |
| 37 | app/actions/lms.ts:414,437,450 | `modules.workspace_id` | no col | **DEAD** — update/deleteModule unused | read+write | — |
| 38 | app/actions/lms.ts:569,592,605 | `lessons.workspace_id` | no col | **DEAD** — update/deleteLesson unused | read+write | — |
| 39 | app/actions/lms.ts:186 | `forum_posts.parent_id` | no col | **DEAD** — getForumPosts unused | read | — |
| 40 | app/actions/lms/ai-quiz.ts:31 | table `quizzes` | no table | **DEAD** — file unused | write | — |
| 41 | app/actions/lms/ai-essay.ts:37 | `quiz_attempts.{score_pct,grading_feedback,teacher_notes,graded_by}` | no cols | **DEAD** — file unused | write | — |
| 42 | app/actions/lms/lessons.ts:58,87 | `lessons.content_blocks` | no col | **DEAD** — file unused | write | — |
| 43 | app/actions/lms/categories.ts:14,37,60 | table `course_categories`, `courses.category_id` | no table/col | **DEAD** — file unused | read+write | — |
| 44 | app/actions/lms/certificates.ts:39 | `courses.certificate_template_id` | no col | **DEAD** — saveCertificateTemplate unused | write | — |
| 45 | app/actions/hr/documents.ts:31,57 | table `employee_documents` | no table | **DEAD** — file unused | read+write | — |
| 46 | app/actions/hr/payroll.ts:13,35 | `payroll_runs.{payment_date,amount,currency,employee_id}` | no cols | **DEAD** — file unused | read+write | — |
| 47 | lib/production/OnboardingManager.ts:11,27,35,40 | `onboarding_progress.{user_id,module,is_completed,completed_at}` | no cols | **DEAD** — orphan file (live one is `lib/launch/…`) | read+write | — |

### Confirmed false positives (excluded)
Supabase **Storage** buckets read as tables (`avatars`, `media`, `branding`, `scorm_packages`,
`course_landing_assets`, `hr_documents`); embedded-resource names in `.select()`; window-bleed
where a filter/select from an adjacent chained query was mis-attributed
(`hr/time-tracking` + `hr/leave` on `time_entries` — all columns real; `automation_editor.ts`
`courses` — `title` is correct; `contacts`/`websites.plan_tier` — belongs to the adjacent
`workspaces` query; `funnelOrders.ts` `funnels.subdomain` — real; `courseLanding.ts`
`domain_configurations.hostname` — real); `calendar/scheduling.ts:42` `appointments.resource_id`
— inside a `/* */` block comment; `LeadScoringEngine.ts:180` on the real `contacts` table —
`lead_score`/`lead_score_explanation`/`tags` all exist there.

---

## Recommended fix sequencing (for the follow-up pass — not done here)

1. **`enrollments.workspace_id` cluster (#1–6)** — highest blast radius, includes a
   money-path write (`payments` webhook) that silently drops paid enrolments. Decide once:
   drop the filter/field everywhere and derive workspace via `course_id → courses.workspace_id`.
2. **`.eq('workspace_id')` on non-workspace tables (#7–13)** — mechanical: swap to the real
   scoping column (`user_id` / `project_id`) or drop the spurious `.eq`.
3. **Single-column write/read mismatches (#14–25)** — one line each; #14 (LENA 500) and
   #16/#17/#25 (visible user errors) first.
4. **Missing-table clusters (#26–30)** — each needs a small product decision (point at the
   real table, or remove the feature): `automations`→`workflows`, `certificates`→
   `course_certificates`, `employee_attendance` (build or remove HR attendance).
5. **P3 (#31–34)** — confirm handling, fix opportunistically.
6. **Dead code (#35–47)** — batch-delete the orphan files / stub routes and the two stale
   `.sql` schema snapshots in one cleanup PR so they stop being copied into new code.
