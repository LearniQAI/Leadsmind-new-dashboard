-- Batch 2 (Missing Quiz Question Types) — Step 1 storage decision.
--
-- Audit finding this closes: the admin quiz builder (QuizWorkbenchClient) already has
-- authoring UI for all 8 question_type values and POSTs a `metadata` object carrying the
-- per-type answer key / presentation config for matching / ordering / fill_blank / code /
-- file_upload — but neither /api/lms/quiz/questions nor /api/lms/module-quiz/questions ever
-- persisted `metadata` (they only wrote options/correct_answer/explanation/points/position),
-- and there was no `metadata` column to persist it into. So a matching/ordering/etc. question
-- saved fine, stored options:[] + correct_answer:{}, and was ungradeable. Confirmed live
-- 2026-09-02: 0 rows of any of the 5 types in either table, so no existing data to migrate.
--
-- Decision: a dedicated `metadata jsonb` column (NOT folding the key into `correct_answer`)
--   - `correct_answer` is already shipped to the browser for the 3 existing types (the client
--     does an optimistic preview grade); keeping the new types' full answer key in a SEPARATE
--     column lets the page strip `metadata` before the questions reach StudentQuizClient, so
--     matching pairs / correct order / accepted code solutions never leave the server.
--   - matches the field name the admin builder already uses (`metadata.pairs`,
--     `metadata.items`, `metadata.text_with_blanks`, ...), so the builder needs no reshaping,
--     only the two API routes start persisting the field.
--
-- Canonical per-type shape stored here (see src/lib/lms/quizGrading.ts):
--   matching:    { pairs: [{left, right}, ...] }
--   ordering:    { items: [...] }                       -- in the CORRECT order
--   fill_blank:  { text_with_blanks, blanks: [{accepted: [...]}, ...], case_sensitive? }
--   code:        { starter_template, accepted_solutions: [...], match_mode: 'normalized' }
--   file_upload: { rubric_criteria: [{criteria, max_points}, ...] }  -- manual review
--   mcq/true_false/short_answer: unused (their key stays in options/correct_answer, unchanged)

alter table public.quiz_questions        add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.module_quiz_questions add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.quiz_questions.metadata is
  'Per-type answer key + presentation config for matching/ordering/fill_blank/code/file_upload. Server-only — stripped before questions reach the student client. mcq/true_false/short_answer do not use it.';
comment on column public.module_quiz_questions.metadata is
  'See quiz_questions.metadata — identical shape, module-scoped.';
