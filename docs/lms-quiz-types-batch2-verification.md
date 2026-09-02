# Quiz Question Types — Batch 2 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.2**. Batch 2 gave the 5 previously
dead question types (`matching`, `ordering`, `fill_blank`, `code`, `file_upload`) a real
student answer UI and real server-side grading. Code is complete, `npx tsc --noEmit` is clean,
`npx vitest run` is 218/218 (30 new grading tests). This runbook closes G4 with live evidence.

Run against a deployed/dev instance with a writable Supabase.

---

## Prerequisites

1. Apply, in filename order:
   - `supabase/migrations/20260903000025_quiz_questions_metadata.sql`
   - `supabase/migrations/20260903000026_quiz_attempts_manual_review.sql`
2. A published course with a module + ≥1 lesson, and a **lesson-level quiz** lesson
   (`lesson_type = 'quiz'`). A test student contact enrolled (login you control).
3. As an instructor, open the quiz workbench (`/courses/<id>/quiz/<lessonId>`) and add **one
   question of each type**: `mcq`, `true_false`, `short_answer` (regression), plus `matching`,
   `ordering`, `fill_blank`, `code`, `file_upload`. Set pass mark 60%.

Helper SQL:

```sql
-- questions round-tripped with their metadata?
select question_type, options, correct_answer, metadata
from quiz_questions where lesson_id = '<LESSON_ID>' order by position;

-- attempts (watch grade_status / passed / score)
select id, grade_status, passed, score, auto_score, max_score, manual_points_awarded, answers
from quiz_attempts where lesson_id = '<LESSON_ID>' and student_id = '<CONTACT_ID>'
order by submitted_at desc;
```

---

## A. Authoring round-trips (metadata persists)

- [ ] After saving each of the 5 new questions, the helper SQL shows a non-empty `metadata`:
  - matching → `{"pairs":[{"left":…,"right":…}, …]}`
  - ordering → `{"items":[…]}` (in the correct order)
  - fill_blank → `{"text_with_blanks":"… [blank] …","blanks":[{"accepted":[…]}, …],"case_sensitive":false}`
  - code → `{"starter_template":"…","accepted_solutions":["…"],"match_mode":"normalized"}`
  - file_upload → `{"rubric_criteria":[{"criteria":"…","max_points":N}]}`
- [ ] Re-opening each question in the workbench repopulates every field (edit round-trip).
- [ ] The `code` editor shows the amber "graded by matching … not by running the code" note.
- [ ] The `file_upload` editor shows the amber "no longer scored instantly" note.

## B. Student — answer key is NOT in the page

- [ ] Log in as the student, open the quiz, and inspect the network response / React props
      for the questions payload. For `matching` / `ordering` / `fill_blank` / `code` /
      `file_upload` there is **no `metadata` and no `correct_answer`** — only a `presentation`
      object. (mcq/true_false/short_answer still carry `correct_answer` — unchanged.)

## C. Auto-graded types — correct vs incorrect

For each, submit once correct and once incorrect (delete the attempt row between runs, or use
retakes). Confirm `quiz_attempts.score` / `passed` move as expected and `grade_status='auto'`.

- [ ] **matching** — correct pairing → full points; one wrong pair → 0 for that question.
- [ ] **ordering** — drag into the stored order → full points; any transposition → 0.
- [ ] **fill_blank** — every blank an accepted answer (any case) → full points; one wrong → 0.
      Then flip `case_sensitive` on the question and re-verify a case-mismatch now fails.
- [ ] **code** — paste an accepted solution with **different indentation / blank lines / CRLF**
      → full points (normalization works). Paste different logic → 0.
- [ ] **Regression:** mcq / true_false / short_answer still grade exactly as before; a quiz of
      only those 3 still shows the instant optimistic score before the server response.

## D. file_upload — pending review path

- [ ] Student answers the file_upload question (uploads a real file) and submits. Result
      screen shows **"Submitted — awaiting review"**, no PASS/FAIL, no score.
- [ ] SQL: the new `quiz_attempts` row has `grade_status='pending_review'`, `passed IS NULL`,
      `score IS NULL`, `auto_score` = the points from the auto questions, `answers` contains
      `{file_url, file_name}` for the file question.
- [ ] The lesson is **not** marked complete (`course_progress` has no new `completed_at` row
      for it) and **no** `quiz_passed` / `quiz_failed` line in the logs yet.
- [ ] Instructor opens `/courses/<id>/quiz/<lessonId>` → Results tab → the student row shows
      **"Pending review"**. Open Diagnostics → the **Grade the uploaded file(s)** panel shows
      the file link + rubric + a points input.
- [ ] Award points that take the total **≥ 60%**, add feedback, "Save review & finalise".
  - [ ] SQL: row now `grade_status='reviewed'`, `passed=true`, `score` = round((auto+awarded)/max·100),
        `manual_points_awarded` = `{ "<qid>": <pts> }`, `reviewer_feedback` set, `graded_by_user_id`
        + `graded_at` set.
  - [ ] Lesson is now complete; a `quiz_passed` line appears in the logs (automation fires).
- [ ] Repeat awarding points that keep the total **< 60%** → `passed=false`, lesson stays
      incomplete, `quiz_failed` logged.

## E. Module-quiz parity

- [ ] Repeat A–D against a **module** quiz (`/courses/<id>/module-quiz/<moduleId>` +
      `module_quiz_questions` / `module_quiz_attempts`). `gradeQuizAttemptManualReview` with
      `scope:'module'` finalises the row and emits the event; there is no lesson-completion
      step for module scope (expected).

## F. My Results

- [ ] The student's **My Results** page: a `reviewed` file-upload quiz shows its final score
      and pass/fail in Quiz history. (A still-`pending_review` attempt currently shows with
      whatever `percentage` is stored — NULL → 0% — until reviewed; acceptable, note if it
      looks confusing in practice.)

---

## Sign-off

G4 is **closed** only when A–E are all checked on a live instance. Until then STEP 6.2 stays
"code-complete, live verification pending".
