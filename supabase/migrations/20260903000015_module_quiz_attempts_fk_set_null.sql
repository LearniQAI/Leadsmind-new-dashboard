-- Three Deferred Items, Item 1 (module_quiz_attempts half) — module_quiz_attempts.module_id
-- was built with ON DELETE CASCADE in the original Module-Level Quiz migration (matching a
-- default "clean up the child rows" instinct, same as module_quiz_questions/
-- module_quiz_settings — which correctly stay CASCADE, they're authored CONTENT with no
-- standalone value once their module is gone). A quiz ATTEMPT is different: it's a real
-- historical record of student performance. Same Item 1 decision as
-- quiz_attempts_lesson_fk_set_null.sql applies here too — SET NULL, not CASCADE, so deleting a
-- module doesn't silently destroy real attempt history. Confirmed live: 0 real
-- module_quiz_attempts rows exist right now, so there is nothing to backfill/remove first.

alter table module_quiz_attempts drop constraint module_quiz_attempts_module_id_fkey;

alter table module_quiz_attempts alter column module_id drop not null;

alter table module_quiz_attempts
  add constraint module_quiz_attempts_module_id_fkey
  foreign key (module_id) references course_modules(id) on delete set null;
