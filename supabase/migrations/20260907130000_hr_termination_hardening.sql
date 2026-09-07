-- Task 44 hardening pass.
--
-- Gap 1 + Gap 2: POST /api/hr/employees/[id]/terminate previously did the
-- terminations INSERT and the employees.status UPDATE as two separate,
-- non-atomic Supabase calls with a manual "delete the termination row if the
-- second call fails" compensating action -- not a real transaction. Worse,
-- the pre-check ("is this employee already terminated?") was a SELECT done
-- BEFORE the insert, so two concurrent terminate calls for the same employee
-- could both pass the check and both insert a termination row -- the exact
-- TOCTOU class this project standardized atomic RPCs to close (see
-- 20260706000003_atomic_operations.sql, 20260903000000_atomic_credit_notes.sql).
-- Fixed the same way: one RPC, one transaction, with a row lock (FOR UPDATE)
-- so a concurrent second call blocks on the first instead of racing it.
CREATE OR REPLACE FUNCTION public.terminate_employee_atomic(
    p_workspace_id UUID,
    p_employee_id UUID,
    p_termination_date DATE,
    p_last_working_day DATE,
    p_reason TEXT,
    p_rehire_eligible BOOLEAN,
    p_notes TEXT,
    p_processed_by UUID
) RETURNS TABLE(termination_id UUID, employee_status TEXT) AS $$
DECLARE
    v_current_status TEXT;
    v_termination_id UUID;
BEGIN
    -- Row lock: a concurrent terminate call for the same employee blocks here
    -- until this transaction commits, instead of both calls reading 'active'
    -- and both proceeding to insert a termination row.
    SELECT status INTO v_current_status
    FROM public.employees
    WHERE id = p_employee_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found in this workspace';
    END IF;

    IF v_current_status = 'terminated' THEN
        RAISE EXCEPTION 'This employee is already terminated';
    END IF;

    INSERT INTO public.terminations (
        workspace_id, employee_id, termination_date, last_working_day,
        reason, rehire_eligible, notes, processed_by
    ) VALUES (
        p_workspace_id, p_employee_id, COALESCE(p_termination_date, CURRENT_DATE),
        p_last_working_day, p_reason, COALESCE(p_rehire_eligible, true), p_notes, p_processed_by
    ) RETURNING id INTO v_termination_id;

    UPDATE public.employees
    SET status = 'terminated', updated_at = now()
    WHERE id = p_employee_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_termination_id, 'terminated'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same lockdown convention as the other atomic-RPC migrations: the calling
-- route already runs requireWorkspaceRole() before reaching this, and calls
-- it via the admin client, so grant to service_role only.
GRANT EXECUTE ON FUNCTION public.terminate_employee_atomic(uuid, uuid, date, date, text, boolean, text, uuid) TO service_role;

-- Gap 4: guard rails on terminated-employee actions.
-- Assumption (flagged, not silently decided): warnings and schedule
-- reassignment only make sense for active employees, so both are blocked
-- once status = 'terminated'. Enforced at the DB layer (not just in the API
-- route) so this holds even against a direct admin-client call that bypasses
-- the route -- same defense-in-depth posture as the KYC/compliance triggers
-- elsewhere in this schema (e.g. 20240101000211_sprint5_kyc_documents.sql).
CREATE OR REPLACE FUNCTION public.block_warning_for_terminated_employee()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.employees WHERE id = NEW.employee_id;
    IF v_status = 'terminated' THEN
        RAISE EXCEPTION 'Cannot issue a warning to a terminated employee';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_warning_for_terminated_employee ON public.warnings;
CREATE TRIGGER trg_block_warning_for_terminated_employee
    BEFORE INSERT ON public.warnings
    FOR EACH ROW EXECUTE FUNCTION public.block_warning_for_terminated_employee();

CREATE OR REPLACE FUNCTION public.block_schedule_change_for_terminated_employee()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'terminated' AND NEW.schedule_id IS DISTINCT FROM OLD.schedule_id THEN
        RAISE EXCEPTION 'Cannot change the schedule of a terminated employee';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_schedule_change_for_terminated_employee ON public.employees;
CREATE TRIGGER trg_block_schedule_change_for_terminated_employee
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.block_schedule_change_for_terminated_employee();

-- Gap 5: schedule deletion while employees still reference it.
-- Was `on delete set null` (accidental default from the original migration,
-- never a deliberate choice) -- silently unassigning every affected employee's
-- schedule on delete, with no visibility into how many were affected.
-- Deliberate fix: block the delete instead (ON DELETE RESTRICT) so deleting a
-- schedule with active assignments fails loudly; the API route (updated
-- alongside this migration) checks the assignment count first and returns a
-- clear, named error before ever reaching the DB constraint.
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_schedule_id_fkey;
ALTER TABLE public.employees
    ADD CONSTRAINT employees_schedule_id_fkey
    FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE RESTRICT;
