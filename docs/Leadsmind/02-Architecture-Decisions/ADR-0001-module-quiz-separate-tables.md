---
type: adr
id: "0001"
date: 2026-08-31
status: accepted
supersedes:
superseded-by:
---

# ADR-0001 — Module-level quiz uses separate tables, not a nullable `module_id` on the lesson-quiz tables

## Context

The Module-Level Quiz feature (audit-then-build pass) needed quiz storage scoped
to a `course_module` rather than a `course_lesson`. The obvious first option was
to add a nullable `module_id` to the existing `quiz_questions` / `quiz_settings`
/ `quiz_attempts` tables and let a row be either lesson-scoped or module-scoped.

Real audit finding that shaped the decision: the existing lesson-quiz RLS
policies **hard-join through `lesson_id → course_lessons`** directly in their
`USING` clause — e.g. `quiz_questions`' "students read" policy is
`EXISTS (SELECT 1 FROM enrollments e JOIN contacts ct … JOIN course_lessons cl ON cl.course_id = e.course_id WHERE cl.id = quiz_questions.lesson_id …)`.
This is not a generic nullable-FK pattern that a second scope drops cleanly into.

See [[Milestone-3]], [[LMS]].

## Options Considered

1. **Extend the lesson-quiz tables with a nullable `module_id`**
   - Pros: one set of tables, one grading path, less duplication.
   - Cons: forces a rewrite of tested, working RLS on the live lesson-quiz
     system just to special-case a second scope; every policy would need a
     `CASE`/`OR` over "is this lesson-scoped or module-scoped"; higher risk of a
     regression in a system real students already use.
2. **New `module_quiz_settings` / `module_quiz_questions` / `module_quiz_attempts`
   tables, structurally mirroring the lesson-quiz tables column-for-column but
   scoped through `course_modules`**
   - Pros: the working lesson-quiz system and its RLS are never touched; the new
     policies are the same two-policy shape (`students read for enrolled
     courses`, `workspace members access`) just joined via `course_modules`.
   - Cons: near-duplicate schema and a parallel grading function
     (`gradeModuleQuiz.ts` alongside `gradeQuiz.ts`).

## Decision Made

Option 2 — separate module-scoped tables. Implemented in
`supabase/migrations/20260903000013_module_quiz_tables.sql`.

## Reasoning

The build prompt's own guidance was "prefer extending the existing tables
**unless it would meaningfully complicate RLS**" — and the real, hard-joined RLS
shape on the lesson-quiz tables is exactly that case. Duplicating a small,
well-understood schema is cheaper and far lower-risk than rewriting
security-critical policies on a live system. `module_quiz_questions` /
`module_quiz_settings` keep `ON DELETE CASCADE` (authored content, no standalone
value once the module is gone); `module_quiz_attempts` does **not** — see
[[ADR-0002-quiz-attempt-fk-set-null]].
