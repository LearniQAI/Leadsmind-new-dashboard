---
type: adr
id: "0006"
date: 2026-07-29
status: accepted
supersedes:
superseded-by:
---

# ADR-0006 — Smart Tags: a new relational tag model, replacing the never-created `contact_tags_registry`

## Context

`src/app/api/v1/tags/route.ts`, `v1/tags/[id]/route.ts`,
`ContactRepository.ts`, `TagsClient.tsx` and `ManageTagsDialog.tsx` all
referenced a table `contact_tags_registry` that **no migration ever created** —
every one of those code paths threw "relation does not exist". Separately, tags
were also stored as array columns on several tables (`contacts.tags`,
`opportunities.tags`, `conversations.tags`, `pages.tags`,
`lead_finder_results.smart_tags`).

See [[Milestone-2]], [[CRM]].

## Options Considered

1. **Create `contact_tags_registry` as-referenced** (a flat, contact-only tag
   table) and move on.
   - Pros: smallest change; unblocks the throwing code paths.
   - Cons: locks in a contact-only model; no hierarchy, no categories, no reuse
     across Companies / Deals / Invoices / Courses / Support Tickets; the array
     columns stay as a parallel source of truth.
2. **Build a proper workspace-scoped, hierarchical, polymorphic tag model** —
   `tag_categories` + `tags` + assignment tables shared across entity types.
   - Pros: one tag system for the whole platform; categories, colours, icons,
     parent/child; array columns can be migrated in and then dropped.
   - Cons: a data migration (`20260729000001`) and repointing every
     reader/writer in application code; array columns can't be dropped until
     that repointing is verified.

## Decision Made

Option 2. `20260729000000_smart_tags_schema.sql` creates the relational model;
`20260729000001_smart_tags_data_migration.sql` moves `contacts.tags` /
`opportunities.tags` data in; `20260802000000_atomic_contact_tag_and_score_updates.sql`
makes tag+score updates atomic. Code lives in `src/modules/tags/`.

## Reasoning

The referenced table never existing was an opportunity, not just a bug — nothing
depended on its shape, so there was no reason to enshrine a weak one. The
array-column stores are left in place by the schema migration and dropped only
**after** repointing is verified in application code — that verification is an
open row on [[Deferred-Items-Tracker]].
