-- Migration: Student Experience and Progress
-- File: supabase/migrations/20260602000002_student_experience.sql

-- Course lesson progress for upgraded LMS (references course_lessons)
create table if not exists public.course_progress (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Unique index to prevent duplicate completion logs per lesson per student
create unique index if not exists idx_progress_contact_lesson on public.course_progress(contact_id, lesson_id);

-- Enable RLS
alter table public.course_progress enable row level security;

-- Policies for course_progress
create policy "workspace members access course_progress"
  on public.course_progress for all
  using (exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = course_progress.workspace_id
    and workspace_members.user_id = auth.uid()
  ));

create policy "students read own course_progress"
  on public.course_progress for select
  using (exists (
    select 1 from public.contacts
    where contacts.id = course_progress.contact_id
    and contacts.email = auth.jwt() ->> 'email'
  ));

create policy "students insert own course_progress"
  on public.course_progress for insert
  with check (exists (
    select 1 from public.contacts
    where contacts.id = course_progress.contact_id
    and contacts.email = auth.jwt() ->> 'email'
  ));

create policy "students delete own course_progress"
  on public.course_progress for delete
  using (exists (
    select 1 from public.contacts
    where contacts.id = course_progress.contact_id
    and contacts.email = auth.jwt() ->> 'email'
  ));

-- Ensure enrollments table RLS is open to student access
alter table public.enrollments enable row level security;

-- Drop policy if it exists to avoid clashes
drop policy if exists "students read own enrollments" on public.enrollments;
drop policy if exists "students self-register enrollments" on public.enrollments;

create policy "students read own enrollments"
  on public.enrollments for select
  using (exists (
    select 1 from public.contacts
    where contacts.id = enrollments.contact_id
    and contacts.email = auth.jwt() ->> 'email'
  ));

create policy "students self-register enrollments"
  on public.enrollments for insert
  with check (exists (
    select 1 from public.contacts
    where contacts.id = enrollments.contact_id
    and contacts.email = auth.jwt() ->> 'email'
  ));

