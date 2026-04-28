-- PHASE 15: WORKFLOW LOGIC ENGINE (ENROLLMENT RULES)

-- 1. Add enrollment_settings to workflows
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS enrollment_settings JSONB DEFAULT '{
    "max_concurrent": 1,
    "re_enrollment_delay_hours": 0,
    "allow_re_enrollment": true,
    "cancel_conflicting": false
}'::jsonb;

-- 2. Atomic Enrollment Procedure
-- Handles concurrency, re-enrollment logic, and conflict resolution
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

    -- 2. Check Re-enrollment Rule
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

    -- 3. Check Re-enrollment Delay
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

    -- 4. Handle Conflict Resolution (Cancel Conflicting)
    IF (v_settings->>'cancel_conflicting')::BOOLEAN THEN
        UPDATE public.workflow_executions 
        SET status = 'cancelled', completed_at = NOW()
        WHERE contact_id = p_contact_id 
        AND status = 'running'
        AND workflow_id != p_workflow_id;
    END IF;

    -- 5. Check Global Concurrency Limit per Contact
    SELECT COUNT(*) INTO v_active_count 
    FROM public.workflow_executions 
    WHERE contact_id = p_contact_id 
    AND status = 'running';

    IF v_active_count >= (v_settings->>'max_concurrent')::INT THEN
        -- Future expansion: Insert into a 'workflow_wait_queue' table here
        -- For now, we just skip to prevent infinite loops or spam
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
