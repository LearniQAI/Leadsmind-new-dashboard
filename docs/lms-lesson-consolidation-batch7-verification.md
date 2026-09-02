# Consolidate Lesson Authoring — Batch 7 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.7**. No migration. Code is complete,
`npx tsc --noEmit` clean, `npx vitest run` unchanged at 226/226, `eslint` clean (no new
errors/warnings) on every touched file. This runbook closes G10 with a real browser pass.

## A. Existing real lessons render unchanged

- [ ] Open each of the app's real existing lessons as a student (`/student/courses/[id]`).
      Confirm every block (video, download, embed, html_code, audio, reading, live_session —
      whatever each lesson actually has) renders exactly as it did before this batch. Since
      the canvas/content_blocks render code was not touched, this should be a pure no-op —
      the point of this check is to confirm that claim, not to find a real difference.
- [ ] Confirm "Mark complete" / auto-complete, drip locking, and sequential locking still
      behave correctly on these lessons.

## B. New lesson creation is canvas-only

- [ ] Click "+ Add Lesson" on a real module. Confirm it asks only for a name, then a starting
      layout (blank or a template) — no "choose a lesson type" step, no video/audio/PDF/quiz/
      assignment/live-session/flashcards/code/SCORM options anywhere in this flow.
- [ ] Confirm the created lesson opens directly in the canvas editor.

## C. Code / SCORM are gone

- [ ] Confirm there is no way, anywhere in the admin course workspace, to create or select a
      "Code sandbox" or "SCORM" lesson.
- [ ] Open the admin preview player (`/courses/[id]/learn`) for any lesson — confirm it does
      not offer a Code or SCORM view (it will show its existing plain-text fallback for real
      lessons regardless — that's a separate, already-flagged gap, not part of this check).
- [ ] Open the in-app Help article "Building Courses, Modules, and Lessons" — confirm it
      describes the real canvas flow and the honest "SCORM isn't real" note, not the old
      type-picker language.

## D. Edge-case edit path (no real lesson to test against — verify the code path exists)

- [ ] `handleCreateAssignment` (the "+ Assignment" quick action on a lesson row, if surfaced in
      the UI) still opens a working modal with a real Content Blocks panel — confirm it saves
      correctly and the assignment block appears in the student player.
- [ ] If a lesson somehow exists with no linked canvas `pages` row, confirm `onEditLesson`
      opens `LessonCreatorModal` (the trimmed content-blocks editor) rather than erroring.

## E. Regression

- [ ] Full course-authoring smoke pass: create a course, add a module, add 2-3 lessons with a
      mix of block types via the canvas editor, publish, enrol a test student, complete the
      course end to end (including any quiz blocks) — confirm nothing in this pass broke.

---

## Sign-off

G10 is closed when A–E are all checked on a live instance.
