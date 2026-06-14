create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tracking_number text not null,
  courier_slug text,                         -- aftership/courier slug, null until detected
  contact_id uuid references public.contacts(id) on delete set null, -- recipient
  recipient_email text,
  recipient_name text,
  source text not null default 'manual' check (source in ('manual','api','invoice','csv')),
  source_id uuid,                            -- invoice id when source='invoice'
  status text not null default 'PENDING',    -- normalised 8-status model
  raw_status text,                           -- last raw courier status string
  last_location text,
  estimated_delivery date,
  active boolean not null default true,      -- false once delivered/exception-closed
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, tracking_number)
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.courier_shipments(id) on delete cascade,
  workspace_id uuid not null,
  normalised_status text not null,
  raw_status text,
  location text,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications_sent (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.courier_shipments(id) on delete cascade,
  workspace_id uuid not null,
  audience text not null check (audience in ('recipient','admin')),
  normalised_status text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.courier_brand_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  logo_url text,
  brand_colour text default '#0b1310',
  tagline text,
  from_name text,
  from_email text,                           -- custom sender (white-label tiers)
  custom_track_domain text,                  -- track.theirdomain.co.za
  white_label boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_poll_queue (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.courier_shipments(id) on delete cascade,
  next_poll_at timestamptz not null default now(),
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipments_ws_active on public.courier_shipments(workspace_id) where active = true;
create index if not exists idx_poll_due on public.tracking_poll_queue(next_poll_at);
