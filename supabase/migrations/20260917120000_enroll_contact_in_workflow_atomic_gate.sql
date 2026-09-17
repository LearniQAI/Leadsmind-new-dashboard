-- Fix: enroll_contact_in_workflow's max_concurrent gate (fixed for scoping
-- in 20260801000003) was still a non-atomic check-then-insert -- the COUNT
-- and the subsequent INSERT are two separate statements with no lock or
-- constraint between them, so two calls racing for the same
-- (workflow_id, contact_id) pair can both read the same v_active_count,
-- both pass the `< v_max_concurrent` check, and both insert a 'running'
-- execution -- exceeding max_concurrent (default/only-ever-used value: 1).
-- Same class of TOCTOU bug already found and fixed once in this project
-- for the AI-credit counter (20260706000003_atomic_operations.sql,
-- deduct_ai_credit) -- except that fix could use a single atomic
-- UPDATE...WHERE because it's a plain counter increment. This function
-- instead needs to count existing rows and conditionally insert a NEW row,
-- which a single UPDATE can't express, so the atomic primitive here is a
-- transaction-scoped advisory lock keyed on (workflow_id, contact_id):
-- pg_advisory_xact_lock blocks a second concurrent call for the same pair
-- until the first one's transaction (this RPC call) commits or rolls back,
-- turning the whole read-then-write section back into a single atomic
-- unit. It also closes the same latent race in the re-enrollment and
-- cancel-conflicting checks above it, which shared the identical
-- check-then-act shape.
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
    -- Serialize every call for this exact (workflow, contact) pair for the
    -- rest of this transaction. A second concurrent call for the same pair
    -- blocks here until the first call's INSERT (or early RETURN) has
    -- committed, so the COUNT below always reflects any execution the
    -- first call just created -- no more racing reads of stale counts.
    -- Different (workflow, contact) pairs use different lock keys and never
    -- contend with each other.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_workflow_id::text || ':' || p_contact_id::text, 0));

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

    -- 5. Check Concurrency Limit -- scoped to THIS workflow + contact, and
    -- now race-free: the advisory lock above guarantees no other call for
    -- this same pair can be between its own COUNT and INSERT right now.
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
