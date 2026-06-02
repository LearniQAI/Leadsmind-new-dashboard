-- Third party integrations per workspace
create table if not exists public.workspace_integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  category text not null check (category in (
    'bank', 'payment_gateway', 'tax_government',
    'identity_verification', 'credit_bureau', 'fraud_screening',
    'email_calendar', 'communication', 'automation',
    'ecommerce', 'marketing', 'analytics', 'courier'
  )),
  connected boolean default false,
  credentials jsonb default '{}',
  account_label text,
  connected_at timestamptz,
  updated_at timestamptz default now(),
  unique(workspace_id, provider)
);

alter table public.workspace_integrations enable row level security;

create policy "workspace members can view integrations"
  on public.workspace_integrations for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "workspace members can manage integrations"
  on public.workspace_integrations for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- API keys per workspace
create table if not exists public.workspace_api_keys (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  label text default 'Default',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked boolean default false
);

alter table public.workspace_api_keys enable row level security;

create policy "workspace members can view api keys"
  on public.workspace_api_keys for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- Webhooks per workspace
create table if not exists public.workspace_webhooks (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null,
  label text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.workspace_webhooks enable row level security;

create policy "workspace members can manage webhooks"
  on public.workspace_webhooks for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );
