-- STEP 2 of the SECURITY DEFINER lockdown: close CROSS-TENANT access for AUTHENTICATED users.
--
-- Background: 20260921000001/2 removed anonymous access. But these 20 functions
-- (21 signatures) still trusted a caller-supplied workspace/contact id and never
-- checked that the caller belongs to it, so ANY signed-in user could read or
-- mutate ANY workspace through them. Proven live before this migration with two
-- real users in two workspaces: user A (member of A only) mutated workspace B's
-- contact tags, lead score, AI credits and task, and read B's search results.
--
-- Design (chosen per function from the REAL call sites):
--  * SERVICE-ROLE-ONLY (13): every legitimate caller uses the admin client (cron
--    locks, automation/executor, credit notes, retainers, HR terminate, project
--    task moves) or there is no caller at all (notify_overdue_tasks,
--    fn_increment_rr_stats, increment_product_stock). authenticated EXECUTE is
--    revoked AND the body refuses non-backend callers. This also stops a plain
--    workspace member bypassing the ROLE checks those routes enforce (e.g. HR
--    terminate requires HR roles) by calling the RPC directly.
--  * MEMBERSHIP CHECK IN THE FUNCTION (7): callers run on a user session
--    (get_invoice_metrics, global_search, move_task/opportunity, stage positions),
--    have mixed callers (deduct_ai_credit), or are invoked by an INVOKER trigger
--    under the user's role (promote_from_enrollment_queue via
--    trigger_queue_promotion) — so authenticated must stay granted. The body
--    verifies the caller belongs to the workspace (backend callers pass).
--
-- Guard helpers are internal (not exposed over RPC). They are only ever called from
-- inside these SECURITY DEFINER bodies, i.e. as the function owner.
--
-- NOT changed: deduct_ai_credit(uuid) — SECURITY INVOKER, RLS-bound
-- (ai_usage_credits has a members-only SELECT policy and no UPDATE policy) and
-- ambiguous by name, so it cannot cross tenants. The RLS helper booleans.
--
-- FOLLOW-UP (not done here): 14 of these definer functions still have NO fixed
-- search_path. Pinning it is a separate hardening step because some bodies may rely
-- on the extensions schema (e.g. pg_trgm in global_search).

-- ── Guard helpers ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_backend_caller()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $g$
DECLARE
  jwt_role TEXT;
BEGIN
  BEGIN
    jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;
  IF jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$g$;

CREATE OR REPLACE FUNCTION public.assert_workspace_access(p_workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $g$
DECLARE
  jwt_role TEXT;
BEGIN
  BEGIN
    jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;
  IF jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN;
  END IF;
  IF p_workspace_id IS NOT NULL AND public.check_workspace_access(p_workspace_id) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$g$;

CREATE OR REPLACE FUNCTION public.assert_contact_access(p_contact_id UUID)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $g$
DECLARE
  jwt_role TEXT;
  v_ws UUID;
BEGIN
  BEGIN
    jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;
  IF jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN;
  END IF;
  SELECT workspace_id INTO v_ws FROM public.contacts WHERE id = p_contact_id;
  IF v_ws IS NOT NULL AND public.check_workspace_access(v_ws) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$g$;

REVOKE ALL ON FUNCTION public.assert_backend_caller() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_workspace_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_contact_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_backend_caller() TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_workspace_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_contact_access(uuid) TO service_role;

-- ── Guarded function bodies (live definitions + guard as the first statement) ──
-- acquire_cron_worker_lock(text,integer)
CREATE OR REPLACE FUNCTION public.acquire_cron_worker_lock(p_worker_name text, p_lease_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_acquired BOOLEAN;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
  INSERT INTO public.cron_worker_locks (worker_name, locked_at, expires_at, locked_by)
  VALUES (
    p_worker_name,
    now(),
    now() + make_interval(secs => p_lease_seconds),
    NULL
  )
  ON CONFLICT (worker_name) DO UPDATE
    SET locked_at = EXCLUDED.locked_at,
        expires_at = EXCLUDED.expires_at,
        locked_by = EXCLUDED.locked_by
    WHERE cron_worker_locks.expires_at <= now()
  RETURNING TRUE INTO v_acquired;

  RETURN COALESCE(v_acquired, FALSE);
END;
$function$;

-- notify_overdue_tasks()
CREATE OR REPLACE FUNCTION public.notify_overdue_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    INSERT INTO inbox_notifications (user_id, title, description, type, link)
    SELECT 
        ta.user_id,
        'Overdue Task: ' || t.title,
        'This task was due on ' || to_char(t.due_date, 'Mon DD, YYYY'),
        'warning',
        '/tasks'
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id
    WHERE t.due_date < now() 
    AND t.status != 'done'
    AND NOT EXISTS (
        SELECT 1 FROM inbox_notifications n 
        WHERE n.user_id = ta.user_id 
        AND n.link = '/tasks' 
        AND n.created_at > now() - interval '1 day'
    );
END;
$function$;

-- fn_increment_rr_stats(uuid,uuid)
CREATE OR REPLACE FUNCTION public.fn_increment_rr_stats(p_calendar_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    UPDATE public.round_robin_assignment
    SET 
        booking_count = booking_count + 1,
        last_assigned_at = now()
    WHERE 
        calendar_id = p_calendar_id 
        AND user_id = p_user_id;
END;
$function$;

-- increment_product_stock(uuid,integer)
CREATE OR REPLACE FUNCTION public.increment_product_stock(pid uuid, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    UPDATE public.products
    SET quantity_on_hand = quantity_on_hand + amount,
        updated_at = now()
    WHERE id = pid;
END;
$function$;

-- increment_contact_lead_score(uuid,integer)
CREATE OR REPLACE FUNCTION public.increment_contact_lead_score(p_contact_id uuid, p_points integer)
 RETURNS TABLE(found boolean, new_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_score INT;
    v_found BOOLEAN := FALSE;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    UPDATE public.contacts
    SET lead_score = COALESCE(lead_score, 0) + p_points
    WHERE id = p_contact_id
    RETURNING lead_score INTO v_score;

    v_found := FOUND;
    RETURN QUERY SELECT v_found, v_score;
END;
$function$;

-- enroll_contact_in_workflow(uuid,uuid,uuid)
CREATE OR REPLACE FUNCTION public.enroll_contact_in_workflow(p_workspace_id uuid, p_workflow_id uuid, p_contact_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_settings JSONB;
    v_active_count INT;
    v_last_completion TIMESTAMPTZ;
    v_new_execution_id UUID;
    v_first_step_id UUID;
    v_max_concurrent INT;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
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
$function$;

-- add_contact_tag_atomic(uuid,uuid,text)
CREATE OR REPLACE FUNCTION public.add_contact_tag_atomic(p_contact_id uuid, p_workspace_id uuid, p_tag text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_tags TEXT[];
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    -- Single atomic append, guarded by the dedupe check in the same
    -- statement -- no other call can observe or write the tags array
    -- between the read implied by the WHERE clause and this write.
    UPDATE public.contacts
    SET tags = array_append(COALESCE(tags, ARRAY[]::TEXT[]), p_tag)
    WHERE id = p_contact_id
      AND workspace_id = p_workspace_id
      AND NOT (p_tag = ANY(COALESCE(tags, ARRAY[]::TEXT[])))
    RETURNING tags INTO v_tags;

    IF v_tags IS NOT NULL THEN
        RETURN v_tags; -- tag newly added
    END IF;

    -- No row matched the UPDATE: either the tag was already present
    -- (no-op, matches prior dedupe behavior) or the contact doesn't
    -- exist in this workspace. Disambiguate with a plain read.
    SELECT tags INTO v_tags
    FROM public.contacts
    WHERE id = p_contact_id AND workspace_id = p_workspace_id;

    RETURN v_tags; -- NULL => contact not found; else existing tags (dedupe no-op)
END;
$function$;

-- terminate_employee_atomic(uuid,uuid,date,date,text,boolean,text,uuid)
CREATE OR REPLACE FUNCTION public.terminate_employee_atomic(p_workspace_id uuid, p_employee_id uuid, p_termination_date date, p_last_working_day date, p_reason text, p_rehire_eligible boolean, p_notes text, p_processed_by uuid)
 RETURNS TABLE(termination_id uuid, employee_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_status TEXT;
    v_termination_id UUID;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
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
$function$;

-- create_credit_note_atomic(uuid,uuid,uuid,text,numeric,text,uuid)
CREATE OR REPLACE FUNCTION public.create_credit_note_atomic(p_workspace_id uuid, p_invoice_id uuid, p_contact_id uuid, p_credit_number text, p_amount numeric, p_reason text, p_logged_by uuid)
 RETURNS TABLE(credit_note_id uuid, new_amount_due numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_amount_due NUMERIC;
    v_amount_paid NUMERIC;
    v_outstanding NUMERIC;
    v_new_amount_due NUMERIC;
    v_credit_note_id UUID;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    -- Row lock so a concurrent credit note against the same invoice can't
    -- read the same pre-credit amount_due this one just read.
    SELECT amount_due, amount_paid INTO v_amount_due, v_amount_paid
    FROM public.invoices
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found in this workspace';
    END IF;

    v_outstanding := COALESCE(v_amount_due, 0) - COALESCE(v_amount_paid, 0);
    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'Credit amount cannot exceed the outstanding balance of %', v_outstanding::TEXT;
    END IF;

    INSERT INTO public.credit_notes (
        invoice_id, workspace_id, contact_id, credit_number, amount, reason, status, issue_date, logged_by
    ) VALUES (
        p_invoice_id, p_workspace_id, p_contact_id, p_credit_number, p_amount, p_reason, 'issued', now(), p_logged_by
    ) RETURNING id INTO v_credit_note_id;

    -- Never touch amount_paid here -- it represents real cash collected and
    -- feeds total_collected analytics; a credit note is not a payment.
    v_new_amount_due := GREATEST(0, COALESCE(v_amount_due, 0) - p_amount);
    UPDATE public.invoices
    SET amount_due = v_new_amount_due
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_credit_note_id, v_new_amount_due;
END;
$function$;

-- delete_credit_note_atomic(uuid,uuid)
CREATE OR REPLACE FUNCTION public.delete_credit_note_atomic(p_workspace_id uuid, p_credit_note_id uuid)
 RETURNS TABLE(invoice_id uuid, restored_amount_due numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_invoice_id UUID;
    v_amount NUMERIC;
    v_current_amount_due NUMERIC;
    v_restored_amount_due NUMERIC;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    SELECT cn.invoice_id, cn.amount INTO v_invoice_id, v_amount
    FROM public.credit_notes cn
    WHERE cn.id = p_credit_note_id AND cn.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit note not found in this workspace';
    END IF;

    DELETE FROM public.credit_notes
    WHERE id = p_credit_note_id AND workspace_id = p_workspace_id;

    -- Row lock on the invoice for the same reason as the create path.
    SELECT amount_due INTO v_current_amount_due
    FROM public.invoices
    WHERE id = v_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Invoice itself was deleted separately -- the credit note is still
        -- gone (correct), just nothing left to restore a balance on.
        RETURN QUERY SELECT v_invoice_id, NULL::NUMERIC;
        RETURN;
    END IF;

    v_restored_amount_due := COALESCE(v_current_amount_due, 0) + v_amount;
    UPDATE public.invoices
    SET amount_due = v_restored_amount_due
    WHERE id = v_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_invoice_id, v_restored_amount_due;
END;
$function$;

-- apply_retainer_to_invoice_atomic(uuid,uuid,uuid)
CREATE OR REPLACE FUNCTION public.apply_retainer_to_invoice_atomic(p_workspace_id uuid, p_invoice_id uuid, p_contact_id uuid)
 RETURNS TABLE(applied_amount numeric, new_amount_due numeric, invoice_paid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_amount_due NUMERIC;
    v_total_amount NUMERIC;
    v_retainer_id UUID;
    v_remaining NUMERIC;
    v_applied NUMERIC;
    v_new_amount_due NUMERIC;
    v_paid BOOLEAN;
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    SELECT COALESCE(amount_due, total_amount, 0), COALESCE(total_amount, 0)
        INTO v_amount_due, v_total_amount
    FROM public.invoices
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found in this workspace';
    END IF;

    IF v_amount_due <= 0 THEN
        RAISE EXCEPTION 'This invoice has nothing outstanding to apply a retainer against';
    END IF;

    SELECT id, amount_remaining INTO v_retainer_id, v_remaining
    FROM public.retainers
    WHERE contact_id = p_contact_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND OR v_remaining IS NULL OR v_remaining <= 0 THEN
        RAISE EXCEPTION 'No active retainer balance found';
    END IF;

    v_applied := LEAST(v_amount_due, v_remaining);

    INSERT INTO public.retainer_ledger_entries (
        workspace_id, contact_id, amount, entry_type, invoice_id
    ) VALUES (
        p_workspace_id, p_contact_id, v_applied, 'debit_invoice_apply', p_invoice_id
    );

    UPDATE public.retainers
    SET amount_remaining = v_remaining - v_applied
    WHERE id = v_retainer_id;

    v_new_amount_due := GREATEST(0, v_amount_due - v_applied);
    v_paid := v_new_amount_due <= 0;

    UPDATE public.invoices
    SET amount_due = v_new_amount_due,
        status = CASE WHEN v_paid THEN 'paid' ELSE status END
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_applied, v_new_amount_due, v_paid;
END;
$function$;

-- move_project_task_to_position(uuid,uuid,text,integer)
CREATE OR REPLACE FUNCTION public.move_project_task_to_position(p_workspace_id uuid, p_task_id uuid, p_target_status text, p_target_index integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
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
$function$;

-- global_search(text,uuid)
CREATE OR REPLACE FUNCTION public.global_search(query_text text, workspace_id uuid)
 RETURNS TABLE(id uuid, title text, subtitle text, category text, link text, icon text, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(workspace_id);
    RETURN QUERY
    -- Contacts (Leads)
    (SELECT
        c.id,
        (c.first_name || ' ' || c.last_name)::text as title,
        c.email::text as subtitle,
        'CONTACT'::text as category,
        ('/contacts/' || c.id)::text as link,
        'fa-user'::text as icon,
        jsonb_build_object('type', 'contact') as metadata
    FROM contacts c
    WHERE c.workspace_id = global_search.workspace_id
    AND (c.first_name ILIKE '%' || query_text || '%' OR c.last_name ILIKE '%' || query_text || '%' OR c.email ILIKE '%' || query_text || '%')
    LIMIT 5)

    UNION ALL

    -- Opportunities (Deals) — link to the contact if there is one, else the
    -- deal's own pipeline board.
    (SELECT
        o.id,
        o.title::text as title,
        ('$' || o.value::text)::text as subtitle,
        'OPPORTUNITY'::text as category,
        (CASE
            WHEN o.contact_id IS NOT NULL THEN '/contacts/' || o.contact_id
            ELSE '/pipelines?pipelineId=' || ps.pipeline_id
        END)::text as link,
        'fa-crosshairs'::text as icon,
        jsonb_build_object('type', 'opportunity', 'status', o.status) as metadata
    FROM opportunities o
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE o.workspace_id = global_search.workspace_id
    AND o.title ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Invoices
    (SELECT
        i.id,
        i.invoice_number::text as title,
        ('$' || i.total_amount::text)::text as subtitle,
        'INVOICE'::text as category,
        ('/invoices/' || i.id)::text as link,
        'fa-file-invoice-dollar'::text as icon,
        jsonb_build_object('type', 'invoice', 'status', i.status) as metadata
    FROM invoices i
    WHERE i.workspace_id = global_search.workspace_id
    AND i.invoice_number ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Tasks
    (SELECT
        t.id,
        t.title::text as title,
        t.priority::text as subtitle,
        'TASK'::text as category,
        ('/tasks/' || t.id)::text as link,
        'fa-list-check'::text as icon,
        jsonb_build_object('type', 'task', 'status', t.status) as metadata
    FROM tasks t
    WHERE t.workspace_id = global_search.workspace_id
    AND t.title ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Projects
    (SELECT
        p.id,
        p.name::text as title,
        p.status::text as subtitle,
        'PROJECT'::text as category,
        ('/projects/' || p.id)::text as link,
        'fa-diagram-project'::text as icon,
        jsonb_build_object('type', 'project') as metadata
    FROM projects p
    WHERE p.workspace_id = global_search.workspace_id
    AND p.name ILIKE '%' || query_text || '%'
    LIMIT 5);
END;
$function$;

-- move_task_to_position(uuid,uuid,text,integer)
CREATE OR REPLACE FUNCTION public.move_task_to_position(p_workspace_id uuid, p_task_id uuid, p_target_status text, p_target_index integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_status TEXT;
  v_other_ids UUID[];
  v_other_count INT;
  v_clamped_index INT;
  v_final_ids UUID[];
  v_id UUID;
  v_pos INT;
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(p_workspace_id);
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
$function$;

-- move_opportunity_to_position(uuid,uuid,uuid,integer)
CREATE OR REPLACE FUNCTION public.move_opportunity_to_position(p_workspace_id uuid, p_deal_id uuid, p_target_stage_id uuid, p_target_index integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_stage_id UUID;
  v_other_ids UUID[];
  v_other_count INT;
  v_clamped_index INT;
  v_final_ids UUID[];
  v_id UUID;
  v_pos INT;
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(p_workspace_id);
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
$function$;

-- update_stage_positions(uuid,uuid[],integer[])
CREATE OR REPLACE FUNCTION public.update_stage_positions(p_workspace_id uuid, p_stage_ids uuid[], p_positions integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_matched_count INT;
  i INT;
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(p_workspace_id);
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
$function$;

-- deduct_ai_credit(uuid,integer)
CREATE OR REPLACE FUNCTION public.deduct_ai_credit(p_workspace_id uuid, p_amount integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(p_workspace_id);
  UPDATE ai_usage_credits
  SET credits_used_this_period = credits_used_this_period + p_amount
  WHERE workspace_id = p_workspace_id
    AND (
      credits_used_this_period + p_amount
    ) <= (
      plan_monthly_credits + credits_purchased_addon
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- TRUE = credit deducted successfully
  -- FALSE = limit exceeded or no ai_usage_credits row for this workspace
  RETURN v_updated > 0;
END;
$function$;

-- promote_from_enrollment_queue(uuid)
CREATE OR REPLACE FUNCTION public.promote_from_enrollment_queue(p_contact_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_next_queue_item RECORD;
    v_active_count INTEGER;
    v_max_concurrent INTEGER;
    v_step1_id UUID;
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_contact_access(p_contact_id);
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
$function$;

-- get_invoice_metrics(uuid)  (converted LANGUAGE sql -> plpgsql to hold the guard; query body unchanged)
CREATE OR REPLACE FUNCTION public.get_invoice_metrics(target_workspace_id uuid)
 RETURNS TABLE(total_collected numeric, total_overdue numeric, bad_debt_total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): caller must belong to the workspace being accessed
    PERFORM public.assert_workspace_access(target_workspace_id);
    RETURN QUERY
    SELECT
        COALESCE((
          SELECT SUM(i.total_amount)
          FROM public.invoices i
          WHERE i.workspace_id = target_workspace_id
            AND i.status = 'paid'
        ), 0) AS total_collected,
        COALESCE((
          SELECT SUM(i.total_amount)
          FROM public.invoices i
          WHERE i.workspace_id = target_workspace_id
            AND i.status NOT IN ('paid', 'void')
            AND i.due_date IS NOT NULL
            AND i.due_date < now()
        ), 0) AS total_overdue,
        COALESCE((
          SELECT SUM(w.amount_written_off)
          FROM public.invoice_write_offs w
          WHERE w.workspace_id = target_workspace_id
        ), 0) AS bad_debt_total;
END;
$function$;

-- release_cron_worker_lock(text)  (converted LANGUAGE sql -> plpgsql to hold the guard; statement unchanged)
CREATE OR REPLACE FUNCTION public.release_cron_worker_lock(p_worker_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- SECURITY GUARD (20260921000003): backend (service_role) callers only
    PERFORM public.assert_backend_caller();
    DELETE FROM public.cron_worker_locks WHERE worker_name = p_worker_name;
END;
$function$;

-- ── Service-role-only: authenticated may no longer execute these ─────────────
REVOKE EXECUTE ON FUNCTION public.acquire_cron_worker_lock(text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_overdue_tasks() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_increment_rr_stats(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_contact_lead_score(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enroll_contact_in_workflow(uuid, uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_contact_tag_atomic(uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.terminate_employee_atomic(uuid, uuid, date, date, text, boolean, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_credit_note_atomic(uuid, uuid, uuid, text, numeric, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_credit_note_atomic(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_retainer_to_invoice_atomic(uuid, uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.move_project_task_to_position(uuid, uuid, text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_cron_worker_lock(text) FROM authenticated;

-- ── Self-check: abort the whole migration unless every function is in the intended state ──
DO $$
DECLARE
  bad TEXT;
BEGIN
  -- helpers must not be RPC-reachable by anon/authenticated
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('assert_backend_caller', 'assert_workspace_access', 'assert_contact_access')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'self-check: guard helper exposed: %', bad; END IF;

  -- service-role-only set: authenticated/anon NO, service_role YES, guard present in body
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.oid::regprocedure::text = ANY (ARRAY[
      'acquire_cron_worker_lock(text,integer)',
      'notify_overdue_tasks()',
      'fn_increment_rr_stats(uuid,uuid)',
      'increment_product_stock(uuid,integer)',
      'increment_contact_lead_score(uuid,integer)',
      'enroll_contact_in_workflow(uuid,uuid,uuid)',
      'add_contact_tag_atomic(uuid,uuid,text)',
      'terminate_employee_atomic(uuid,uuid,date,date,text,boolean,text,uuid)',
      'create_credit_note_atomic(uuid,uuid,uuid,text,numeric,text,uuid)',
      'delete_credit_note_atomic(uuid,uuid)',
      'apply_retainer_to_invoice_atomic(uuid,uuid,uuid)',
      'move_project_task_to_position(uuid,uuid,text,integer)',
      'release_cron_worker_lock(text)'
    ])
    AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE') OR p.prosrc NOT LIKE '%assert_backend_caller%');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'self-check: service-role-only set not in intended state: %', bad; END IF;

  -- membership set: anon NO, authenticated YES, service_role YES, guard present in body
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.oid::regprocedure::text = ANY (ARRAY[
      'global_search(text,uuid)',
      'move_task_to_position(uuid,uuid,text,integer)',
      'move_opportunity_to_position(uuid,uuid,uuid,integer)',
      'update_stage_positions(uuid,uuid[],integer[])',
      'deduct_ai_credit(uuid,integer)',
      'promote_from_enrollment_queue(uuid)',
      'get_invoice_metrics(uuid)'
    ])
    AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
         OR (p.prosrc NOT LIKE '%assert_workspace_access%' AND p.prosrc NOT LIKE '%assert_contact_access%'));
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'self-check: membership set not in intended state: %', bad; END IF;
END $$;
