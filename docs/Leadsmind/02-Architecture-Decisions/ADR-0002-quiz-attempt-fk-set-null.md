---
type: adr
id: "0002"
date: 2026-08-31
status: accepted
supersedes:
superseded-by:
---

# ADR-0002 — Quiz-attempt foreign keys use `ON DELETE SET NULL`, not `CASCADE`

## Context

"Three Deferred Items, Item 1." Two related findings, confirmed against the live
database:

- `quiz_attempts.lesson_id` had **no FK / cascade at all** — deleting a course
  left orphaned attempt rows behind (one real orphan found: `lesson_id` and
  `student_id` both the nil UUID — synthetic test debris, removed separately, not
  backfilled).
- `module_quiz_attempts.module_id` was created with `ON DELETE CASCADE` in
  `20260903000013_module_quiz_tables.sql`, matching the same "clean up child
  rows" instinct as `module_quiz_questions` / `module_quiz_settings`.

See [[Milestone-3]], [[LMS]], [[ADR-0001-module-quiz-separate-tables]].

## Options Considered

1. **`ON DELETE CASCADE`** — delete attempts when the parent lesson/module/course
   is deleted.
   - Pros: no orphan rows; simplest mental model; matches the sibling
     content tables.
   - Cons: silently destroys real historical records of student performance
     (score, pass/fail, timing) whenever a course is tidied up.
2. **`ON DELETE SET NULL`** — detach the attempt from the deleted lesson/module,
   keep the row.
   - Pros: preserves attempt history for workspace-wide reporting/analytics
     ("how many quizzes were taken last month") even after the course is gone.
   - Cons: requires `lesson_id` / `module_id` to become nullable (they weren't);
     reporting queries must tolerate a null scope.

## Decision Made

`ON DELETE SET NULL` for both `quiz_attempts.lesson_id`
(`20260903000014_quiz_attempts_lesson_fk_set_null.sql`) and
`module_quiz_attempts.module_id`
(`20260903000015_module_quiz_attempts_fk_set_null.sql`). Both columns made
nullable. `module_quiz_questions` / `module_quiz_settings` **keep** `CASCADE` —
they are authored content with no standalone value.

## Reasoning

A quiz attempt is a real business record, not a content artifact. Deleting a
course is a content-management action; it should not double as a
data-destruction action for performance history. Detaching (`SET NULL`) keeps
the record available for analytics while still removing the dangling reference.
Both migrations were safe to apply immediately — live checks showed 0 real
`module_quiz_attempts` rows and only synthetic debris in `quiz_attempts`, so
nothing needed backfilling first.
