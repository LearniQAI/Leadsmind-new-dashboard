-- Deleting a custom domain used to fail outright (FK violation) whenever a course referenced it.
-- Now the reference is nulled atomically with the delete: the course keeps working and falls
-- back to the default platform domain (courses.domain_id IS NULL is the existing "default
-- domain" state — see lms.ts / the unauthenticated course route). url_path is left as-is; it only
-- has meaning together with a domain_id (idx_courses_domain_urlpath is partial on both).
alter table public.courses drop constraint if exists courses_domain_id_fkey;
alter table public.courses
  add constraint courses_domain_id_fkey
  foreign key (domain_id) references public.domain_configurations(id) on delete set null;
