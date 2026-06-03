create table if not exists public.kyc_consent_records (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'identity_verification', 'credit_check', 'sanctions_screen', 'full_kyc'
  )),
  status text default 'pending' check (status in ('pending','obtained','withdrawn')),
  obtained_at timestamptz,
  obtained_by uuid references auth.users(id),
  reference text,
  created_at timestamptz default now()
);

create table if not exists public.kyc_checks (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  check_type text not null check (check_type in (
    'hanis_identity', 'credit_report', 'sanctions_screen',
    'pep_check', 'address_verification', 'biometric'
  )),
  provider text not null,
  status text default 'pending' check (status in (
    'pending', 'running', 'passed', 'failed', 'manual_review', 'error'
  )),
  -- HANIS/Identity fields
  id_valid boolean,
  name_match boolean,
  alive_status text,
  fraud_indicator boolean,
  -- Credit fields
  credit_score integer,
  credit_risk_grade text,
  -- Sanctions
  on_sanctions_list boolean,
  is_pep boolean,
  -- Meta
  provider_reference text,
  notes text,
  consent_id uuid references public.kyc_consent_records(id),
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  raw_response jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.kyc_consent_records enable row level security;
alter table public.kyc_checks enable row level security;

drop policy if exists "workspace members manage kyc_consent_records" on public.kyc_consent_records;
create policy "workspace members manage kyc_consent_records"
  on public.kyc_consent_records for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage kyc_checks" on public.kyc_checks;
create policy "workspace members manage kyc_checks"
  on public.kyc_checks for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
