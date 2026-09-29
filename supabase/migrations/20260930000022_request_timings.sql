-- Launch instrumentation: structured timing for the 5 flows targeted by the pre-launch
-- instrumentation pass (public form submit, automation execution, social OAuth connect,
-- inventory create, AI research). Not a general request log — writes are scoped to those
-- flows only, from src/shared/logger/requestTiming.ts.

CREATE TABLE IF NOT EXISTS request_timings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    -- Nullable: the public form-submit flow is unauthenticated (no user_id), and an OAuth
    -- callback that fails before consumeOAuthStateNonce() resolves a workspace has no
    -- workspace_id yet either.
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    steps JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_timings_duration ON request_timings (duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_request_timings_request_id ON request_timings (request_id);
CREATE INDEX IF NOT EXISTS idx_request_timings_created_at ON request_timings (created_at);

-- Slowest requests over the last 14 days (matches the retention window below), newest-first
-- within duration ties. Query with e.g. `SELECT * FROM slow_requests LIMIT 50;`.
CREATE OR REPLACE VIEW slow_requests AS
SELECT
    request_id,
    workspace_id,
    user_id,
    route,
    method,
    status,
    duration_ms,
    steps,
    error_message,
    created_at
FROM request_timings
ORDER BY duration_ms DESC, created_at DESC;

ALTER TABLE request_timings ENABLE ROW LEVEL SECURITY;

-- No policies are defined for the `authenticated` or `anon` roles — RLS with zero matching
-- policies defaults to deny, so no customer/workspace session (including workspace admins and
-- owners) can read or write this table via the app's normal Supabase client, regardless of role.
-- This codebase has no platform-wide "internal staff" flag today (checked: no such column or
-- role concept exists anywhere), so rather than invent one, this table is service-role-only —
-- writes go through createAdminClient() (src/shared/logger/requestTiming.ts, which bypasses
-- RLS), and reads for the "slowest requests" view are run directly against the database (the
-- Supabase SQL editor or `supabase db` CLI both authenticate as postgres/service role and are
-- themselves gated by Supabase project access, not by an RLS policy on this table).

-- Retention: delete rows older than 14 days once a day. Requires the pg_cron extension (already
-- enabled in this project via migration 20240101000066_phase34_invoice_sprint2.sql); re-running
-- CREATE EXTENSION IF NOT EXISTS here is a no-op if so, and a real guard if this migration is
-- ever the first to touch pg_cron.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'request-timings-cleanup',
    '0 3 * * *',
    $$DELETE FROM request_timings WHERE created_at < now() - interval '14 days'$$
);
