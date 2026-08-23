-- Public LENA traffic is metered before a conversation exists so rotating UUIDs cannot evade limits.
create table if not exists public.lena_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ip_hash text not null,
  fingerprint_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lena_rate_limit_events_ip_window
  on public.lena_rate_limit_events (workspace_id, ip_hash, created_at desc);
create index if not exists idx_lena_rate_limit_events_fingerprint_window
  on public.lena_rate_limit_events (workspace_id, fingerprint_hash, created_at desc);

alter table public.lena_rate_limit_events enable row level security;
