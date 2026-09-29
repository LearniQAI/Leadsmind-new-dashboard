# LMS Course Builder — backlog

Items deliberately left out of the Course Builder fix (Phases 0–7) so they did not hold up sign-off.
None is required by the PRD or its acceptance tests (AT-01 to AT-22).

## Duplicate Module does not copy quizzes
Decided 2026-09-28: leave out.

Duplicating a module (`src/lib/lms/duplicateModule.ts`) copies the module, its lessons, content blocks and
canvas pages under new ids. It does **not** copy:
- lesson quizzes: `quiz_questions` and `quiz_settings` rows attached to a lesson
- module quizzes: `module_quizzes` and their questions/settings

An instructor duplicating a module that has quizzes gets the lessons but must rebuild the quizzes.
The lesson-duplicate route has the same limitation. If picked up: copy inside the same all-or-nothing
rollback in `duplicateModule`, give every copied quiz new ids, and never copy attempts or grades.

## `coming_soon` can no longer be set from the UI
The module editor's "Publish status" dropdown (draft / published / coming soon) was removed so that all
lifecycle changes go through `PATCH /api/lms/courses/{courseId}/modules/{moduleId}` (DRAFT/PUBLISHED/INACTIVE).
`coming_soon` is outside the PRD's three-state model and had 0 live rows. Existing `coming_soon` modules keep
working (visible-but-locked to students). If the product wants it as a first-class state, add it to
`src/lib/lms/moduleStatus.ts` (transitions + `studentVisibility.ts`) rather than re-opening the legacy route.

## Small follow-ups
- Deleting a module leaves a gap in `position` (1, 3). Order is unaffected and reorder handles gaps; compact only if a
  gapless order is ever needed.
- Student-facing draft hiding covers the player, quiz pages, preview, landing curriculum, completion, video bytes,
  AI Q&A and the database policies. Endpoints that take a bare lesson id and were not in scope of the audit
  (e.g. assignment submission, reading-completion writes) should be re-checked against
  `isLessonStudentVisible()` when next touched.
