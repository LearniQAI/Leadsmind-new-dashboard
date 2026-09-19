-- Domain squatting fix: ownership is proven (TXT token) BEFORE a hostname is attached to Vercel,
-- and only a PROVEN claim is exclusive. Many workspaces may hold an unproven claim on the same
-- hostname; the first to pass its own TXT check wins, and a proven claim can never be reclaimed.

alter table public.domain_configurations
  add column if not exists ownership_verified_at timestamptz;
alter table public.builder_published_domains
  add column if not exists ownership_verified_at timestamptz;

-- Rows that were already fully verified under the old flow count as proven.
update public.domain_configurations
  set ownership_verified_at = verified_at
  where status = 'active' and verified_at is not null and ownership_verified_at is null;
update public.builder_published_domains
  set ownership_verified_at = updated_at
  where verified = true and ownership_verified_at is null;

-- Global hostname uniqueness -> uniqueness among PROVEN claims + one claim per workspace.
alter table public.domain_configurations drop constraint if exists domain_configurations_hostname_key;
alter table public.builder_published_domains drop constraint if exists builder_published_domains_domain_name_key;

create unique index if not exists uq_domain_configurations_hostname_proven
  on public.domain_configurations (hostname) where ownership_verified_at is not null;
create unique index if not exists uq_builder_published_domains_name_proven
  on public.builder_published_domains (domain_name) where ownership_verified_at is not null;

create unique index if not exists uq_domain_configurations_ws_hostname
  on public.domain_configurations (workspace_id, hostname);
create unique index if not exists uq_builder_published_domains_ws_name
  on public.builder_published_domains (workspace_id, domain_name);
