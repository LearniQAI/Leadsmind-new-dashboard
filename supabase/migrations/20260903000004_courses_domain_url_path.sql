-- Phase A, Migration 2: domain/URL fields on courses.
-- Real domains table confirmed via audit: domain_configurations (workspace-scoped
-- custom domain routing table, distinct from sender_domains and
-- builder_published_domains — see src/app/actions/domains.ts comment).
alter table courses add column domain_id uuid references domain_configurations(id);
alter table courses add column url_path text;
create unique index idx_courses_domain_urlpath
  on courses(domain_id, url_path)
  where domain_id is not null and url_path is not null;
