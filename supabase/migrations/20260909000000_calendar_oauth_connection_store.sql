-- Task 62 — Real Google Calendar & Outlook "Connect".
--
-- Step 1.3 token-store decision (confirmed): `public.user_calendar_connections`
-- is the SINGLE source of truth for calendar-provider OAuth (Google Calendar,
-- Outlook / Microsoft 365). Rationale:
--   * per-user by design (round-robin / collective calendars = N hosts, each
--     with their own calendar) — platform_connections is UNIQUE(workspace_id,
--     platform), i.e. one row per workspace, and its RLS is admin/owner-only.
--   * every existing external-sync consumer already reads this table
--     (lib/calendar/calendarSync.ts, /api/meet/webhooks/{google,outlook}).
--   * platform_connections.platform CHECK never permitted 'google_calendar' /
--     'outlook_calendar' — the old /api/auth/google/callback write silently
--     failed that constraint. That path is now obsolete (flagged for the
--     end-of-module cleanup pass; NOT removed here).
--
-- The table itself already exists (20240101000198_meet_foundational.sql) with:
--   id, workspace_id, user_id, provider CHECK (provider IN ('google','outlook')),
--   credentials JSONB, status CHECK (status IN ('connected','error','pending')),
--   created_at, updated_at, UNIQUE(workspace_id, user_id, provider).
--
-- OAuth token material is stored inside `credentials` as:
--   access_token_encrypted, refresh_token_encrypted  (AES-256-GCM, lib/encryption.ts)
--   expires_at        (ms epoch, plaintext — not a secret)
--   email, scope, connected_at, last_sync_at          (plaintext metadata)
-- Non-secret webhook keys already present on some rows
--   (google_channel_id/token, outlook_subscription_id/client_state) are kept
--   plaintext so the ->>'' webhook lookups keep working.
--
-- Everything the connect flow needs already fits the existing columns +
-- `credentials` JSONB, so NO column change is required — this migration is a
-- pure performance/hygiene add and the code does not depend on it being run.

-- Lookup index for the hot path: getExternalBusySlots() / createGoogleMeetLink()
-- both fetch by (user_id, provider) where status = 'connected'.
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_user_provider
  ON public.user_calendar_connections (user_id, provider)
  WHERE status = 'connected';

COMMENT ON TABLE public.user_calendar_connections IS
  'Single source of truth for calendar-provider OAuth (Google Calendar, Outlook/M365). Per-user. Written by /api/auth/google-calendar/* and /api/auth/microsoft/*. Read by lib/calendar/calendarSync.ts, lib/calendar/googleMeet.ts, and /api/meet/webhooks/{google,outlook}.';
