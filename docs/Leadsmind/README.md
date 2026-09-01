# LeadsMind Documentation Vault

An Obsidian vault for LeadsMind project documentation — architecture decisions,
security audits, milestone status, and the running list of deliberately deferred
work. Lives in-repo at `docs/Leadsmind/` so it versions alongside the code it
describes.

## Opening it

1. Install [Obsidian](https://obsidian.md).
2. **Open folder as vault** → select `docs/Leadsmind/`.
3. The `.obsidian/` folder ships a minimal, shared config (Templates, Backlinks,
   Graph, Tag pane, Outline, plus search/command-palette/properties). Your
   personal layout (`workspace.json`) is gitignored, so opening the vault won't
   dirty the repo.
4. The Templates plugin points at `Templates/` — use *Insert template*
   (command palette) when creating a new ADR, audit, or deferred-item note.

## Folder structure

| Folder | Purpose |
|---|---|
| `00-Inbox/` | Quick capture. Unsorted notes; file or delete them promptly. |
| `01-Milestones/` | One note per milestone (1–5), tracked **task-by-task** with a two-bucket status block. |
| `02-Architecture-Decisions/` | Lightweight ADR log — one note per real decision (Context / Options / Decision / Reasoning). Numbered, never renumbered. |
| `03-Security-Audits/` | One dated note per security pass, in the two-bucket audit format. Holds the standing rule on production DB access. |
| `04-Deferred-Items/` | Single running [[Deferred-Items-Tracker]] — every "Deliberately Deferred" item, each `Open` or `Resolved`. |
| `05-Build-Prompts-Archive/` | Verbatim copies of significant build prompts, for future reference. |
| `Modules/` | One reference note per platform module (CRM, LMS, Marketing Automation, Social/OAuth, AI Suite, Communications Hub, Finance/Billing). |
| `Templates/` | Note templates (Audit Report, Architecture Decision, Deferred Item, plus task/module). |
| `Client.md` | Project + client name stub. |

## Conventions

### Two-bucket reporting

Every audit note, and the status block on every milestone note, splits work into
exactly two buckets — the same discipline used throughout this project's build
history and its migration comments:

- **Verified / Fixed** — only what is actually confirmed done. State *how* it was
  verified; if it was static-review-only, say so explicitly.
- **Deliberately Deferred** — anything surfaced but consciously not done, with
  the reason. Every deferred item must also get a row in
  [[Deferred-Items-Tracker]] so it cannot be lost.

Never a third "mostly done" bucket. If it isn't verified, it's deferred.

### ADR format

Context → Options Considered → Decision Made → Reasoning. Cite concrete evidence
(migration filename, code path, live-check result), not preference. A superseded
ADR keeps its number and gains `status: superseded` + a forward link.

### Linking

Use `[[wiki-links]]` by note name. Module notes link to the milestones and ADRs
that touch them and vice versa; audits and ADRs link the deferred items they
raise.

## Source material

The vault summarizes, it doesn't replace: `README.md` (repo root),
`docs/SECURITY_REVIEW_LIVE_VERIFICATION.md`, `docs/automation-audit.md`, the
`supabase/migrations/` comment history, and `git log`.
