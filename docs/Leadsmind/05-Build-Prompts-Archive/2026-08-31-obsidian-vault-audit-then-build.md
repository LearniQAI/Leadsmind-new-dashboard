---
type: build-prompt
date: 2026-08-31
feature: Obsidian documentation vault (audit-then-build restructure)
---

# Prompt — Audit-then-build: set up an Obsidian vault in this repo

```
GOAL: Set up a real, usable Obsidian vault inside this repository for project
documentation — decisions, audits, milestone status, deferred items — matching
the two-bucket (Verified/Fixed vs. Deliberately Deferred) reporting discipline
already used throughout this project's build history.

STEP 0 — Audit before creating anything: confirm existing docs/ / README /
notes dirs; confirm .gitignore for the pattern to follow for machine state.

STEP 1 — Create the vault at /docs/vault (or confirm/ask if a different
location is preferred):
  00-Inbox/                  — quick capture
  01-Milestones/             — one note per milestone (1-5), task-by-task status
  02-Architecture-Decisions/ — one note per real decision, lightweight ADR log
  03-Security-Audits/        — findings from each security pass, dated
  04-Deferred-Items/         — single running tracker (or one per item)
  05-Build-Prompts-Archive/  — copies of significant build prompts
  Templates/                 — note templates

STEP 2 — Obsidian config: real .obsidian/ with app.json + core-plugins.json
enabling at least Templates, Backlinks, Graph, Tag pane, Outline. .gitignore
workspace.json / workspace-mobile.json / cache; keep app.json,
core-plugins.json, shared templates tracked.

STEP 3 — Templates matching this project's reporting conventions: Audit Report
(Context / Verified-Fixed / Deliberately Deferred / evidence), Architecture
Decision (Context / Options / Decision / Reasoning), Deferred Item (what / why /
status Open|Resolved).

STEP 4 — Seed with real content: one Milestone note per milestone (1-5) with
real status; a few real ADRs (module-quiz schema, SET NULL cascade,
custom-domain serving); one real Deferred Items tracker with genuinely-open
items.

STEP 5 — /docs/vault/README.md: how to open in Obsidian, folder purpose,
note-taking conventions.

STEP 6 — Verify vault opens; verify .gitignore excludes personal state via a
real git status; two-bucket report.
```

## What came of it

- **Location decision:** user chose to convert the existing `docs/Leadsmind/`
  vault in place rather than start a second vault at `docs/vault/` (two nested
  Obsidian vaults in one repo is fragile).
- Folder structure from Step 1 applied to `docs/Leadsmind/`, plus a `Modules/`
  folder carried over from the first pass and a root `Client.md` stub.
- 6 ADRs seeded ([[ADR-0001-module-quiz-separate-tables]] …
  [[ADR-0006-smart-tags-relational-model]]); 2 dated security audits under
  `03-Security-Audits/`; [[Deferred-Items-Tracker]] with 14 open + 4 resolved
  rows; 3 new templates + the 2 originals.
- `.obsidian/` config curated and partly git-tracked; `.gitignore` updated for
  machine-specific Obsidian state.
