-- LMS security batch 1 / S1: lms_delayed_actions was writable by anon (policy "Service role access"
-- was USING(true) on {public}). The email-queue cron executes these rows with the service role, so
-- that was an unauthenticated privilege-escalation path. Only libs/core lms-event-bus and
-- libs/infra email-queue touch this table, both via the service-role key (bypasses RLS).
-- Rollback: supabase/rollback/20260921_lms_security_batch1_policies_before.sql
DROP POLICY IF EXISTS "Service role access lms_delayed_actions" ON public.lms_delayed_actions;
CREATE POLICY "service_role only lms_delayed_actions" ON public.lms_delayed_actions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
