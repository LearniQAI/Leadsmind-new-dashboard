-- Pin search_path on the 14 non-trigger SECURITY DEFINER functions that had none.
--
-- A SECURITY DEFINER function with no fixed search_path resolves unqualified names using the
-- CALLER's search_path, so a caller who can create objects in an earlier schema (or pg_temp) can
-- shadow a table/function the definer then uses with the owner's rights.
--
-- Each function was checked individually before pinning (not one blanket guess):
--   * every table/function referenced in every body lives in public (or pg_catalog builtins:
--     array_append, to_char, hashtextextended, pg_advisory_xact_lock, jsonb_*, ILIKE, ...);
--   * none calls an extension function (pgcrypto/uuid-ossp live in "extensions"; pg_trgm and
--     vector live in public anyway, and global_search only uses the built-in ILIKE operator);
--   * global_search, notify_overdue_tasks reference public tables UNQUALIFIED - the case this
--     protects most; the rest already schema-qualify with public.
-- So the correct pin for all 14 is "public", and pg_temp is listed LAST so a temp table can never
-- shadow an unqualified public one (the implicit default puts pg_temp first).
--
-- ALTER FUNCTION ... SET only adds the setting: body, ownership and grants are untouched, so the
-- ACLs from 20260921000002/3 are unchanged. Each function was verified live (before/after
-- identical results, incl. error paths) before this file was written.
--
-- NOT covered here on purpose: the 10 trigger functions (fn_audit_*, fn_capture_standalone_lead,
-- fn_on_enrollment_created, fn_sync_appointment_to_crm_activities, handle_*_notification,
-- log_tag_*) and the RLS helper check_workspace_access - out of this batch's scope.

ALTER FUNCTION public.add_contact_tag_atomic(uuid,uuid,text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.apply_retainer_to_invoice_atomic(uuid,uuid,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_credit_note_atomic(uuid,uuid,uuid,text,numeric,text,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.delete_credit_note_atomic(uuid,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.enroll_contact_in_workflow(uuid,uuid,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_increment_rr_stats(uuid,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.global_search(text,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_campaign_metric(uuid,text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_campaign_total_sent(uuid,integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_contact_lead_score(uuid,integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_product_stock(uuid,integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.notify_overdue_tasks()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.promote_from_enrollment_queue(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.terminate_employee_atomic(uuid,uuid,date,date,text,boolean,text,uuid)
  SET search_path = public, pg_temp;

DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN ('add_contact_tag_atomic', 'apply_retainer_to_invoice_atomic', 'create_credit_note_atomic', 'delete_credit_note_atomic', 'enroll_contact_in_workflow', 'fn_increment_rr_stats', 'global_search', 'increment_campaign_metric', 'increment_campaign_total_sent', 'increment_contact_lead_score', 'increment_product_stock', 'notify_overdue_tasks', 'promote_from_enrollment_queue', 'terminate_employee_atomic')
    AND NOT COALESCE(p.proconfig @> ARRAY['search_path=public, pg_temp'], false);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'self-check failed: search_path not pinned on: %', bad;
  END IF;
END $$;
