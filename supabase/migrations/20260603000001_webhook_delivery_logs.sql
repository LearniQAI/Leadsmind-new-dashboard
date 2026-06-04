create table if not exists public.webhook_delivery_logs (
  id uuid default gen_random_uuid() primary key,
  webhook_id uuid references public.workspace_webhooks(id) on delete cascade,
  workspace_id uuid not null,
  event text not null,
  payload jsonb default '{}',
  response_status integer default 0,
  success boolean default false,
  error_message text,
  delivered_at timestamptz default now()
);

alter table public.webhook_delivery_logs enable row level security;

create policy "workspace members view delivery logs"
  on public.webhook_delivery_logs for select
  using (workspace_id in (
    select workspace_id from public.workspace_members
    where user_id = auth.uid()
  ));

-- Auto-clean logs older than 30 days (keep table small)
create index if not exists idx_webhook_logs_workspace
  on public.webhook_delivery_logs(workspace_id, delivered_at desc);
