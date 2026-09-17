-- Fix: no unique constraint on tasks(status, sort_order), and
-- updateTaskStatus (src/app/actions/tasks.ts) wrote the client's
-- destination.index straight into `sort_order` — same class of bug already
-- fixed for opportunities in 20260917030000_opportunity_position_resequence.sql.
-- destination.index is @hello-pangea/dnd's LOCAL rendered index at drag-end
-- (and computed over the client's already-filtered/sorted task list, not a
-- fresh read of the column's real order), so concurrent/rapid drags, or a
-- drag while a filter is active, can produce duplicate/out-of-order
-- sort_order values.
--
-- Root-cause fix, same pattern as move_opportunity_to_position: sort_order
-- is computed and written entirely inside this one atomic, workspace-checked
-- function. The client's dragged-to index is used only as an insertion-index
-- HINT into the real, freshly-read ordering of the destination status
-- column — never trusted as the literal value to store. Every call fully
-- re-sequences the destination status column (and the source column, if
-- different) to a contiguous 0..N run. `FOR UPDATE` on every row in both
-- columns serializes concurrent calls touching the same column(s).
--
-- tasks.status/priority are plain TEXT (not the task_status/task_priority
-- ENUMs defined in 20240101000080) — that migration's CREATE TABLE IF NOT
-- EXISTS was shadowed by an earlier, narrower tasks table (see
-- 20260723000000's header for the same shadowing bug class), so the enum
-- types exist but were never actually applied to the live columns.
-- p_target_status is typed TEXT here to match.
CREATE OR REPLACE FUNCTION public.move_task_to_position(
  p_workspace_id UUID,
  p_task_id UUID,
  p_target_status TEXT,
  p_target_index INT
) RETURNS VOID AS $$
DECLARE
  v_source_status TEXT;
  v_other_ids UUID[];
  v_other_count INT;
  v_clamped_index INT;
  v_final_ids UUID[];
  v_id UUID;
  v_pos INT;
BEGIN
  IF p_target_index IS NULL OR p_target_index < 0 THEN
    RAISE EXCEPTION 'target_index must be a non-negative integer';
  END IF;

  SELECT status INTO v_source_status
  FROM public.tasks
  WHERE id = p_task_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found in workspace %', p_task_id, p_workspace_id;
  END IF;

  -- Lock every row in both the source and target status columns so a
  -- second concurrent call into either column blocks until this
  -- transaction commits, then reads this call's fresh result instead of
  -- racing on a stale snapshot.
  PERFORM 1 FROM public.tasks
  WHERE workspace_id = p_workspace_id
    AND status = ANY(ARRAY[p_target_status, v_source_status]::TEXT[])
  FOR UPDATE;

  -- Move the task's status itself first (no-op if this is a same-column
  -- reorder).
  UPDATE public.tasks
  SET status = p_target_status,
      updated_at = now()
  WHERE id = p_task_id;

  -- Real current order of every OTHER task in the target status column,
  -- read fresh inside this transaction — never trusted from the client.
  SELECT array_agg(id ORDER BY sort_order, created_at)
  INTO v_other_ids
  FROM public.tasks
  WHERE workspace_id = p_workspace_id AND status = p_target_status AND id <> p_task_id;

  v_other_count := COALESCE(array_length(v_other_ids, 1), 0);
  v_clamped_index := LEAST(GREATEST(p_target_index, 0), v_other_count);

  IF v_other_count = 0 THEN
    v_final_ids := ARRAY[p_task_id];
  ELSE
    v_final_ids := v_other_ids[1:v_clamped_index] || ARRAY[p_task_id]::UUID[] || v_other_ids[v_clamped_index + 1 : v_other_count];
  END IF;

  v_pos := 0;
  FOREACH v_id IN ARRAY v_final_ids LOOP
    UPDATE public.tasks SET sort_order = v_pos WHERE id = v_id;
    v_pos := v_pos + 1;
  END LOOP;

  -- Cross-column move: re-sequence the source status column too so it
  -- doesn't keep a gap where the moved task used to sit.
  IF v_source_status IS DISTINCT FROM p_target_status THEN
    v_pos := 0;
    FOR v_id IN
      SELECT id FROM public.tasks
      WHERE workspace_id = p_workspace_id AND status = v_source_status
      ORDER BY sort_order, created_at
    LOOP
      UPDATE public.tasks SET sort_order = v_pos WHERE id = v_id;
      v_pos := v_pos + 1;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.move_task_to_position(UUID, UUID, TEXT, INT) TO authenticated;
