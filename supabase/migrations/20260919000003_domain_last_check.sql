-- Store the outcome of the most recent verification attempt (manual Verify click or the
-- background re-check cron) so the UI can show WHY a domain isn't active yet, instead of a
-- static "Pending" with no diagnostic.
alter table public.domain_configurations
  add column if not exists last_check_at timestamptz,
  add column if not exists last_check_error text;
alter table public.builder_published_domains
  add column if not exists last_check_at timestamptz,
  add column if not exists last_check_error text;

-- The cron scans unverified rows oldest-checked first.
create index if not exists idx_domain_configurations_pending_scan
  on public.domain_configurations (last_check_at nulls first)
  where status <> 'active';
create index if not exists idx_builder_published_domains_pending_scan
  on public.builder_published_domains (last_check_at nulls first)
  where verified is not true;
