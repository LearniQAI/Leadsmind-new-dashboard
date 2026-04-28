-- PHASE 11: BUSINESS HOURS SENDING WINDOW
-- Adds business_hours configuration column to workflow_steps and timezone to contacts.

-- 1. Add business_hours JSONB config to workflow_steps
-- Shape:
-- {
--   "enabled": true,
--   "timezone_source": "contact" | "fixed",
--   "timezone": "America/New_York",        -- used when timezone_source = "fixed"
--   "allowed_days": [1, 2, 3, 4, 5],       -- 0=Sun, 1=Mon ... 6=Sat
--   "start_time": "08:00",
--   "end_time": "17:00"
-- }
ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT NULL;

-- 2. Add timezone column to contacts (used when timezone_source = 'contact')
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

-- 3. Partial index so the poll route can efficiently find "held" executions
--    whose held_until timestamp has passed.
--    (context->'held_until' is stored as an ISO-8601 string inside the JSONB)
CREATE INDEX IF NOT EXISTS idx_executions_held_until
  ON public.workflow_executions ((context->>'held_until'))
  WHERE status = 'running';

-- 4. Add 'held' as a recognized step log status (comment only — status is free TEXT)
-- Possible values: 'pending', 'running', 'completed', 'failed', 'skipped', 'held'
COMMENT ON COLUMN public.workflow_step_logs.status
  IS 'pending | running | completed | failed | skipped | held';
