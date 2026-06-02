-- Migration for Contact Verifications (KYC/FICA)
create table if not exists public.contact_verifications (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  verification_type text not null check (verification_type in (
    'id_check', 'credit_report', 'sanctions_screen',
    'pep_check', 'biometric', 'address_check'
  )),
  provider text not null,
  status text default 'pending' check (status in (
    'pending', 'running', 'passed', 'failed', 'manual_review'
  )),
  result jsonb default '{}',
  notes text,
  consent_given boolean default false,
  consent_given_at timestamptz,
  ran_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contact_verifications enable row level security;

drop policy if exists "workspace members manage contact_verifications" on public.contact_verifications;
create policy "workspace members manage contact_verifications"
  on public.contact_verifications for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
