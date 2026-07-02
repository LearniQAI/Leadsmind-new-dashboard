-- PHASE 13: ENROLLMENT CONTROLS & LEAD SCORING

-- 1. EXTEND TABLES
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS lead_grade TEXT;

ALTER TABLE public.workflows 
  ADD COLUMN IF NOT EXISTS enrollment_settings JSONB DEFAULT '{
    "max_concurrent": 1,
    "re_enrollment_delay_hours": 0,
    "allow_re_enrollment": true,
    "cancel_conflicting": false
  }';

-- 2. ENROLLMENT QUEUE
CREATE TABLE IF NOT EXISTS public.workflow_enrollment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure index for fast lookup during promotion
CREATE INDEX IF NOT EXISTS idx_workflow_queue_contact ON public.workflow_enrollment_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_created ON public.workflow_enrollment_queue(created_at);

-- 3. STORED PROCEDURE: ENROLL CONTACT
-- Atomically handles concurrency and re-enrollment rules
CREATE OR REPLACE FUNCTION public.enroll_contact_in_workflow(
    p_workspace_id UUID,
    p_workflow_id UUID,
    p_contact_id UUID
) RETURNS UUID AS $$
DECLARE
    v_enrollment_settings JSONB;
    v_active_count INTEGER;
    v_last_execution_at TIMESTAMPTZ;
    v_max_concurrent INTEGER;
    v_re_enrollment_delay_hours INTEGER;
    v_allow_re_enrollment BOOLEAN;
    v_cancel_conflicting BOOLEAN;
    v_execution_id UUID;
    v_step1_id UUID;
BEGIN
    -- 1. Fetch Workflow Settings
    SELECT enrollment_settings INTO v_enrollment_settings
    FROM public.workflows WHERE id = p_workflow_id;

    v_max_concurrent := (v_enrollment_settings->>'max_concurrent')::INTEGER;
    v_re_enrollment_delay_hours := (v_enrollment_settings->>'re_enrollment_delay_hours')::INTEGER;
    v_allow_re_enrollment := (v_enrollment_settings->>'allow_re_enrollment')::BOOLEAN;
    v_cancel_conflicting := (v_enrollment_settings->>'cancel_conflicting')::BOOLEAN;

    -- 2. Check for existing active execution of THIS workflow
    IF EXISTS (
        SELECT 1 FROM public.workflow_executions 
        WHERE workflow_id = p_workflow_id AND contact_id = p_contact_id AND status = 'running'
    ) THEN
        RETURN NULL; -- Already running
    END IF;

    -- 3. Check Re-enrollment Rules
    SELECT completed_at INTO v_last_execution_at
    FROM public.workflow_executions
    WHERE workflow_id = p_workflow_id AND contact_id = p_contact_id
    ORDER BY completed_at DESC LIMIT 1;

    IF v_last_execution_at IS NOT NULL THEN
        IF NOT v_allow_re_enrollment THEN RETURN NULL; END IF;
        IF (now() < v_last_execution_at + (v_re_enrollment_delay_hours || ' hours')::INTERVAL) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- 4. Conflicting Workflow Cancellation
    IF v_cancel_conflicting THEN
        UPDATE public.workflow_executions
        SET status = 'cancelled', updated_at = now()
        WHERE contact_id = p_contact_id AND status = 'running' AND workflow_id != p_workflow_id;
    END IF;

    -- 5. Check Global Concurrency (how many workflows is this contact in right now?)
    SELECT count(*) INTO v_active_count
    FROM public.workflow_executions
    WHERE contact_id = p_contact_id AND status = 'running';

    -- 6. Enroll or Queue
    IF v_active_count >= v_max_concurrent THEN
        -- Insert into Queue
        INSERT INTO public.workflow_enrollment_queue (workspace_id, workflow_id, contact_id)
        VALUES (p_workspace_id, p_workflow_id, p_contact_id);
        RETURN NULL;
    ELSE
        -- Fetch first step
        SELECT id INTO v_step1_id
        FROM public.workflow_steps
        WHERE workflow_id = p_workflow_id
        ORDER BY position ASC LIMIT 1;

        -- Create Execution
        INSERT INTO public.workflow_executions (workspace_id, workflow_id, contact_id, status, current_step_id)
        VALUES (p_workspace_id, p_workflow_id, p_contact_id, 'running', v_step1_id)
        RETURNING id INTO v_execution_id;
        
        RETURN v_execution_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. STORED PROCEDURE: PROMOTE FROM QUEUE
CREATE OR REPLACE FUNCTION public.promote_from_enrollment_queue(p_contact_id UUID)
RETURNS VOID AS $$
DECLARE
    v_next_queue_item RECORD;
    v_active_count INTEGER;
    v_max_concurrent INTEGER;
    v_step1_id UUID;
BEGIN
    -- Check total active for contact
    SELECT count(*) INTO v_active_count
    FROM public.workflow_executions
    WHERE contact_id = p_contact_id AND status = 'running';

    -- Loop to fill available slots
    FOR v_next_queue_item IN 
        SELECT q.*, w.enrollment_settings
        FROM public.workflow_enrollment_queue q
        JOIN public.workflows w ON q.workflow_id = w.id
        WHERE q.contact_id = p_contact_id
        ORDER BY q.created_at ASC
    LOOP
        v_max_concurrent := (v_next_queue_item.enrollment_settings->>'max_concurrent')::INTEGER;
        
        IF v_active_count < v_max_concurrent THEN
            -- Fetch first step
            SELECT id INTO v_step1_id
            FROM public.workflow_steps
            WHERE workflow_id = v_next_queue_item.workflow_id
            ORDER BY position ASC LIMIT 1;

            -- Start execution
            INSERT INTO public.workflow_executions (workspace_id, workflow_id, contact_id, status, current_step_id)
            VALUES (v_next_queue_item.workspace_id, v_next_queue_item.workflow_id, v_next_queue_item.contact_id, 'running', v_step1_id);
            
            -- Remove from queue
            DELETE FROM public.workflow_enrollment_queue WHERE id = v_next_queue_item.id;
            
            v_active_count := v_active_count + 1;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER ON COMPLETION
CREATE OR REPLACE FUNCTION public.trigger_queue_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only promote when a previously running execution finishes
    IF (OLD.status = 'running' AND NEW.status IN ('completed', 'failed', 'cancelled')) THEN
        PERFORM public.promote_from_enrollment_queue(NEW.contact_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_on_workflow_completion
AFTER UPDATE ON public.workflow_executions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_queue_promotion();

-- RLS
ALTER TABLE public.workflow_enrollment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace access for enrollment queue" ON public.workflow_enrollment_queue
FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
