---
type: audit
date: {{date:YYYY-MM-DD}}
area:
auditor:
status: draft
---

# {{title}}

## Context

<!-- What was audited and why. Scope boundaries — what was explicitly in and out.
     Link the `[[Milestone-N]]` or `[[ADR-NNNN-...]]` this traces to. -->

## Verified / Fixed

<!-- Only items actually confirmed closed. For each: what was wrong, what changed
     (file / migration / commit), and how it was verified. If verification was
     static-only, say so explicitly. -->

- **Finding:**
  - Fix:
  - Evidence:
  - Verification: `static-only` | `live` — details

## Deliberately Deferred

<!-- Items surfaced but NOT fixed in this pass, with the reason. Each one must
     also get a row in [[Deferred-Items-Tracker]] so it cannot get lost. -->

- **Deferred:**
  - Why:
  - Tracker: [[Deferred-Items-Tracker]] → <item>

## Evidence / Verification Notes

<!-- Commands run, queries, migration filenames, commit hashes, screenshots.
     Note anything still pending live verification against staging. -->
