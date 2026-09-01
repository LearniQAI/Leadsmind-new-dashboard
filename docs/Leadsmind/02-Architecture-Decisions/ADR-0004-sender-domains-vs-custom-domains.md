---
type: adr
id: "0004"
date: 2026-08-31
status: accepted
supersedes:
superseded-by:
---

# ADR-0004 — "Sender Domains" and "Custom Domain Connection" stay as two separate implementations

## Context

A duplicate-implementation triage (Duplicate Implementation note #10) flagged two
domain features that looked like the same thing built twice:

- **Sender Domains** — `sender_domains` table, the original section of
  `src/app/actions/domains.ts`; email-sending domain with SPF/DKIM/DMARC
  verification.
- **Custom Domain Connection** — `domain_configurations` table,
  `addDomain`/`getDomains` in the same file; white-label custom-domain routing
  (see [[ADR-0003-custom-domain-course-serving]]).

There is also a third, unrelated `builder_published_domains` table.

See [[Milestone-1]], [[03-Security-Audits/README|Security Audits]], [[CRM]].

## Options Considered

1. **Consolidate** — pick one table, repoint the other feature onto it, delete
   the loser.
   - Pros: one domain model, less code.
   - Cons: they are genuinely different features — email-sending
     domain/DKIM verification vs. HTTP routing / SSL / Cloudflare-for-SaaS
     hostname config. `domain_configurations` carries `routing_config`,
     `cloudflare_hostname_id`, `ssl_*`, `health_status`; `sender_domains`
     carries mail-auth state. A repoint would mean cramming both concerns into
     one table and rewriting working code on both sides.
2. **Keep separate, unify only the security posture.**
   - Pros: no risky data-model surgery; each feature keeps the columns it
     actually needs.
   - Cons: two code paths to maintain; the `is_email_sender` flag on
     `domain_configurations` hints at a future overlap that still isn't real.

## Decision Made

Option 2. Both generations keep their own table and code path. The same
`requireWorkspaceRole(['admin','owner'])` guard was applied to **both** so they
share a security posture (Milestone 1, Task 15 re-verification follow-up).

## Reasoning

"Duplicate-looking" is not "duplicate." True consolidation (repoint one onto the
other, delete the loser) wasn't viable without merging two distinct problem
domains. The actual defect they shared was authorization, not structure — so
that is what got fixed on both, and the structural separation was left alone.
