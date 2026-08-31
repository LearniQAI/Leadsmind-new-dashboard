---
type: build-prompt
date: 2026-08-31
feature: Obsidian documentation vault (initial)
---

# Prompt — Obsidian vault initial setup

```
I need you to set up an Obsidian documentation vault for this project. The vault
already exists at docs/ in this repo.

1. Create this folder structure inside docs/ if it doesn't already exist:
   - 00-Milestones/
   - 01-Modules/
   - 02-Security/
   - 03-Client/
   - 04-Milestone-3-Tasks/
   - _templates/

2. Scan the codebase and write one markdown note per module into 01-Modules/,
   covering: CRM, LMS, Marketing Automation, Social Media/OAuth integrations,
   AI Suite, Communications Hub, Finance/Billing. For each note include:
   purpose, key files/directories, main API routes or DB tables involved, and
   any known issues or TODOs you find in code comments.

3. Write milestone notes into 00-Milestones/ (Milestone-1.md through
   Milestone-4.md). [known scope for M1–M4 provided]

4. Write a note into 02-Security/ summarizing the audit findings and
   remediation (IDOR fixes, RLS hardening, unauthenticated endpoint closures
   across 157 API routes). Include the standing rule: never use the live
   Supabase service-role key for ad-hoc production queries.

5. Create 04-Milestone-3-Tasks/README.md listing the Milestone 3 backlog
   (HR, Learning/LMS completion, Calendar, Telephony — 31 tasks total) as
   Obsidian-Tasks-plugin checkboxes, grouped under those four headings.

6. Create two templates in _templates/:
   - task-template.md with frontmatter: module, status, blocked-by, related PRs
   - module-template.md with sections: Purpose, Key Files, Known Issues,
     Related Tasks

7. In 03-Client/, create a single stub note with just the project name and
   client name — no other personal or contact details.

Use Obsidian wiki-links so module notes link to their relevant milestone notes
and vice versa.
```

## What came of it

- Vault created at `docs/Leadsmind/` (the folder with `.obsidian/`), not `docs/`
  itself.
- 7 module notes, 4 milestone notes, 1 security summary, the M3 task checklist,
  2 templates, 1 client stub.
- Superseded by the audit-then-build restructure the same day —
  [[2026-08-31-obsidian-vault-audit-then-build]]. Folders renumbered
  (`00-Milestones → 01-Milestones`, `01-Modules → Modules`,
  `_templates → Templates`), `02-Security` split into dated notes under
  `03-Security-Audits/`, `04-Milestone-3-Tasks` folded into [[Milestone-3]].
