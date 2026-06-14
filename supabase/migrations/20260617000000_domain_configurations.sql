create table if not exists public.domain_configurations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  hostname varchar(253) not null unique,
  domain_type text not null default 'subdomain' check (domain_type in ('apex','subdomain','wildcard')),
  status text not null default 'pending' check (status in ('pending','verifying','ssl_provisioning','active','error')),
  ssl_provider text check (ssl_provider in ('cloudflare','letsencrypt')),
  ssl_expires_at timestamptz,
  verification_token varchar(64),
  verified_at timestamptz,
  routing_config jsonb not null default '{}',     -- { crm:'/', lms:'/learn', accounting:'/billing' } or subdomain map
  cloudflare_hostname_id text,                    -- Cloudflare for SaaS custom_hostname id
  health_last_checked timestamptz,
  health_status text default 'healthy' check (health_status in ('healthy','degraded','down')),
  is_email_sender boolean not null default false, -- SPF/DKIM/DMARC provisioned
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_domain_hostname on public.domain_configurations(hostname);
create index if not exists idx_domain_ws on public.domain_configurations(workspace_id);
