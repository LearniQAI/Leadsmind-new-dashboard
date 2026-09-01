---
type: module
---

# CRM

## Purpose

Contacts, deals/opportunities, pipelines, tasks, tags and segments for
workspace members running their sales operation. Per the README this is the most
mature module in the codebase — real routes, server actions and Supabase tables
throughout. Tenancy boundary is `workspace_id`.

Also covers the adjacent build/website tooling that shares CRM data: the
Craft.js Funnel Builder and website builder, Forms, and Lead Finder.

## Key Files

- Pages: `src/app/contacts`, `src/app/crm` (`activity`, `deals`, `leads`,
  `pipelines`, `crm-setup`), `src/app/deals`, `src/app/pipelines`,
  `src/app/tasks`, `src/app/segments`, `src/app/(dashboard)/crm-dashboard`.
- Server actions: `contacts.ts`, `pipelines.ts`, `tasks.ts`, `segments.ts`,
  `tags.ts`, `tagAnalytics.ts`, `tagInsights.ts`, `tagSearch.ts`,
  `lead-finder.ts`, plus `*-workspace.ts` variants.
- Smart Tags Engine: `src/modules/tags/` (`repository/TagRepository.ts`,
  `service/TagService.ts`, `ai/conflictDetection.ts`, `ai/duplicateDetection.ts`,
  `autoTagging/applySystemTag.ts`, `sync/syncContactTags.ts`),
  `src/modules/crm/` (`repository/ContactRepository.ts`,
  `service/ContactService.ts`), `src/lib/tags/tagIcons.tsx`.
- Builder: `src/app/funnels`, `src/app/websites`, `src/lib/builder/`
  (`stepTypes.ts` — 11 step types, `templates/`), `src/app/actions/builder.ts`,
  `builderAI.ts`, `builderDeploy.ts`, `@craftjs/core`.
- Forms: `src/app/forms/[id]/` (`ab-testing`, `analytics`, `automations`,
  `governance`), `src/app/api/public/forms/[id]/submit/route.ts`.
- Lead Finder: `src/app/lead-finder`, `src/components/lead-finder`.

## API Routes / DB Tables

- Routes: `src/app/api/crm/contacts/*` (incl. `[id]/verifications` — KYC recheck
  with 429 `RECHECK_COOLDOWN`), `src/app/api/v1/{contacts,deals,leads,pipelines,
  pipeline-stages,tags,tasks}` (public API v1), `src/app/api/public/forms/*`,
  `src/app/api/public/analytics/*`.
- Tables: `contacts`, `opportunities`/`deals`, `pipelines`, `pipeline_stages`,
  `tasks`, `segments` (`20260808000002_segments_table.sql`), and the Smart Tags
  relational model: `tag_categories`, `tags`, plus polymorphic tag-assignment
  tables shared across Contacts / Companies / Deals / Invoices / Courses /
  Support Tickets (`20260729000000_smart_tags_schema.sql`,
  `20260729000001_smart_tags_data_migration.sql`,
  `20260802000000_atomic_contact_tag_and_score_updates.sql`,
  `20260706000001_fix_tag_n1_queries.sql`).
- Lead Finder geocoding: `20260821000001_lead_finder_geocoding.sql`.

## Known Issues

- **Smart Tags migration debt:** the old `contact_tags_registry` table was
  referenced by `src/app/api/v1/tags/route.ts`, `v1/tags/[id]/route.ts`,
  `ContactRepository.ts`, `TagsClient.tsx`, `ManageTagsDialog.tsx` but was never
  created by any migration — those code paths threw "relation does not exist"
  until the Smart Tags Engine replaced it. Array-column tag stores
  (`contacts.tags`, `opportunities.tags`, `conversations.tags`, `pages.tags`,
  `lead_finder_results.smart_tags`) are to be dropped only once repointing is
  verified.
- **High Value Client auto-tagging is DISABLED** — shipped with a placeholder
  rule (`src/app/api/cron/workers/auto-tag-sweep/route.ts:11`).
- **Lead Finder map is fake** — Milestone 4 task 77 replaces it with a real map.
- **Forms A/B testing** page component is ~115 lines — routable but shallow
  relative to a full A/B feature (Milestone 2 task 33).
- Currency-display bug on the Affiliates page and Dashboard (Milestone 4 tasks
  78–79); ALL-CAPS display bugs on real customer data (task 82).
- Old, disconnected HR/CRM page trees and the Transfer page pending a
  keep/delete decision (Milestone 4 tasks 83–84).

## Related Tasks

[[Milestone-1]] (CRM/automation RLS hardening, KYC recheck cooldown) ·
[[Milestone-2]] (Smart Tags Engine, segmentation, Form Analytics + A/B,
Craft.js builder overhaul, dashboard redesign) ·
[[Milestone-4]] (Lead Finder real map, currency + ALL-CAPS cleanup, page trees)
