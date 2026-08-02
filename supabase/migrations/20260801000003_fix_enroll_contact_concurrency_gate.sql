-- Fix: enroll_contact_in_workflow's concurrency gate counted ANY running
-- workflow execution for a contact (v_active_count summed across every
-- workflow_id), not just running executions of the workflow being
-- enrolled into. Every workflow's enrollment_settings defaults to
-- max_concurrent: 1 (no UI anywhere lets an admin change it -- confirmed
-- by search, only this RPC ever reads the column), so a contact with any
-- one automation currently running silently lost every OTHER, unrelated
-- automation triggered for them during that window -- product-wide, for
-- every trigger type, not LMS-specific. Reproduced live: course
-- completion firing lesson_completed + module_completed + course_completed
-- together for one contact only ever enrolled lesson_completed; the other
-- two RPC calls returned NULL with no error.
--
-- The RPC's own comment admitted the queue path was never built ("For
-- now, we just skip"), and confirmed live: 0 rows ever existed in
-- workflow_enrollment_queue and 0 workflow_executions rows existed in
-- the live DB prior to this fix -- this bug has been silently dropping
-- 100% of colliding enrollments since inception with zero trace.
--
-- Audited before fixing: the only real loop-protection mechanism in this
-- codebase is MAX_WORKFLOW_STEP_DEPTH in src/lib/automation/executor.ts
-- (caps a single execution's edge-chain depth at 15), which is
-- independent of this RPC and untouched by this migration. Nothing else
-- in the app reads enrollment_settings or depends on the global-drop
-- behavior as a safety net (single call site: executor.ts
-- startWorkflowExecution).
--
-- Fix: scope the concurrency count to (contact_id, workflow_id) -- "max
-- concurrent" now means "max concurrent runs of THIS workflow for this
-- contact" (i.e. still blocks a contact re-triggering the very same
-- workflow while one is already running for them), not "max concurrent
-- runs of ANYTHING". Independent workflows triggered for the same
-- contact no longer contend with each other.
--
-- Also: a declined enrollment is no longer silent. It now inserts a
-- terminal workflow_executions row with status
-- 'skipped_concurrency_limit' and a descriptive error_message, so it is
-- visible in automation history / execution logs instead of vanishing
-- without a trace.
CREATE OR REPLACE FUNCTION public.enroll_contact_in_workflow(
    p_workspace_id UUID,
    p_workflow_id UUID,
    p_contact_id UUID
) RETURNS UUID AS $$
DECLARE
    v_settings JSONB;
    v_active_count INT;
    v_last_completion TIMESTAMPTZ;
    v_new_execution_id UUID;
    v_first_step_id UUID;
    v_max_concurrent INT;
BEGIN
    -- 1. Fetch Workflow Settings and First Step
    SELECT enrollment_settings INTO v_settings
    FROM public.workflows
    WHERE id = p_workflow_id;

    SELECT id INTO v_first_step_id
    FROM public.workflow_steps
    WHERE workflow_id = p_workflow_id
    ORDER BY position ASC
    LIMIT 1;

    IF v_first_step_id IS NULL THEN
        RAISE EXCEPTION 'Workflow has no steps.';
    END IF;

    -- 2. Check Re-enrollment Rule (unchanged -- already scoped per-workflow)
    IF NOT (v_settings->>'allow_re_enrollment')::BOOLEAN THEN
        IF EXISTS (
            SELECT 1 FROM public.workflow_executions
            WHERE workflow_id = p_workflow_id
            AND contact_id = p_contact_id
            AND status = 'running'
        ) THEN
            RETURN NULL; -- Already enrolled and running
        END IF;
    END IF;

    -- 3. Check Re-enrollment Delay (unchanged -- already scoped per-workflow)
    IF (v_settings->>'re_enrollment_delay_hours')::INT > 0 THEN
        SELECT completed_at INTO v_last_completion
        FROM public.workflow_executions
        WHERE workflow_id = p_workflow_id
        AND contact_id = p_contact_id
        AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1;

        IF v_last_completion IS NOT NULL AND
           v_last_completion + ((v_settings->>'re_enrollment_delay_hours')::INT * INTERVAL '1 hour') > NOW() THEN
            RETURN NULL; -- Too soon to re-enroll
        END IF;
    END IF;

    -- 4. Handle Conflict Resolution (Cancel Conflicting) -- unchanged,
    -- still an explicit opt-in per-workflow setting (default false) that
    -- intentionally cancels OTHER running workflows for this contact.
    IF (v_settings->>'cancel_conflicting')::BOOLEAN THEN
        UPDATE public.workflow_executions
        SET status = 'cancelled', completed_at = NOW()
        WHERE contact_id = p_contact_id
        AND status = 'running'
        AND workflow_id != p_workflow_id;
    END IF;

    -- 5. Check Concurrency Limit -- scoped to THIS workflow + contact
    -- (was: every workflow the contact happens to be running, product-wide).
    v_max_concurrent := (v_settings->>'max_concurrent')::INT;

    SELECT COUNT(*) INTO v_active_count
    FROM public.workflow_executions
    WHERE contact_id = p_contact_id
    AND workflow_id = p_workflow_id
    AND status = 'running';

    IF v_active_count >= v_max_concurrent THEN
        -- Declined enrollments are recorded, not dropped.
        INSERT INTO public.workflow_executions (
            workspace_id, workflow_id, contact_id, status,
            current_step_id, started_at, completed_at, error_message
        ) VALUES (
            p_workspace_id, p_workflow_id, p_contact_id,
            'skipped_concurrency_limit', v_first_step_id, NOW(), NOW(),
            'Declined: ' || v_active_count || ' execution(s) of this workflow already running for this contact (max_concurrent=' || v_max_concurrent || ')'
        );
        RETURN NULL;
    END IF;

    -- 6. All checks passed: Create the Execution
    INSERT INTO public.workflow_executions (
        workspace_id,
        workflow_id,
        contact_id,
        status,
        current_step_id
    ) VALUES (
        p_workspace_id,
        p_workflow_id,
        p_contact_id,
        'running',
        v_first_step_id
    ) RETURNING id INTO v_new_execution_id;

    RETURN v_new_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
