# Cross-Course Pending Work — Batch 8 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.8**. Code is complete, `npx tsc
--noEmit` clean, `npx vitest run` unchanged at 226/226, `eslint` clean. This runbook closes
G12 with live evidence.

## Prerequisite — read this first

**Apply `supabase/migrations/20260903000026_quiz_attempts_manual_review.sql` (Batch 2) before
testing the quiz half of this batch.** Without it, `quiz_attempts.grade_status` /
`module_quiz_attempts.grade_status` don't exist and every file-upload-quiz item in both views
will silently be absent (confirmed live during this batch's own smoke test). The assignment
half works without any new migration.

## A. Student "My Work" (My Results page)

Seed, for one real test student across 2+ real courses:
- [ ] One assignment content block with no submission yet → confirm it appears under
      **Not yet submitted**, links to the right lesson.
- [ ] One assignment submitted, ungraded (`grade_status='pending'`) → **Awaiting review**.
- [ ] One assignment graded `failed` with feedback → **Needs revision**, feedback text shown.
- [ ] One assignment graded `passed` within the last 7 days → **Recently graded**.
- [ ] One assignment graded `passed` MORE than 7 days ago → confirm it does NOT appear
      anywhere in My Work (it still shows in the existing Quiz/Assignment history further
      down the page).
- [ ] One lesson quiz with a file-upload question, submitted and `pending_review` →
      **Awaiting review**, labeled "Quiz".
- [ ] That same quiz reviewed (passed or failed) within 7 days → **Recently graded**.
- [ ] One module quiz with a file-upload question in the same two states → same buckets,
      labeled "Module quiz".
- [ ] With nothing pending and nothing recently graded, confirm the "You're all caught up"
      empty state shows instead of four empty section headers.
- [ ] Every row's link correctly opens the right lesson/course.

## B. Admin "Needs grading" queue

- [ ] From `/courses`, click "Needs grading". Confirm it lists the pending assignment and
      pending-review quiz items seeded above, across BOTH courses, in one table.
- [ ] Confirm student name/email, item title, course, and type badge are all correct.
- [ ] Search and the type filter narrow the list correctly.
- [ ] Click "Grade" on an assignment row → confirm it lands on that course's Submissions tab
      (not the Modules tab), with the right course open.
- [ ] Grade it there (pass or fail) — confirm it disappears from the Needs Grading queue on
      next load.
- [ ] Click "Grade" on a lesson-quiz row → confirm it lands on that quiz's Results tab (not
      Questions), with the right student's pending review panel reachable.
- [ ] Grade it there via the existing manual-review panel — confirm it disappears from the
      queue and the student's My Results now shows it as Recently Graded.
- [ ] Repeat for a module-quiz row.

## C. Regression

- [ ] `CourseWorkspaceClient` and `QuizWorkbenchClient` still default to their first tab when
      opened WITHOUT a `?tab=` param (i.e. normal navigation is unaffected).
- [ ] The existing per-course Submissions tab and per-quiz Results tab still work exactly as
      before when reached the normal way (not via the Needs Grading queue).

---

## Sign-off

G12 is closed when A–C are all checked on a live instance with Batch 2's migration applied.
