-- Three Deferred Items, Item 3 — dropping the confirmed-dead legacy quiz cluster,
-- SCOPED to what a real dependency check found safe to remove now.
--
-- Confirmed dead (zero real code callers, zero real rows): lms_questions, lms_quiz_options,
-- lms_quiz_explanations, lms_quiz_submissions. Dropped here, in real dependency order
-- (children before parents, confirmed via a live constraint query).
--
-- lms_quizzes itself is DELIBERATELY NOT dropped in this migration. A first attempt at
-- dropping it failed live with a real, previously-unknown finding: three more tables
-- (lms_certificates, lms_adaptive_rules, lms_adaptive_rules_v2) hold a real FK into
-- lms_quizzes.id — none of which were named in the Item 3 audit scope, and none of which have
-- any real code reference or real row today either (checked live), but dropping lms_quizzes
-- now would require also dropping those three unscoped tables in the same breath, which is a
-- real, separate decision this task did not ask for. Left in place, reported explicitly as a
-- new finding for a deliberate follow-up decision rather than silently expanded into here.

drop table if exists lms_quiz_options;
drop table if exists lms_quiz_explanations;
drop table if exists lms_quiz_submissions;
drop table if exists lms_questions;
