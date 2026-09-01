---
type: adr
id: "0005"
date: 2026-08-31
status: accepted
supersedes:
superseded-by:
---

# ADR-0005 — Legacy LMS quiz cluster: scoped drop now, `lms_quizzes` left for a separate decision

## Context

"Three Deferred Items, Item 3." The codebase carried an old quiz stack —
`lms_quizzes`, `lms_questions`, `lms_quiz_options`, `lms_quiz_explanations`,
`lms_quiz_submissions` — plus `QuizPlayer.tsx` and a set of CRUD server actions
in `src/app/actions/quizzes.ts`. The live systems that replaced it are
`quiz_questions` / `quiz_settings` / `quiz_attempts` (lesson-scoped) and the
`module_quiz_*` tables ([[ADR-0001-module-quiz-separate-tables]]).

A full-codebase search found **zero real callers** of any of the five legacy
tables outside that one file and audit-trail comments; all five had **0 real
rows**. A real bug was found in passing: `getQuizSubmissionsAction` read from
`lms_quiz_submissions`, which the real student flow
(`StudentQuizClient.tsx → submitQuizAttempt`) had never written to — so
`QuizAnalyticsConsole` had been silently disconnected from every real attempt.
Fixed to read `quiz_attempts`.

See [[Milestone-3]], [[LMS]], [[Deferred-Items-Tracker]].

## Options Considered

1. **Drop the whole cluster including `lms_quizzes` in one migration.**
   - Pros: fully removes the dead stack in a single step.
   - Cons: a first attempt failed live — three more tables
     (`lms_certificates`, `lms_adaptive_rules`, `lms_adaptive_rules_v2`) hold a
     real FK into `lms_quizzes.id`. None were in the Item 3 audit scope, none
     have a real code reference or a real row today, but dropping `lms_quizzes`
     now forces dropping those three unscoped tables in the same breath — a
     separate decision this task did not ask for.
2. **Drop only what the dependency check proved safe; report the rest.**
   - Pros: removes the confirmed-dead children with no surprises; the
     `lms_certificates` / `lms_adaptive_rules*` finding is surfaced explicitly
     for a deliberate follow-up instead of being silently swept in.
   - Cons: `lms_quizzes` lingers as a known-dead table until the follow-up.

## Decision Made

Option 2. `20260903000016_drop_legacy_lms_quizzes.sql` drops
`lms_quiz_options`, `lms_quiz_explanations`, `lms_quiz_submissions`,
`lms_questions` in dependency order (children first, confirmed via a live
constraint query). `lms_quizzes` is **deliberately not dropped**. The legacy
CRUD actions and `QuizPlayer.tsx` were removed from application code.

## Reasoning

The audit scope was "these five tables." Expanding a migration mid-flight to
also drop three tables nobody asked about — irreversibly — is exactly the kind
of silent scope-creep the two-bucket discipline exists to prevent. The safe
subset ships now; the `lms_quizzes` + `lms_certificates` /
`lms_adaptive_rules` / `lms_adaptive_rules_v2` question goes on
[[Deferred-Items-Tracker]] as an open item for a conscious follow-up decision.
