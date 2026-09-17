-- Fix: no unique constraint on opportunities(stage_id, position), and
-- updateDealStage (src/app/actions/pipelines.ts) wrote the client's
-- destination.index straight into `position` — confirmed live that two
-- deals can end up with identical stage_id+position, since destination.index
-- is the drag library's LOCAL rendered index at drag-end, not a value
-- computed from the database's actual current state. Concurrent/rapid drags
-- can produce colliding or inconsistent ordering.
--
-- Root-cause fix (not a unique constraint + catch-and-retry): position is
-- now computed and written entirely inside this one atomic, workspace-
-- checked function. The client's dragged-to index is still used, but only
-- as an insertion-index HINT into the real, freshly-read ordering of the
-- destination stage — never trusted as the literal value to store. Every
-- call fully re-sequences the destination stage (and the source stage, if
-- different) to a contiguous 0..N run, so the result can never contain a
-- duplicate position by construction, regardless of what the input looked
-- like. `FOR UPDATE` on every row in both stages serializes concurrent
-- calls touching the same stage(s) instead of letting them race on a
-- stale read.
--
-- This is a separate RPC from update_stage_positions (which reorders
-- pipeline_stages themselves, not opportunities within a stage) —
-- that function is untouched by this migration.
CREATE OR REPLACE FUNCTION public.move_opportunity_to_position(
  p_workspace_id UUID,
  p_deal_id UUID,
  p_target_stage_id UUID,
  p_target_index INT
) RETURNS VOID AS $$
DECLARE
  v_source_stage_id UUID;
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

  SELECT stage_id INTO v_source_stage_id
  FROM public.opportunities
  WHERE id = p_deal_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal % not found in workspace %', p_deal_id, p_workspace_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages
    WHERE id = p_target_stage_id AND workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'Target stage % does not belong to workspace %', p_target_stage_id, p_workspace_id;
  END IF;

  -- Lock every row in both the source and target stage so a second
  -- concurrent call into either stage blocks until this transaction
  -- commits, then reads this call's fresh result instead of racing on a
  -- stale snapshot.
  PERFORM 1 FROM public.opportunities
  WHERE workspace_id = p_workspace_id
    AND stage_id = ANY(ARRAY[p_target_stage_id, v_source_stage_id]::UUID[])
  FOR UPDATE;

  -- Move the deal's stage_id itself first (no-op if this is a same-stage
  -- reorder — stage_entered_at only bumps on a real stage change).
  UPDATE public.opportunities
  SET stage_id = p_target_stage_id,
      stage_entered_at = CASE WHEN v_source_stage_id IS DISTINCT FROM p_target_stage_id THEN now() ELSE stage_entered_at END,
      updated_at = now()
  WHERE id = p_deal_id;

  -- Real current order of every OTHER deal in the target stage, read fresh
  -- inside this transaction — never trusted from the client.
  SELECT array_agg(id ORDER BY position, created_at)
  INTO v_other_ids
  FROM public.opportunities
  WHERE workspace_id = p_workspace_id AND stage_id = p_target_stage_id AND id <> p_deal_id;

  v_other_count := COALESCE(array_length(v_other_ids, 1), 0);
  v_clamped_index := LEAST(GREATEST(p_target_index, 0), v_other_count);

  IF v_other_count = 0 THEN
    v_final_ids := ARRAY[p_deal_id];
  ELSE
    v_final_ids := v_other_ids[1:v_clamped_index] || ARRAY[p_deal_id]::UUID[] || v_other_ids[v_clamped_index + 1 : v_other_count];
  END IF;

  v_pos := 0;
  FOREACH v_id IN ARRAY v_final_ids LOOP
    UPDATE public.opportunities SET position = v_pos WHERE id = v_id;
    v_pos := v_pos + 1;
  END LOOP;

  -- Cross-stage move: re-sequence the source stage too so it doesn't keep
  -- a gap where the moved deal used to sit. Cosmetic (position ASC still
  -- orders correctly with a gap) but keeps positions contiguous, matching
  -- what every other write path in this table already assumes.
  IF v_source_stage_id IS DISTINCT FROM p_target_stage_id THEN
    v_pos := 0;
    FOR v_id IN
      SELECT id FROM public.opportunities
      WHERE workspace_id = p_workspace_id AND stage_id = v_source_stage_id
      ORDER BY position, created_at
    LOOP
      UPDATE public.opportunities SET position = v_pos WHERE id = v_id;
      v_pos := v_pos + 1;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.move_opportunity_to_position(UUID, UUID, UUID, INT) TO authenticated;
