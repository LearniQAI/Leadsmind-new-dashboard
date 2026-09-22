---
type: adr
id: "0007"
date: 2026-09-22
status: accepted
supersedes:
superseded-by:
---

# ADR-0007 — Two automation engines both fire on LMS events, by design; document, don't merge

## Context

An earlier LMS audit (2026-09-02, Batch 1) flagged this as a "trap": `publishEvent()`
(`src/lib/events/EventBus.ts`) and `emitLMSEvent()` (`libs/core/src/events/lms-event-bus.ts`)
are two independent event buses that don't share subscribers, so a rule built against one
never sees events fired only on the other. That audit treated it as an accidental gap to be
patched (and did — Batch 1 added the missing `emitLMSEvent` calls alongside the existing
`publishEvent` calls at every LMS completion site). Batch 4 of the 2026-09-21/22 LMS audit
re-raised the same question at the architecture level: should these be one engine, not two?

Real, live evidence gathered before deciding (not assumed):

- **Engine A — the generic CRM workflow builder** (`/automations`, table `workflows` +
  `workflow_steps` + `workflow_executions`, executor `src/lib/automation/executor.ts`,
  triggered by `publishEvent`). Its own builder (`WorkflowEditorClient.tsx`) exposes
  `course_completed`, `module_completed`, `lesson_completed`, `quiz_passed`, `quiz_failed`
  as first-class trigger options — this is not incidental, someone deliberately wired LMS
  events into the general-purpose builder. Live: 1 real workflow using `quiz_failed`.
- **Engine B — the course's own Automations tab** (`/courses/[id]/automations`, table
  `lms_automation_rules` + `lms_delayed_actions`, executor
  `libs/workers/src/automation-executor.ts`, triggered by `emitLMSEvent`). Purpose-built LMS
  actions Engine A does not have at all: `enroll_course`, `revoke_course`, `enroll_bundle`,
  `assign_certificate`, `send_certificate_email`, `grant_community`. Live: a workspace-wide
  `quiz_passed -> enroll_course` rule (verified working end-to-end as part of Batch 4 / fix 5),
  plus the certificate-delivery blueprint (`assign_certificate` + `send_certificate_email`)
  auto-seeded on every new course (`courseBlueprints.ts::seedCertificateDeliveryBlueprint`).

Both are genuinely, currently used — not one live and one abandoned. The LMS-specific ACTIONS
(certificates, course enroll/revoke) can only ever live in Engine B; Engine A has no course
concept to act on. Engine A's value is the reverse: an LMS event can be one step inside a
larger, non-LMS workflow (e.g. "quiz failed -> also update a deal stage, also notify a Slack
channel") that Engine B was never built to express.

## Options Considered

1. **Merge into one engine.** Pick either `workflows` or `lms_automation_rules` as the sole
   home for LMS-triggered automation and migrate the other's rules and executor logic over.
   - Pros: one place to look for "what happens when X"; no more dual-emission
     (`publishEvent` + `emitLMSEvent` side by side at every completion site) to keep in sync.
   - Cons: a real, non-trivial migration (rule schema, delayed-action queue, UI) for a system
     with only ~10 live rules total between both engines today — the migration cost is not
     clearly justified by the current blast radius, and Engine A structurally cannot host
     Engine B's course-specific actions without adding an `action_type` union it doesn't need
     for any of its other (non-LMS) trigger types.
2. **Keep both, document the split, stop treating it as an accidental duplication.**
   - Pros: zero migration risk right now; each engine keeps doing the job it's actually
     built for; the only real cost is the discipline of dual-emission at completion sites,
     which is already a stable, established pattern (Batch 1 already fixed the gaps in it).
   - Cons: a future engineer (or audit) can still be surprised by it if this document isn't
     found; the dual-emission call sites are a real place a THIRD gap of the Batch-1 shape
     could reappear if a new LMS completion path is added without both emits.

## Decision Made

Option 2. Both engines stay. Guidance for future work:

- **Route an LMS automation through Engine B** (`lms_automation_rules`, the course's own
  Automations tab) when the action is LMS-specific (enroll/revoke/certificate/community) or
  when it should be scoped to one course (`course_id` non-null) rather than the whole
  workspace.
- **Route it through Engine A** (`/automations`, `workflows`) when the automation needs to
  chain an LMS trigger into non-LMS actions (CRM fields, deals, tickets, generic
  email/SMS/tag actions Engine B doesn't have), or should live alongside a workspace's other,
  non-LMS automations in one place.
- **Any new LMS completion site** (a new way a lesson/course/quiz/certificate can become
  "done") must call both `publishEvent(...)` and `emitLMSEvent(...)`, exactly as every
  existing one does — this is the one place the two-engine design creates an ongoing
  maintenance obligation, not a one-time cost.
- Course-scoped bugs found in one engine's executor do not imply the other has them —
  Batch 4 / fixes 3 and 5 (2026-09-22) were both found and fixed **only** in Engine B's
  `libs/workers/src/automation-executor.ts` / `libs/core/src/events/lms-event-bus.ts`; Engine
  A's `src/lib/automation/executor.ts` was not touched or audited in that pass.

## Reasoning

The two engines were never actually duplicating the same job — one is LMS-shaped and
course-aware, the other is generic and workspace-wide. What was missing was the discipline
(dual-emission) and the write-up, not a merge. Forcing them into one engine now would spend
real migration effort narrowing a real, if small, gap between "what LMS automations can do"
and "what workspace-wide automations can do," for a live rule count in the low tens.

Related: [[lms-dual-automation-engines]] (the original 2026-09-02 memory note that first
named this split), [[lms-automation-batch1-status]].
