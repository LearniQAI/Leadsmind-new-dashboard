---
type: index
---

# Security Audits

One dated note per security pass, each in the [[Audit-Report]] two-bucket format
(**Verified / Fixed** vs. **Deliberately Deferred**). Deferred rows are mirrored
into [[Deferred-Items-Tracker]].

| Date | Pass | Note |
|---|---|---|
| 2026-08-16 | Static code review + live-verification checklist | [[2026-08-16-static-code-review]] |
| 2026-08-31 | Lockdown migration sweep (financial / KYC / identity / storage / forum) | [[2026-08-31-lockdown-sweep]] |

Source docs in the repo: `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md`,
`docs/automation-audit.md`.

---

## Standing rule — production database access

> **Never use the live Supabase service-role key for ad-hoc production queries.**
> The service-role key bypasses every RLS policy, so a stray query can read or
> mutate any workspace's data with no tenant guard. For anything against
> production, use one of:
>
> 1. an **RLS-respecting client** (anon / authenticated key with a real user
>    session) so Postgres enforces `workspace_id` scoping; or
> 2. a **scoped admin / reporting endpoint** that already encodes the right
>    authorization and filters; or
> 3. a **non-production copy** (staging, or a sanitized dump) for exploratory
>    work.
>
> RLS rejection tests specifically must run as a real non-admin / non-owner
> workspace member — proving Postgres itself rejects the write, not merely that
> the app never attempts it.
