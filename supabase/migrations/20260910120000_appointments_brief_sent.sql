-- Task 67 follow-up — exactly-once idempotency for the AI pre-meeting brief cron
-- (/api/cron/pre-meeting-brief, registered at */5 * * * *).
--
-- The brief cron had NO idempotency protection: it relied purely on its 5-minute
-- look-ahead window lining up with the cron schedule. Consequences:
--   * an overlapping tick or a manual re-run sends a DUPLICATE briefing email
--     and burns a SECOND AI credit for a brief already produced;
--   * a missed / delayed tick means the appointment's window is never hit and
--     the host silently never gets a brief, with no retry.
--
-- This mirrors the exact mechanism the hourly reminder cron already uses
-- (appointments.reminder_1h_sent / reminder_24h_sent, added in
-- 20240101000197_meet_automation.sql): a plain boolean, default false, set to
-- true by the cron ONLY after the brief is fully generated, persisted to
-- ai_research_reports, credit-charged and emailed. Postgres backfills existing
-- rows to false as part of ADD COLUMN ... DEFAULT.
--
-- The brief cron's scan window is also widened (in code) from a fragile 5-min
-- band to "any not-yet-briefed scheduled appointment starting within the next
-- ~2h", so a missed tick self-heals on the next run and the flag prevents the
-- resulting overlap from double-sending.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS brief_sent BOOLEAN DEFAULT false;
