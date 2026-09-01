---
type: adr
id: "0003"
date: 2026-08-31
status: accepted
supersedes:
superseded-by:
---

# ADR-0003 — Custom-domain course serving resolves by `domain_configurations.id`, not `workspace_id`

## Context

Workspaces can attach a custom domain (`domain_configurations`) and publish a
course under it at a chosen `url_path`. An inbound request on such a domain has
to be routed to the right course. The "custom domain setup" pass (commit
`b3c34fca`) added:

- `courses.domain_id` + `courses.url_path`, with a partial unique index on
  `(domain_id, url_path)` (`20260903000004_courses_domain_url_path.sql`).
- `resolveHost()` in `src/lib/domains/resolve.ts`, called from `src/middleware.ts`.

See [[Milestone-2]], [[CRM]].

## Options Considered

1. **Look up the course by `workspace_id` + `url_path`** (resolve the host only
   as far as the workspace).
   - Pros: simpler; one fewer column to thread through middleware.
   - Cons: a workspace with more than one custom domain would leak — any course
     with a matching `url_path` on *any* of that workspace's domains could be
     served on *this* one.
2. **Look up the course by `domain_configurations.id` + `url_path`**, threading
   the resolved `domainConfigId` from middleware into the page via an
   `x-domain-config-id` request header.
   - Pros: a course is served only on the exact domain it was published to; no
     cross-domain bleed within a workspace.
   - Cons: middleware must carry the domain-config id; the course page must read
     it from the header instead of doing a global slug lookup.

## Decision Made

Option 2. `resolveHost()` returns `{ workspaceId, hostname, routing,
domainConfigId }`; `middleware.ts` rewrites to
`/unauthenticated/courses/{url_path}` (or `/unauthenticated/domain-portal` when a
domain has several courses) and sets `x-domain-config-id`, which
`/unauthenticated/courses/[slug]/page.tsx` uses to scope the course lookup.
Only `status = 'active'` domains resolve — `resolveHost()` returns `null` for
`pending` / `verifying`, so an unverified domain (DNS/SSL not confirmed) can
never serve anything.

## Reasoning

Tenant isolation has to hold at the domain level, not just the workspace level,
or the multi-domain case becomes a data-leak. Scoping every course lookup to the
resolved `domain_configurations.id` — never a loose `workspace_id`-only match —
is the same discipline applied elsewhere in the security work (never trust a
client-supplied scope; resolve it server-side). The free
`{slug}.leadsmind.com` subdomain path keeps `domainConfigId = null` — there is no
custom-domain course concept there, so it falls through to normal platform
behaviour.

Related: sender/email domains vs. custom routing domains were investigated for
consolidation and deliberately kept separate — see
[[ADR-0004-sender-domains-vs-custom-domains]].
