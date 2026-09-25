-- LeadsMind-managed sending domains (Email Service Phase 4/5 foundation).
--
-- Sending domains now live in LeadsMind's own Resend account: the domain is created through
-- Resend's domain API and Resend's own verification status is stored here, instead of each
-- workspace bringing a Resend key and us guessing at record shapes. See
-- src/lib/email/sendingDomains.ts. Bring-your-own-key (workspace_email_providers) stays as an
-- optional advanced path.

-- 1. sender_domains: provider-managed state ----------------------------------------------------
ALTER TABLE public.sender_domains
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS provider_domain_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS records jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS from_local_part text NOT NULL DEFAULT 'hello',
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_send_limit integer,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason text;

ALTER TABLE public.sender_domains DROP CONSTRAINT IF EXISTS sender_domains_status_check;
ALTER TABLE public.sender_domains ADD CONSTRAINT sender_domains_status_check
  CHECK (status IN ('not_started', 'pending', 'verified', 'failed', 'temporary_failure', 'partially_verified', 'partially_failed'));
ALTER TABLE public.sender_domains DROP CONSTRAINT IF EXISTS sender_domains_from_local_part_check;
ALTER TABLE public.sender_domains ADD CONSTRAINT sender_domains_from_local_part_check
  CHECK (from_local_part ~ '^[A-Za-z0-9._%+-]{1,64}$');
ALTER TABLE public.sender_domains DROP CONSTRAINT IF EXISTS sender_domains_hourly_send_limit_check;
ALTER TABLE public.sender_domains ADD CONSTRAINT sender_domains_hourly_send_limit_check
  CHECK (hourly_send_limit IS NULL OR hourly_send_limit > 0);

-- One Resend account = one claim per domain, platform-wide (Resend itself refuses duplicates).
CREATE UNIQUE INDEX IF NOT EXISTS sender_domains_domain_name_global_key ON public.sender_domains (lower(domain_name));
CREATE UNIQUE INDEX IF NOT EXISTS sender_domains_provider_domain_key
  ON public.sender_domains (provider, provider_domain_id) WHERE provider_domain_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sender_domains_one_default_per_workspace
  ON public.sender_domains (workspace_id) WHERE is_default;

-- Registering / removing a domain also creates / removes it in the provider, so both are
-- server-only now (a direct client insert/delete would orphan or skip the provider side).
DROP POLICY IF EXISTS "sender_domains_admin_insert_unverified" ON public.sender_domains;
DROP POLICY IF EXISTS "sender_domains_admin_delete" ON public.sender_domains;

-- 2. workspace_email_providers: no client access at all ------------------------------------------
-- It holds the encrypted BYO Resend key. The FOR ALL member policy let any member overwrite the
-- key / From address straight from the browser; every legitimate path is a server action using
-- the service role behind an admin/owner check.
DROP POLICY IF EXISTS "Workspace member access on workspace_email_providers" ON public.workspace_email_providers;

-- 3. email_tracking_logs becomes the email event log ---------------------------------------------
-- Extended in place (not a parallel table): readers already filter by event_type, so the new
-- delivery-lifecycle event types do not change their counts.
ALTER TABLE public.email_tracking_logs DROP CONSTRAINT IF EXISTS email_tracking_logs_event_type_check;
ALTER TABLE public.email_tracking_logs ADD CONSTRAINT email_tracking_logs_event_type_check
  CHECK (event_type IN ('sent', 'delivered', 'delivery_delayed', 'bounce', 'complaint', 'open', 'click', 'reply', 'failed'));
-- Transactional sends (invoices, quotes, LMS, ...) belong to neither a campaign nor a workflow.
ALTER TABLE public.email_tracking_logs DROP CONSTRAINT IF EXISTS email_tracking_logs_source_check;

ALTER TABLE public.email_tracking_logs
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_event_id text,
  ADD COLUMN IF NOT EXISTS sender_domain_id uuid REFERENCES public.sender_domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bounce_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.email_tracking_logs DROP CONSTRAINT IF EXISTS email_tracking_logs_bounce_type_check;
ALTER TABLE public.email_tracking_logs ADD CONSTRAINT email_tracking_logs_bounce_type_check
  CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft'));

-- Webhook redelivery (same svix id) must not double-count.
CREATE UNIQUE INDEX IF NOT EXISTS email_tracking_logs_provider_event_key
  ON public.email_tracking_logs (provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_tracking_logs_provider_message_idx
  ON public.email_tracking_logs (provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_tracking_logs_domain_reputation_idx
  ON public.email_tracking_logs (sender_domain_id, event_type, "timestamp") WHERE sender_domain_id IS NOT NULL;

ALTER TABLE public.campaign_dispatch_queue ADD COLUMN IF NOT EXISTS provider_message_id text;

-- 4. Suppression source ---------------------------------------------------------------------------
ALTER TABLE public.global_suppression_list ADD COLUMN IF NOT EXISTS source text;
UPDATE public.global_suppression_list
  SET source = CASE reason WHEN 'unsubscribe' THEN 'unsubscribe' WHEN 'right_to_erasure' THEN 'erasure' ELSE 'manual' END
  WHERE source IS NULL;
ALTER TABLE public.global_suppression_list ALTER COLUMN source SET DEFAULT 'manual';
ALTER TABLE public.global_suppression_list ALTER COLUMN source SET NOT NULL;
ALTER TABLE public.global_suppression_list DROP CONSTRAINT IF EXISTS global_suppression_list_source_check;
ALTER TABLE public.global_suppression_list ADD CONSTRAINT global_suppression_list_source_check
  CHECK (source IN ('unsubscribe', 'bounce', 'complaint', 'manual', 'erasure'));

-- 5. Send rate limits -----------------------------------------------------------------------------
-- Per-workspace overrides. No client write policy: a workspace must not raise its own cap.
CREATE TABLE IF NOT EXISTS public.email_sending_limits (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  hourly_limit integer CHECK (hourly_limit IS NULL OR hourly_limit > 0),
  daily_limit integer CHECK (daily_limit IS NULL OR daily_limit > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_sending_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_sending_limits_member_select" ON public.email_sending_limits;
CREATE POLICY "email_sending_limits_member_select" ON public.email_sending_limits
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()));

-- Fixed-window counters. Service role only (RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.email_send_quota (
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, window_start)
);
ALTER TABLE public.email_send_quota ENABLE ROW LEVEL SECURITY;

-- Atomically claims one send against every (scope, window, limit) triple. Returns NULL when
-- granted; otherwise the first exhausted "scope|window" and NO counter is incremented (the
-- exception block rolls back the partial increments).
CREATE OR REPLACE FUNCTION public.claim_email_send_quota(p_scopes text[], p_windows text[], p_limits integer[])
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  i integer;
  v_used integer;
BEGIN
  IF coalesce(array_length(p_scopes, 1), 0) <> coalesce(array_length(p_windows, 1), 0)
     OR coalesce(array_length(p_scopes, 1), 0) <> coalesce(array_length(p_limits, 1), 0) THEN
    RAISE EXCEPTION 'claim_email_send_quota: array length mismatch';
  END IF;

  BEGIN
    FOR i IN 1 .. coalesce(array_length(p_scopes, 1), 0) LOOP
      IF p_windows[i] NOT IN ('hour', 'day') THEN
        RAISE EXCEPTION 'claim_email_send_quota: bad window %', p_windows[i];
      END IF;
      INSERT INTO public.email_send_quota AS q (scope, window_start, used)
      VALUES (p_scopes[i] || '|' || p_windows[i], date_trunc(p_windows[i], now()), 1)
      ON CONFLICT (scope, window_start) DO UPDATE SET used = q.used + 1
      RETURNING used INTO v_used;
      IF v_used > p_limits[i] THEN
        RAISE EXCEPTION USING ERRCODE = 'LM429', MESSAGE = p_scopes[i] || '|' || p_windows[i];
      END IF;
    END LOOP;
  EXCEPTION WHEN SQLSTATE 'LM429' THEN
    RETURN SQLERRM;
  END;

  -- Opportunistic housekeeping: counters older than two days are never read again.
  IF random() < 0.01 THEN
    DELETE FROM public.email_send_quota WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_send_quota(text[], text[], integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_send_quota(text[], text[], integer[]) TO service_role;
