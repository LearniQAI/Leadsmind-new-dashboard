-- Correction: PRD Phase C explicitly says assignment completion is marked by "the existing
-- grading flow" (i.e. when staff grades it 'passed'), not at submission time. 'submitted' was
-- the wrong name for that semantic — renamed to 'graded_passed' before any real block ever
-- used it (0 rows affected; this migration lands right after the one that introduced it).
alter table content_blocks drop constraint content_blocks_completion_rule_check;
alter table content_blocks add constraint content_blocks_completion_rule_check
  check (completion_rule in ('watched_threshold', 'opened', 'quiz_passed', 'graded_passed', 'none'));
