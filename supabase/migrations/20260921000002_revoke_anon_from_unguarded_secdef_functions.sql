-- EMERGENCY (follow-up to 20260921000001): revoke anonymous access from the
-- SECURITY DEFINER functions that have NO internal ownership check.
--
-- Live catalog scan 2026-09-21 (pg_proc + has_function_privilege) found 40
-- SECURITY DEFINER functions in `public` executable by anon + authenticated.
-- 27 are RPC-callable (the rest are trigger functions, which cannot be called
-- over RPC). 23 of those 27 take a caller-supplied workspace/contact id and do
-- NOT verify the caller belongs to it. Two were proven anonymously exploitable
-- (read-only, counts only): get_invoice_metrics returned a workspace's
-- collected/overdue/bad-debt totals, global_search returned contact rows. The
-- rest are writers (financial, HR, cron locks, AI credits, tags, pipeline).
--
-- WHY THIS IS THE SAME BUG AS fn_execute_segment_sql / increment_campaign_metric:
-- Supabase's default privileges grant EXECUTE on new functions to PUBLIC, anon
-- and authenticated; a SECURITY DEFINER function then runs with its owner's
-- rights. No REVOKE was ever issued for these.
--
-- SCOPE OF THIS MIGRATION (deliberately narrow, low-risk step 1 of 2):
--   * REVOKE from PUBLIC and anon on the 20 unguarded data/write functions
--     (21 signatures: deduct_ai_credit has an extra SECURITY INVOKER overload).
--   * `authenticated` and `service_role` are explicitly (re-)GRANTED so behaviour
--     for every legitimate caller — user-session server actions, the browser
--     GlobalSearchModal, admin-client crons — is unchanged.
--   * NOT touched: the RLS helper booleans check_workspace_access,
--     is_workspace_admin, course_workspace_matches, appointment_workspace_matches,
--     page_workspace_matches, workspace_has_pages, get_user_workspaces —
--     policies evaluate them under the caller's role, so revoking would break RLS.
--   * NOT touched: trigger functions (not callable over RPC).
--
-- STILL OPEN (step 2, separate batch): any `authenticated` user can still call
-- these with another workspace's id, because the functions have no internal
-- membership check. That needs a per-function auth.uid()/workspace_members
-- check (or service_role-only + moving callers to the admin client).
-- notify_overdue_tasks() is a cron-style global function; it should probably be
-- service_role-only, which the caller-trace supports (no src caller at all).

-- ── Financial / HR / data readers ───────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_invoice_metrics(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.global_search(text, uuid) FROM PUBLIC, anon;

-- ── Financial writers ───────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.create_credit_note_atomic(uuid, uuid, uuid, text, numeric, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_credit_note_atomic(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_retainer_to_invoice_atomic(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_product_stock(uuid, integer) FROM PUBLIC, anon;

-- ── HR ──────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.terminate_employee_atomic(uuid, uuid, date, date, text, boolean, text, uuid) FROM PUBLIC, anon;

-- ── AI credits ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.deduct_ai_credit(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deduct_ai_credit(uuid) FROM PUBLIC, anon; -- SECURITY INVOKER overload, same RPC name

-- ── CRM / automation ────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.add_contact_tag_atomic(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_contact_lead_score(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enroll_contact_in_workflow(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_from_enrollment_queue(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_increment_rr_stats(uuid, uuid) FROM PUBLIC, anon;

-- ── Pipeline / task ordering ────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.move_opportunity_to_position(uuid, uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_project_task_to_position(uuid, uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_task_to_position(uuid, uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_stage_positions(uuid, uuid[], integer[]) FROM PUBLIC, anon;

-- ── Cron ────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.acquire_cron_worker_lock(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_cron_worker_lock(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_overdue_tasks() FROM PUBLIC, anon;

-- ── Preserve every legitimate caller explicitly ─────────────────────────────
-- (REVOKE FROM PUBLIC could otherwise drop `authenticated` for any function whose
-- access came only through PUBLIC.)
GRANT EXECUTE ON FUNCTION public.get_invoice_metrics(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.global_search(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_credit_note_atomic(uuid, uuid, uuid, text, numeric, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_credit_note_atomic(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_retainer_to_invoice_atomic(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.terminate_employee_atomic(uuid, uuid, date, date, text, boolean, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_ai_credit(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_ai_credit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_contact_tag_atomic(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_contact_lead_score(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enroll_contact_in_workflow(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_from_enrollment_queue(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_increment_rr_stats(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.move_opportunity_to_position(uuid, uuid, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.move_project_task_to_position(uuid, uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.move_task_to_position(uuid, uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_stage_positions(uuid, uuid[], integer[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acquire_cron_worker_lock(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_cron_worker_lock(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_overdue_tasks() TO authenticated, service_role;

-- ── Self-check: abort the whole migration if the result is not what we intend ─
DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_invoice_metrics','global_search','create_credit_note_atomic','delete_credit_note_atomic',
      'apply_retainer_to_invoice_atomic','increment_product_stock','terminate_employee_atomic','deduct_ai_credit',
      'add_contact_tag_atomic','increment_contact_lead_score','enroll_contact_in_workflow','promote_from_enrollment_queue',
      'fn_increment_rr_stats','move_opportunity_to_position','move_project_task_to_position','move_task_to_position',
      'update_stage_positions','acquire_cron_worker_lock','release_cron_worker_lock','notify_overdue_tasks')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'unguarded-secdef lockdown self-check failed for: %', bad;
  END IF;
END $$;
