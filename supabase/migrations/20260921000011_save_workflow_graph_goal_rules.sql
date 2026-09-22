-- Exit-on-conversion: save_workflow_graph (see 20260921000009 for the full rationale: one
-- transaction, steps edited in place, running contacts remapped) now also writes
-- workflows.goal_rules when the caller supplies it, so a sequence's goals are saved atomically
-- with its steps. Only written when the key is present: callers that do not manage goals (the
-- generic /automations editor) leave existing goal_rules untouched.
--
-- p_fields: {name, description?, trigger_type, trigger_config?, goal_rules?, is_active}
-- p_steps : [{id?, position, type, config}]
-- p_edges : [{sourcePosition, targetPosition|null, handle}]
CREATE OR REPLACE FUNCTION public.save_workflow_graph(
    p_workflow_id uuid,
    p_workspace_id uuid,
    p_fields jsonb,
    p_steps jsonb,
    p_edges jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wf_id uuid;
    v_old_ids uuid[];
    v_old_types text[];
    v_old_pos int[];
    v_n_old int;
    v_n_in int;
    v_id_aware boolean := false;
    v_in_ids uuid[] := '{}';       -- resolved existing id per incoming step (NULL = new)
    v_keep uuid[] := '{}';         -- old ids that survive
    v_pos_ids jsonb := '{}'::jsonb; -- position -> step id
    v_step jsonb;
    v_req uuid;
    v_pos int;
    v_type text;
    v_resolved uuid;
    v_new_id uuid;
    i int; j int; k int;
    v_succ uuid;
    v_remapped int := 0;
    v_completed int := 0;
    v_cnt int;
BEGIN
    -- Serialise concurrent saves of the same workflow; enforce the workspace boundary.
    SELECT id INTO v_wf_id FROM public.workflows
    WHERE id = p_workflow_id AND workspace_id = p_workspace_id
    FOR UPDATE;
    IF v_wf_id IS NULL THEN
        RAISE EXCEPTION 'Workflow not found';
    END IF;

    UPDATE public.workflows
    SET name = p_fields->>'name',
        description = CASE WHEN p_fields ? 'description' THEN p_fields->>'description' ELSE description END,
        trigger_type = p_fields->>'trigger_type',
        trigger_config = CASE WHEN p_fields ? 'trigger_config' THEN p_fields->'trigger_config' ELSE trigger_config END,
        goal_rules = CASE WHEN p_fields ? 'goal_rules' THEN COALESCE(p_fields->'goal_rules', '[]'::jsonb) ELSE goal_rules END,
        is_active = COALESCE((p_fields->>'is_active')::boolean, is_active)
    WHERE id = p_workflow_id;

    -- Existing steps, in their OLD order (needed to find successors before positions change).
    SELECT COALESCE(array_agg(id ORDER BY position), '{}'),
           COALESCE(array_agg(type ORDER BY position), '{}'),
           COALESCE(array_agg(position ORDER BY position), '{}')
    INTO v_old_ids, v_old_types, v_old_pos
    FROM public.workflow_steps WHERE workflow_id = p_workflow_id;
    v_n_old := COALESCE(array_length(v_old_ids, 1), 0);
    v_n_in := COALESCE(jsonb_array_length(p_steps), 0);

    -- ── Match incoming steps to existing rows ───────────────────────────────────
    FOR i IN 0 .. v_n_in - 1 LOOP
        IF NULLIF(p_steps->i->>'id', '') IS NOT NULL THEN v_id_aware := true; END IF;
    END LOOP;

    FOR i IN 0 .. v_n_in - 1 LOOP
        v_step := p_steps->i;
        v_resolved := NULL;
        v_req := NULLIF(v_step->>'id', '')::uuid;
        IF v_req IS NOT NULL AND v_req = ANY(v_old_ids) AND NOT (v_req = ANY(v_keep)) THEN
            v_resolved := v_req;
        ELSIF NOT v_id_aware THEN
            -- Caller can't say which step is which: same position AND same type is the same step.
            FOR j IN 1 .. v_n_old LOOP
                IF v_old_pos[j] = (v_step->>'position')::int
                   AND v_old_types[j] = v_step->>'type'
                   AND NOT (v_old_ids[j] = ANY(v_keep)) THEN
                    v_resolved := v_old_ids[j];
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        v_in_ids := array_append(v_in_ids, v_resolved);   -- NULL keeps array length aligned
        IF v_resolved IS NOT NULL THEN v_keep := array_append(v_keep, v_resolved); END IF;
    END LOOP;

    -- ── Executions sitting on a step that is going away: move them, don't drop them ──
    FOR k IN 1 .. v_n_old LOOP
        IF v_old_ids[k] = ANY(v_keep) THEN CONTINUE; END IF;
        v_succ := NULL;
        FOR j IN k + 1 .. v_n_old LOOP
            IF v_old_ids[j] = ANY(v_keep) THEN v_succ := v_old_ids[j]; EXIT; END IF;
        END LOOP;

        IF v_succ IS NOT NULL THEN
            UPDATE public.workflow_executions
            SET current_step_id = v_succ,
                next_attempt_at = NULL,
                updated_at = NOW(),
                context = (COALESCE(context, '{}'::jsonb) - 'resume_at' - 'held_until')
                          || jsonb_build_object('remapped_from_step', v_old_ids[k], 'remapped_at', NOW())
            WHERE workflow_id = p_workflow_id AND status = 'running' AND current_step_id = v_old_ids[k];
            GET DIAGNOSTICS v_cnt = ROW_COUNT;
            v_remapped := v_remapped + v_cnt;
        ELSE
            -- Nothing after it any more: the sequence is over for these contacts. Recorded, not silent.
            UPDATE public.workflow_executions
            SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
                current_step_id = NULL, next_attempt_at = NULL,
                context = COALESCE(context, '{}'::jsonb)
                          || jsonb_build_object('termination_reason', 'steps_removed', 'removed_step', v_old_ids[k])
            WHERE workflow_id = p_workflow_id AND status = 'running' AND current_step_id = v_old_ids[k];
            GET DIAGNOSTICS v_cnt = ROW_COUNT;
            v_completed := v_completed + v_cnt;
        END IF;
    END LOOP;

    -- ── Apply: edges out, steps updated/inserted/deleted, edges back in ──────────
    DELETE FROM public.workflow_edges WHERE workflow_id = p_workflow_id;

    FOR i IN 0 .. v_n_in - 1 LOOP
        v_step := p_steps->i;
        v_pos := (v_step->>'position')::int;
        v_type := v_step->>'type';
        IF v_in_ids[i + 1] IS NOT NULL THEN
            UPDATE public.workflow_steps
            SET position = v_pos, type = v_type, config = COALESCE(v_step->'config', '{}'::jsonb)
            WHERE id = v_in_ids[i + 1] AND workflow_id = p_workflow_id
            RETURNING id INTO v_new_id;
        ELSE
            INSERT INTO public.workflow_steps (workflow_id, workspace_id, position, type, config)
            VALUES (p_workflow_id, p_workspace_id, v_pos, v_type, COALESCE(v_step->'config', '{}'::jsonb))
            RETURNING id INTO v_new_id;
        END IF;
        v_pos_ids := v_pos_ids || jsonb_build_object(v_pos::text, v_new_id);
    END LOOP;

    DELETE FROM public.workflow_steps
    WHERE workflow_id = p_workflow_id AND NOT (id = ANY(v_keep))
      AND id = ANY(v_old_ids);

    FOR i IN 0 .. COALESCE(jsonb_array_length(p_edges), 0) - 1 LOOP
        INSERT INTO public.workflow_edges (workflow_id, workspace_id, source_step_id, target_step_id, source_handle)
        VALUES (
            p_workflow_id, p_workspace_id,
            (v_pos_ids->>((p_edges->i->>'sourcePosition')))::uuid,
            CASE WHEN p_edges->i->>'targetPosition' IS NULL THEN NULL
                 ELSE (v_pos_ids->>((p_edges->i->>'targetPosition')))::uuid END,
            COALESCE(p_edges->i->>'handle', 'next')
        );
    END LOOP;

    RETURN jsonb_build_object('remapped', v_remapped, 'completed', v_completed);
END;
$$;

REVOKE ALL ON FUNCTION public.save_workflow_graph(uuid, uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workflow_graph(uuid, uuid, jsonb, jsonb, jsonb) TO authenticated, service_role;
