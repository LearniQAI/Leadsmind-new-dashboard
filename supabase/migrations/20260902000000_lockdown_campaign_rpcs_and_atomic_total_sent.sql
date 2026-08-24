-- Critical fix (Blog/Email-Campaign re-audit): increment_campaign_metric() is
-- SECURITY DEFINER (bypasses RLS by design) and takes a fully caller-supplied
-- campaign id with no ownership check inside the function body. It was never
-- REVOKEd from PUBLIC/anon/authenticated in the migration that created it, so
-- Supabase's default function grants left it callable by literally anyone —
-- confirmed live: a fully anonymous caller (public anon key, no session, no
-- API key) successfully incremented another workspace's `complaints` counter
-- via POST /rest/v1/rpc/increment_campaign_metric. The only legitimate caller
-- is the svix-signature-verified deliverability webhook, which already uses
-- the service-role client — restricting execution to service_role changes
-- nothing for that caller and closes the hole for everyone else.
REVOKE ALL ON FUNCTION public.increment_campaign_metric(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_metric(uuid, text) TO service_role;

-- Defense-in-depth: acquire_campaign_jobs is not currently exploitable (it's
-- an invoker-rights function and campaign_dispatch_queue has zero RLS
-- policies, so a non-service caller gets nothing back), but it should never
-- have been reachable by anon/authenticated in the first place — same
-- pattern, same fix. Both overloads exist in the DB (CREATE OR REPLACE with a
-- different signature creates a new overload rather than replacing the old
-- one), so both are locked down; only the 3-arg version is actually called
-- by the cron dispatch worker today.
REVOKE ALL ON FUNCTION public.acquire_campaign_jobs(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_campaign_jobs(text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.acquire_campaign_jobs(text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_campaign_jobs(text, integer, uuid) TO service_role;

-- email_campaigns.total_sent was rolled up via select() -> compute in JS ->
-- update() in the cron dispatch worker (src/app/api/cron/workers/campaign-dispatch/route.ts,
-- "Naive increment, would be better as RPC" per its own comment) — the same
-- non-atomic read-then-write shape as the now-fixed AI-credit bug. Not a
-- security-boundary bypass (nothing is gated on this value), but a real
-- lost-update race under concurrent worker runs. Single atomic UPDATE,
-- restricted to service_role for the same reason as the two RPCs above.
CREATE OR REPLACE FUNCTION public.increment_campaign_total_sent(c_id UUID, amount INT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.email_campaigns SET total_sent = total_sent + amount WHERE id = c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_campaign_total_sent(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_total_sent(uuid, int) TO service_role;
