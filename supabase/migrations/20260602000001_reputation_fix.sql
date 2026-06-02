-- Create reputation_campaigns table
create table if not exists public.reputation_campaigns (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  review_platform text not null
    check (review_platform in ('google','facebook','trustpilot','hellopeter','custom')),
  review_url text not null,
  email_subject text not null,
  email_body text not null,
  sms_body text,
  whatsapp_body text,
  status text default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create reputation_requests table
create table if not exists public.reputation_requests (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.reputation_campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  contact_email text,
  contact_name text,
  contact_phone text,
  channel text not null check (channel in ('email','sms','whatsapp')),
  status text default 'sent'
    check (status in ('sent','opened','clicked','reviewed','bounced')),
  sent_at timestamptz default now(),
  opened_at timestamptz,
  clicked_at timestamptz
);

-- Create reputation_reviews table
create table if not exists public.reputation_reviews (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null,
  reviewer_name text,
  rating integer check (rating between 1 and 5),
  review_text text,
  review_url text,
  reply_text text,
  replied boolean default false,
  replied_at timestamptz,
  verified boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.reputation_campaigns enable row level security;
alter table public.reputation_requests enable row level security;
alter table public.reputation_reviews enable row level security;

-- Drop existing policies if they exist and recreate
drop policy if exists "workspace members manage reputation_campaigns" on public.reputation_campaigns;
create policy "workspace members manage reputation_campaigns"
  on public.reputation_campaigns for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage reputation_requests" on public.reputation_requests;
create policy "workspace members manage reputation_requests"
  on public.reputation_requests for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage reputation_reviews" on public.reputation_reviews;
create policy "workspace members manage reputation_reviews"
  on public.reputation_reviews for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
