-- Singleton leases for scan-style cron workers. Dispatch queues use their
-- own row-level claim functions; these leases protect workers that publish
-- external workflow events while scanning ordinary domain rows.
CREATE TABLE IF NOT EXISTS public.cron_worker_locks (
  worker_name TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  locked_by TEXT
);

ALTER TABLE public.cron_worker_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_cron_worker_lock(
  p_worker_name TEXT,
  p_lease_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired BOOLEAN;
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION public.release_cron_worker_lock(p_worker_name TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.cron_worker_locks WHERE worker_name = p_worker_name;
$$;

-- A delayed LMS action must be claimable while it executes, otherwise two
-- overlapping email-queue invocations can execute it twice.
ALTER TABLE public.lms_delayed_actions
  DROP CONSTRAINT IF EXISTS lms_delayed_actions_status_check;
ALTER TABLE public.lms_delayed_actions
  ADD CONSTRAINT lms_delayed_actions_status_check
  CHECK (status IN ('pending', 'processing', 'executed', 'failed'));
