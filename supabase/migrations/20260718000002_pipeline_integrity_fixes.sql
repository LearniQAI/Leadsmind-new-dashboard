-- Migration: Pipeline Management Integrity Fixes
-- Addresses: missing update_stage_positions RPC (workspace-checked + atomic),
-- open anonymous read on conveyancing_shares, missing composite index for
-- drag-and-drop column rendering, and duplicate stage-name data corruption.

-- 1. Missing RPC: update_stage_positions
-- Verifies every incoming stage_id belongs to p_workspace_id BEFORE writing
-- anything, then applies all position writes inside this function's own
-- implicit transaction (a single RPC call is one transaction), so a bulk
-- reorder can no longer leave positions partially applied.
CREATE OR REPLACE FUNCTION public.update_stage_positions(
  p_workspace_id UUID,
  p_stage_ids UUID[],
  p_positions INT[]
) RETURNS VOID AS $$
DECLARE
  v_matched_count INT;
  i INT;
BEGIN
  IF p_stage_ids IS NULL OR p_positions IS NULL THEN
    RAISE EXCEPTION 'stage_ids and positions are required';
  END IF;

  IF array_length(p_stage_ids, 1) IS DISTINCT FROM array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'stage_ids and positions arrays must be the same length';
  END IF;

  -- Cross-tenant guard: every stage must belong to the caller's workspace.
  SELECT count(*) INTO v_matched_count
  FROM public.pipeline_stages
  WHERE id = ANY(p_stage_ids) AND workspace_id = p_workspace_id;

  IF v_matched_count IS DISTINCT FROM array_length(p_stage_ids, 1) THEN
    RAISE EXCEPTION 'One or more stage IDs do not belong to workspace %', p_workspace_id;
  END IF;

  FOR i IN 1 .. array_length(p_stage_ids, 1) LOOP
    UPDATE public.pipeline_stages
    SET position = p_positions[i]
    WHERE id = p_stage_ids[i] AND workspace_id = p_workspace_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_stage_positions(UUID, UUID[], INT[]) TO authenticated;

-- 2. Close the open anonymous read on conveyancing_shares.
-- The only legitimate public/token-based reader (getConveyancingShareByToken
-- in src/app/actions/propertyDeals.ts) already goes through createAdminClient(),
-- which bypasses RLS entirely — so this anon policy was pure excess exposure,
-- letting any anon-key holder list every workspace's conveyancing shares.
DROP POLICY IF EXISTS "anonymous select conveyancing_shares" ON public.conveyancing_shares;

CREATE POLICY "workspace members select conveyancing_shares"
  ON public.conveyancing_shares FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR opportunity_id IN (
      SELECT o.id FROM public.opportunities o
      WHERE o.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
  );

-- 3. Composite index for drag-and-drop column rendering
-- (ordering deals within a stage was previously an index scan + filesort).
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_position
  ON public.opportunities(stage_id, position ASC);

-- 4. Enforce stage-name uniqueness per pipeline.
-- Dedupe any pre-existing collisions first so the constraint can be added
-- without failing against live data.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT id, name,
           ROW_NUMBER() OVER (PARTITION BY pipeline_id, name ORDER BY position, created_at, id) AS rn
    FROM public.pipeline_stages
  ) LOOP
    IF r.rn > 1 THEN
      UPDATE public.pipeline_stages
      SET name = r.name || ' (' || r.rn || ')'
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.pipeline_stages
  DROP CONSTRAINT IF EXISTS pipeline_stages_pipeline_id_name_key;

ALTER TABLE public.pipeline_stages
  ADD CONSTRAINT pipeline_stages_pipeline_id_name_key UNIQUE (pipeline_id, name);
