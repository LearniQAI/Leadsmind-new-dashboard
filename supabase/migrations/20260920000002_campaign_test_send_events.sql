-- Test-send rate limiting. sendTestEmailAction sends through the workspace's own
-- Resend key to an arbitrary address, so without a cap it could be used to
-- mass-email strangers and bypass the campaign compliance gates. Durable
-- (DB-backed, like lena_rate_limit_events) because an in-memory counter resets
-- per serverless instance and is not a real cap.
create table if not exists public.campaign_test_send_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  recipient text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_test_send_events_ws_window
  on public.campaign_test_send_events (workspace_id, created_at desc);
create index if not exists idx_campaign_test_send_events_recipient_window
  on public.campaign_test_send_events (workspace_id, recipient, created_at desc);

-- Server-side (service role) only: no user-facing policy.
alter table public.campaign_test_send_events enable row level security;
