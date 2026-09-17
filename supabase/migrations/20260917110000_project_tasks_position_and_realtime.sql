-- Wires up Projects' previously-dead scaffolding (see crm-projects-audit): adds the same
-- collision-safe position RPC pattern already used by Pipelines
-- (move_opportunity_to_position) and Tasks (move_task_to_position) so project_tasks.position
-- finally means something once a real Kanban board writes to it, and adds projects/
-- project_tasks to the supabase_realtime publication (previously missing entirely).

CREATE OR REPLACE FUNCTION public.move_project_task_to_position(
  p_workspace_id UUID,
  p_task_id UUID,
  p_target_status TEXT,
  p_target_index INT
) RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
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

  SELECT project_id, status INTO v_project_id, v_source_status
  FROM public.project_tasks
  WHERE id = p_task_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project task % not found in workspace %', p_task_id, p_workspace_id;
  END IF;

  -- Lock every row in both the source and target status buckets, scoped to the same
  -- project (a Kanban board reorders tasks within one project, not across projects).
  PERFORM 1 FROM public.project_tasks
  WHERE workspace_id = p_workspace_id
    AND project_id = v_project_id
    AND status = ANY(ARRAY[p_target_status, v_source_status]::TEXT[])
  FOR UPDATE;

  UPDATE public.project_tasks
  SET status = p_target_status
  WHERE id = p_task_id;

  SELECT array_agg(id ORDER BY position, created_at)
  INTO v_other_ids
  FROM public.project_tasks
  WHERE workspace_id = p_workspace_id AND project_id = v_project_id AND status = p_target_status AND id <> p_task_id;

  v_other_count := COALESCE(array_length(v_other_ids, 1), 0);
  v_clamped_index := LEAST(GREATEST(p_target_index, 0), v_other_count);

  IF v_other_count = 0 THEN
    v_final_ids := ARRAY[p_task_id];
  ELSE
    v_final_ids := v_other_ids[1:v_clamped_index] || ARRAY[p_task_id]::UUID[] || v_other_ids[v_clamped_index + 1 : v_other_count];
  END IF;

  v_pos := 0;
  FOREACH v_id IN ARRAY v_final_ids LOOP
    UPDATE public.project_tasks SET position = v_pos WHERE id = v_id;
    v_pos := v_pos + 1;
  END LOOP;

  IF v_source_status IS DISTINCT FROM p_target_status THEN
    v_pos := 0;
    FOR v_id IN
      SELECT id FROM public.project_tasks
      WHERE workspace_id = p_workspace_id AND project_id = v_project_id AND status = v_source_status
      ORDER BY position, created_at
    LOOP
      UPDATE public.project_tasks SET position = v_pos WHERE id = v_id;
      v_pos := v_pos + 1;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.move_project_task_to_position(UUID, UUID, TEXT, INT) TO authenticated;

ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_tasks'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
