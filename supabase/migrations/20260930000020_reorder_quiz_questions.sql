-- Quiz Editor: atomic question reorder (one function = one transaction: every position is rewritten or none).
-- Rewrites `position` ONLY (0-based, in the order given). p_ids must be the COMPLETE set of the quiz's questions,
-- each once, all belonging to the quiz AND workspace, or the whole call is rejected and nothing changes.
-- Additive; nothing existing is altered. Service role only (the route resolves the caller's workspace first).

create or replace function public.reorder_module_quiz_questions(p_quiz_id uuid, p_workspace_id uuid, p_ids uuid[])
returns integer language plpgsql set search_path = public as $$
declare v_n int; v_owned int; v_total int;
begin
  v_n := coalesce(cardinality(p_ids), 0);
  if v_n = 0 then raise exception 'REORDER_INVALID: ids is empty'; end if;
  if (select count(distinct x) from unnest(p_ids) x) <> v_n then raise exception 'REORDER_INVALID: duplicate id'; end if;

  perform 1 from module_quiz_questions where quiz_id = p_quiz_id and workspace_id = p_workspace_id for update;
  if not found then raise exception 'REORDER_NOT_FOUND: quiz has no questions in this workspace'; end if;

  select count(*) into v_owned from module_quiz_questions
    where id = any(p_ids) and quiz_id = p_quiz_id and workspace_id = p_workspace_id;
  if v_owned <> v_n then raise exception 'REORDER_FORBIDDEN: one or more questions do not belong to this quiz'; end if;

  select count(*) into v_total from module_quiz_questions where quiz_id = p_quiz_id and workspace_id = p_workspace_id;
  if v_total <> v_n then raise exception 'REORDER_INVALID: ids must include every question of the quiz (% of %)', v_n, v_total; end if;

  update module_quiz_questions q set position = t.ord - 1
    from unnest(p_ids) with ordinality as t(id, ord)
   where q.id = t.id and q.quiz_id = p_quiz_id and q.workspace_id = p_workspace_id;
  return v_n;
end $$;

create or replace function public.reorder_lesson_quiz_questions(p_lesson_id uuid, p_workspace_id uuid, p_ids uuid[])
returns integer language plpgsql set search_path = public as $$
declare v_n int; v_owned int; v_total int;
begin
  v_n := coalesce(cardinality(p_ids), 0);
  if v_n = 0 then raise exception 'REORDER_INVALID: ids is empty'; end if;
  if (select count(distinct x) from unnest(p_ids) x) <> v_n then raise exception 'REORDER_INVALID: duplicate id'; end if;

  perform 1 from quiz_questions where lesson_id = p_lesson_id and workspace_id = p_workspace_id for update;
  if not found then raise exception 'REORDER_NOT_FOUND: quiz has no questions in this workspace'; end if;

  select count(*) into v_owned from quiz_questions
    where id = any(p_ids) and lesson_id = p_lesson_id and workspace_id = p_workspace_id;
  if v_owned <> v_n then raise exception 'REORDER_FORBIDDEN: one or more questions do not belong to this quiz'; end if;

  select count(*) into v_total from quiz_questions where lesson_id = p_lesson_id and workspace_id = p_workspace_id;
  if v_total <> v_n then raise exception 'REORDER_INVALID: ids must include every question of the quiz (% of %)', v_n, v_total; end if;

  update quiz_questions q set position = t.ord - 1
    from unnest(p_ids) with ordinality as t(id, ord)
   where q.id = t.id and q.lesson_id = p_lesson_id and q.workspace_id = p_workspace_id;
  return v_n;
end $$;

revoke all on function public.reorder_module_quiz_questions(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_lesson_quiz_questions(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_module_quiz_questions(uuid, uuid, uuid[]) to service_role;
grant execute on function public.reorder_lesson_quiz_questions(uuid, uuid, uuid[]) to service_role;
