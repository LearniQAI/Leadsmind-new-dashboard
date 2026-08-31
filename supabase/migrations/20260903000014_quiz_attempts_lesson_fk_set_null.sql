-- Three Deferred Items, Item 1 — quiz_attempts.lesson_id had no FK/cascade at all, confirmed
-- live: deleting a course left orphaned attempt rows behind (one real orphaned row found and
-- confirmed as synthetic test debris — lesson_id/student_id both the nil UUID — removed
-- separately before this migration, not backfilled, since it wasn't real data).
--
-- Decision: ON DELETE SET NULL, not CASCADE. A quiz attempt is a real historical record of
-- student performance (score, pass/fail, when) — deleting a course should not silently destroy
-- that data too. Detaching it (lesson_id -> null) keeps it available for workspace-wide
-- reporting/analytics ("how many quizzes were taken last month") even after the lesson/course
-- it was taken against is gone. Requires lesson_id to become nullable, which it wasn't.

alter table quiz_attempts alter column lesson_id drop not null;

alter table quiz_attempts
  add constraint quiz_attempts_lesson_id_fkey
  foreign key (lesson_id) references course_lessons(id) on delete set null;
