# Sprint 2 — Migration & Performance Pre-Audit
Date: 2026-07-06
Branch: sprint2

## Migration Status

| Migration | Status | Notes |
|-----------|--------|-------|
| fix_tag_n1_queries | MISSING | No `bulk_add_tag`/`bulk_remove_tag`/`global_rename_tag` SQL function anywhere in `supabase/migrations/`. The N+1 loop still lives in application code (see below). |
| add_critical_indexes | MISSING | None of the specific index names (`contacts_workspace_email_idx`, `contacts_tags_gin_idx`, `contact_activities_idx`, `enrollments_contact_course_idx`, `campaigns_status_idx`, `messages_convo_idx`, `automations_workspace_active_idx`) exist. No `CREATE INDEX CONCURRENTLY` usage anywhere (all 206 existing `CREATE INDEX` statements are plain, non-concurrent). No GIN index on `contacts.tags`. |
| atomic_operations | PARTIALLY EXISTS | `acquire_campaign_jobs(worker_id, batch_size)` in [20240101000170_campaign_dispatch_queue.sql](supabase/migrations/20240101000170_campaign_dispatch_queue.sql) already uses `FOR UPDATE SKIP LOCKED` for campaign job locking — this covers "claim campaign for sending" conceptually, just under a different name. No `deduct_ai_credit` atomic RPC exists; `fn_consume_credit`/`fn_track_credit_usage` (phase22/23 credit system) are trigger functions, not a callable atomic credit-deduction RPC. |
| workspace_setup_transaction | MISSING | No function matching `setup_workspace`/`workspace_setup_transaction`/`p_workspace_name`/`p_slug`. Workspace creation currently happens as sequential, non-transactional inserts in [src/lib/auth.ts:163-174](src/lib/auth.ts#L163-L174) (`getCurrentWorkspace`'s auto-create fallback) — a plain `insert` into `workspaces` followed by a separate `insert` into `workspace_members`, with no rollback if the second insert fails. |

## Performance Tasks Status

| Task | Status | Notes |
|------|--------|-------|
| Puppeteer → @sparticuz/chromium | TODO | `package.json` has `"puppeteer": "^24.43.1"` only, no `@sparticuz/chromium`. [src/app/api/pdf/route.ts](src/app/api/pdf/route.ts) imports full `puppeteer` and calls `puppeteer.launch({...})` directly (line 2, 16). |
| cache() on auth queries | TODO | No `cache(` usage found anywhere in `src/`. [src/lib/auth.ts](src/lib/auth.ts) has no React `cache` import; `getUser()`, `getCurrentWorkspace()`, `getUserAccessInfo()` etc. all hit Supabase directly on every call with no request-level memoization. |
| validateExternalUrl() | TODO | No file or function named `validateUrl`/`validateExternalUrl` exists anywhere in `src/`. |
| Inngest webhook queue | TODO | No `inngest` reference in `package.json` and no files matching `*inngest*` under `src/`. |

## Existing RPC Functions
(from `CREATE OR REPLACE FUNCTION` / `CREATE FUNCTION` across all migrations)

- `acquire_campaign_jobs`
- `auto_promote_and_flag_pipeline`
- `fn_audit_sync_check`
- `fn_auto_grade_quiz`
- `fn_auto_grade_quiz_v`
- `fn_consume_credit`
- `fn_generate_quiz_pool`
- `fn_get_pre_meeting_brief`
- `fn_handle_booking_outcome_actions`
- `fn_handle_cancellation_promotion`
- `fn_handle_no_show_recovery`
- `fn_integ_handle_appointment_outcome`
- `fn_integ_handle_booking_outcome`
- `fn_secure_booking_or_waitlist`
- `fn_track_credit_usage`
- `fn_trigger_adaptive_path`
- `fn_update_booking_analytics`
- `is_workspace_admin` (added in the most recent migration, 20260705000001)
- `notify_overdue_tasks`
- `rollup_seo_revenue_attribution_func`
- `tr_on_blog_post_publish_func`
- `tr_seo_content_pipeline_transition_func`
- `update_blog_comments_modtime`
- `update_blog_settings_modtime`
- `update_contact_last_activity`
- `update_form_logic_rules_updated_at`
- `update_help_articles_modtime`
- `update_lena_conversations_modtime`
- `update_modified_column`
- `update_seo_content_pipeline_modtime`
- `update_seo_projects_modtime`
- `update_updated_at_column`

No tag-bulk RPC, no atomic credit-deduction RPC, and no workspace-setup-transaction RPC exist among these.

## Existing Indexes
206 total `CREATE INDEX` statements across all migrations (all plain `CREATE INDEX`, none `CONCURRENTLY`). Representative sample (not exhaustive — see `supabase/migrations/*.sql` for the full set):

- `contacts(email)`, `contacts(workspace_id)` — **separate single-column indexes, not a composite `(workspace_id, email)` index**
- `contact_activities(contact_id)` — no composite `(contact_id, created_at)` style index found
- `conversations(contact_id)`, `conversations(platform)`, `conversations(workspace_id)`
- `messages(conversation_id)`, `messages(external_id)`, `messages(workspace_id)` — no composite index matching "messages_convo_idx" pattern
- `opportunities(stage_id)`, `opportunities(workspace_id)`
- `tasks(status)`, `tasks(workspace_id)`
- `campaign_dispatch_queue(campaign_id, status)`, `campaign_dispatch_queue(status, scheduled_for)` — closest existing analog to a "campaigns_status_idx"
- Plus ~170 more single-column indexes across appointments, accounting, LMS, booking, webhook, and pipeline tables.

**No GIN index exists anywhere** (confirmed via `USING GIN` / `gin_idx` search) — so `contacts_tags_gin_idx` is genuinely absent, not just misnamed.

## N+1 Tag Loops
**Still JavaScript loops — not yet using an RPC.**

- [src/modules/crm/service/ContactService.ts:214-232](src/modules/crm/service/ContactService.ts#L214-L232) — `bulkAddTag(ids, tag, workspaceId)` loops over every contact id, doing a `getTags` + `setTags` round trip per contact (classic N+1). The code comment directly above it (lines 208-213) already flags this as future work:
  > "Loop-based by default (safe, no DB dependency). If you've created the `bulk_add_tag` Postgres function, swap the loop below for `await this.repo.bulkAddTagViaRpc(ids, tag, workspaceId)`..."
- Call chain: [src/app/contacts/ContactsClient.tsx:99](src/app/contacts/ContactsClient.tsx#L99) → [src/app/actions/contacts.ts:205-210](src/app/actions/contacts.ts#L205-L210) `bulkAddTag()` server action → `ContactService.bulkAddTag()` (the loop above).
- No `bulkAddTagViaRpc` method exists on the repo yet, and no `bulk_add_tag` SQL function exists to call.

## What Needs to Be Created
- `bulk_add_tag` / `bulk_remove_tag` / `global_rename_tag` Postgres RPC function(s), plus wiring `ContactService.bulkAddTag` (and the repo layer) to call them instead of looping.
- Composite/GIN indexes: `contacts_tags_gin_idx` (GIN on `contacts.tags`), a composite `(workspace_id, email)` index on `contacts`, and similar composite indexes for `contact_activities`, `enrollments` (contact_id, course_id), `campaigns`/`campaign_dispatch_queue` (status), and `messages` (conversation_id-based composite) — all as `CREATE INDEX CONCURRENTLY` since none of the 206 existing indexes use `CONCURRENTLY`.
- An atomic `deduct_ai_credit` RPC (current credit functions are trigger-based, not a callable atomic deduction).
- A `setup_workspace`/workspace-setup-transaction RPC to replace the two-step, non-transactional insert in `src/lib/auth.ts`'s auto-create-workspace fallback.
- `@sparticuz/chromium` dependency + rewrite of `src/app/api/pdf/route.ts` to use it instead of full `puppeteer`.
- `cache()` (React `cache` from `'react'`) wrapping around `src/lib/auth.ts` query functions (`getUser`, `getCurrentWorkspace`, `getUserAccessInfo`, etc.).
- `validateExternalUrl()` utility (SSRF-safe URL validation) — does not exist anywhere in the codebase yet.
- Inngest setup (dependency + client + webhook queue functions) — nothing exists yet.

## What Already Exists
- `acquire_campaign_jobs` RPC already implements atomic, race-safe campaign job claiming via `FOR UPDATE SKIP LOCKED` (in [20240101000170_campaign_dispatch_queue.sql](supabase/migrations/20240101000170_campaign_dispatch_queue.sql)) — functionally close to "claim campaign for sending," just under a different function name. Any new atomic-operations migration should account for this to avoid duplicating logic.
- `is_workspace_admin` RPC was just added in the most recent migration ([20260705000001_fix_workspace_members_recursive_policy.sql](supabase/migrations/20260705000001_fix_workspace_members_recursive_policy.sql)) to fix an RLS recursion bug on `workspace_members`.
- 206 single-column indexes already exist across the schema covering most `workspace_id` foreign keys and common lookup columns — the gap is specifically composite/GIN indexes for the hot paths named in this audit, not indexing in general.
- `ContactService.bulkAddTag` already has correct semantics (dedupes tags, logs bulk activities) — it just needs its internal loop swapped for an RPC call once one exists; no behavior redesign needed.
- 229 total migration files exist, most recent being `20260705000001_fix_workspace_members_recursive_policy.sql`, dated after the bulk of sprint-numbered migrations (`sprint2` through `sprint13` naming, phase-numbered migrations, then student/support/webhook/workspace-email-provider migrations).
