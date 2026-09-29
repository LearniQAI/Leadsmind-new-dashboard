-- LMS Phase 4: atomic module reorder. One function = one transaction: either every module's
-- position is rewritten or none is. Touches course_modules.position ONLY (never id, status,
-- lessons, quizzes or progress). Additive; nothing existing is altered.
--
-- p_items: [{"moduleId": "<uuid>", "order": 1}, ...]. Must be the COMPLETE set of the course's
-- modules with orders forming exactly 1..n, so a reorder can never leave duplicate or missing
-- positions. Every module must belong to p_course_id AND p_workspace_id or the whole call is rejected.
-- The (course_id, position) unique constraint is DEFERRABLE INITIALLY DEFERRED (Phase 1), so positions
-- can be swapped inside the transaction.

create or replace function public.reorder_course_modules(
  p_course_id uuid,
  p_workspace_id uuid,
  p_items jsonb
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_ids uuid[];
  v_ord int[];
  v_n int;
  v_total int;
  v_owned int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'REORDER_INVALID: items must be an array';
  end if;

  -- Serialise concurrent reorders / inserts of this course's modules.
  perform 1 from course_modules
    where course_id = p_course_id and workspace_id = p_workspace_id
    for update;
  if not found then
    raise exception 'REORDER_NOT_FOUND: course has no modules in this workspace';
  end if;

  select array_agg((i->>'moduleId')::uuid), array_agg((i->>'order')::int)
    into v_ids, v_ord
    from jsonb_array_elements(p_items) i;

  v_n := coalesce(cardinality(v_ids), 0);
  if v_n = 0 then
    raise exception 'REORDER_INVALID: items is empty';
  end if;
  if (select count(distinct x) from unnest(v_ids) x) <> v_n then
    raise exception 'REORDER_INVALID: duplicate moduleId in items';
  end if;
  if (select array_agg(o order by o) from unnest(v_ord) o) is distinct from (select array_agg(g order by g) from generate_series(1, v_n) g) then
    raise exception 'REORDER_INVALID: order values must be exactly 1..%', v_n;
  end if;

  select count(*) into v_owned from course_modules
    where id = any(v_ids) and course_id = p_course_id and workspace_id = p_workspace_id;
  if v_owned <> v_n then
    raise exception 'REORDER_FORBIDDEN: one or more modules do not belong to this course';
  end if;

  select count(*) into v_total from course_modules
    where course_id = p_course_id and workspace_id = p_workspace_id;
  if v_total <> v_n then
    raise exception 'REORDER_INVALID: items must include every module of the course (% of %)', v_n, v_total;
  end if;

  update course_modules m
     set position = t.ord
    from unnest(v_ids, v_ord) as t(id, ord)
   where m.id = t.id
     and m.course_id = p_course_id
     and m.workspace_id = p_workspace_id;

  return v_n;
end $$;

-- Called only by the server (service role) after the route has resolved the caller's workspace.
revoke all on function public.reorder_course_modules(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reorder_course_modules(uuid, uuid, jsonb) to service_role;
