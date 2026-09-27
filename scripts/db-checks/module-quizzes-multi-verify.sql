-- Read-only check to run right after applying 20260930000015_module_quizzes_multi.sql.
-- Compares the live module-quiz tables with the _bak_*_20260927 snapshots (every column the
-- migration did not add) and checks the new quiz_id links. Every row should read ok = true.
--   supabase db query --linked -f scripts/db-checks/module-quizzes-multi-verify.sql
-- If content changed on prod between the snapshot and the apply, the *_content_unchanged rows
-- will be false for that legitimate reason; re-snapshot right before applying to avoid that.

with
q_live as (select md5(coalesce(string_agg(row(id,module_id,workspace_id,question_type,question_text,options,correct_answer,explanation,points,position,created_at,metadata)::text, '|' order by id), '')) h from public.module_quiz_questions),
q_bak  as (select md5(coalesce(string_agg(row(id,module_id,workspace_id,question_type,question_text,options,correct_answer,explanation,points,position,created_at,metadata)::text, '|' order by id), '')) h from public._bak_module_quiz_questions_20260927),
s_live as (select md5(coalesce(string_agg(row(id,module_id,time_limit_minutes,max_attempts,pass_percentage,show_answers_after,randomize_questions,publish_status,scheduled_at,created_at)::text, '|' order by id), '')) h from public.module_quiz_settings),
s_bak  as (select md5(coalesce(string_agg(row(id,module_id,time_limit_minutes,max_attempts,pass_percentage,show_answers_after,randomize_questions,publish_status,scheduled_at,created_at)::text, '|' order by id), '')) h from public._bak_module_quiz_settings_20260927),
a_live as (select md5(coalesce(string_agg(row(id,module_id,student_id,answers,score,passed,grade_status)::text, '|' order by id), '')) h from public.module_quiz_attempts),
a_bak  as (select md5(coalesce(string_agg(row(id,module_id,student_id,answers,score,passed,grade_status)::text, '|' order by id), '')) h from public._bak_module_quiz_attempts_20260927)
select 'questions_content_unchanged' as check, (select h from q_live) = (select h from q_bak) as ok
union all select 'settings_content_unchanged', (select h from s_live) = (select h from s_bak)
union all select 'attempts_content_unchanged', (select h from a_live) = (select h from a_bak)
union all select 'every_question_has_a_quiz', not exists (select 1 from public.module_quiz_questions where quiz_id is null)
union all select 'every_settings_row_has_a_quiz', not exists (select 1 from public.module_quiz_settings where quiz_id is null)
union all select 'one_quiz_per_previously_quizzed_module',
  (select count(*) from public.module_quizzes) = (select count(*) from (
    select module_id from public._bak_module_quiz_settings_20260927
    union select module_id from public._bak_module_quiz_questions_20260927
    union select module_id from public._bak_module_quiz_attempts_20260927 where module_id is not null) m)
union all select 'backfilled_quizzes_published', not exists (
  select 1 from public.module_quizzes
  where status <> 'published'
    and module_id in (select module_id from public._bak_module_quiz_questions_20260927
                      union select module_id from public._bak_module_quiz_settings_20260927));
