-- Persisted certificate records for the student "My Certificates" section + public
-- verification.
--
-- A FRESH, minimal table — deliberately NOT the dead lms_certificates /
-- lms_certificate_templates scaffolding (migrations 47/56/156, zero code references, zero
-- rows — see student-portal-audit.md). The certificate PDF is still generated on demand by
-- /api/student/courses/[id]/certificate with its existing hard-coded layout; this table
-- records that a student earned one, with a STABLE validation_id generated once.
--
-- Before this table, the route minted a fresh Math.random() validation_id (and a fresh
-- completion date) on every single download — so the "id" printed on the PDF was never
-- actually verifiable. Now: one row per (contact, course); first generation writes the row,
-- every later download reuses its validation_id / issued_at / name+title snapshots so the
-- certificate identity and displayed info are stable even if the student later renames
-- themselves or the course title changes.

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  workspace_id uuid not null,
  validation_id text not null unique,
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (contact_id, course_id)
);

create index if not exists idx_course_certificates_contact on public.course_certificates(contact_id);
create index if not exists idx_course_certificates_course on public.course_certificates(course_id);
create index if not exists idx_course_certificates_workspace on public.course_certificates(workspace_id);

alter table public.course_certificates enable row level security;

-- Standard two-policy workspace scoping (same shape as course_progress, migration 177):
-- workspace members (admins/instructors) manage every certificate in their workspace...
create policy "workspace members access course_certificates"
  on public.course_certificates for all
  using (exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = course_certificates.workspace_id
      and workspace_members.user_id = auth.uid()
  ));

-- ...and a student may read ONLY their own certificate rows, matched via the email on the
-- contact the row belongs to (identical to the "students read own course_progress" policy).
create policy "students read own course_certificates"
  on public.course_certificates for select
  using (exists (
    select 1 from public.contacts
    where contacts.id = course_certificates.contact_id
      and contacts.email = auth.jwt() ->> 'email'
  ));

-- No student INSERT/UPDATE/DELETE policy: rows are written only by the certificate API route
-- via the service-role client, after it re-verifies 100% lesson completion (completed_at IS
-- NOT NULL) + every attached quiz passed. A student can never self-issue or alter one.
