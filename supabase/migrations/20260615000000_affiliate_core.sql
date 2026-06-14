create table if not exists public.affiliate_programmes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  programme_type text not null default 'client' check (programme_type in ('leadsmind_own','client')),
  status text not null default 'active' check (status in ('active','paused','archived')),
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed','recurring')),
  commission_value numeric not null default 0,          -- percent or ZAR amount
  recurring boolean not null default false,
  cookie_days integer not null default 7,               -- 7/30/90/365/0(unlimited)
  attribution_model text not null default 'last_click' check (attribution_model in ('first_click','last_click')),
  two_tier_enabled boolean not null default false,
  tier2_override_percent numeric not null default 0,    -- e.g. 5 (% of tier1 earning)
  approval_mode text not null default 'manual' check (approval_mode in ('auto_all','auto_rules','manual')),
  approval_rules jsonb not null default '{}',
  registration_settings jsonb not null default '{}',    -- logo, benefits copy, custom questions, terms
  currency text not null default 'ZAR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.affiliate_programmes(id) on delete cascade,
  workspace_id uuid not null,
  parent_affiliate_id uuid references public.affiliates(id) on delete set null, -- two-tier
  email text not null,
  password_hash text not null,            -- standalone portal login (bcrypt/scrypt)
  full_name text,
  phone text,
  short_code text unique not null,        -- referral code in /r/{code}
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  application_answers jsonb not null default '{}',
  payout_method text check (payout_method in ('payfast','bank_eft','account_credit')),
  payout_details jsonb not null default '{}',  -- encrypted at app layer
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (programme_id, email)
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  programme_id uuid not null,
  workspace_id uuid not null,
  ip_hash text,                           -- hashed IP, never raw
  user_agent text,
  landing_url text,
  is_unique boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  programme_id uuid not null,
  workspace_id uuid not null,
  tier integer not null default 1 check (tier in (1,2)),
  source_type text not null,              -- 'order' | 'invoice' | 'subscription'
  source_id uuid,
  contact_id uuid,
  amount numeric not null,                -- ZAR commission
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','approved','reversed','paid')),
  recurring_month integer,                -- null for one-time, 1..n for recurring
  hold_until timestamptz,                 -- refund window
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  workspace_id uuid not null,
  amount numeric not null,
  currency text not null default 'ZAR',
  method text not null check (method in ('payfast','bank_eft','account_credit')),
  status text not null default 'requested' check (status in ('requested','processing','paid','failed')),
  commission_ids uuid[] not null default '{}',
  reference text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliates_short_code on public.affiliates(short_code);
create index if not exists idx_aff_comm_aff_status on public.affiliate_commissions(affiliate_id, status);
create index if not exists idx_aff_clicks_aff on public.affiliate_clicks(affiliate_id, created_at desc);
