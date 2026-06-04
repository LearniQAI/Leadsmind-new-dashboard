create table if not exists public.bank_connections (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_name text not null,
  connection_type text not null check (connection_type in (
    'investec_oauth', 'absa_oauth', 'capitec_pilot', 'csv_upload'
  )),
  client_id text,
  client_secret_encrypted text,
  api_key_encrypted text,
  access_token_encrypted text,
  token_expires_at timestamptz,
  account_id text,
  account_name text,
  account_type text,
  account_number_last4 text,
  balance numeric(15,2) default 0,
  currency text default 'ZAR',
  status text default 'active'
    check (status in ('active','disconnected','error','pending')),
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, bank_name)
);

alter table public.bank_connections enable row level security;

create policy "workspace members manage bank_connections"
  on public.bank_connections for all
  using (workspace_id in (
    select workspace_id from public.workspace_members
    where user_id = auth.uid()
  ));
