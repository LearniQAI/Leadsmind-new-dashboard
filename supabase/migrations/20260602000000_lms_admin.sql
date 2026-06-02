-- Migration: LMS Admin Backend Upgrade
-- File: supabase/migrations/20260602000000_lms_admin.sql

-- Drop legacy and V2 tables in correct dependency order to avoid schema clashes
drop table if exists public.lms_automation_rules cascade;
drop table if exists public.quiz_attempts cascade;
drop table if exists public.quiz_settings cascade;
drop table if exists public.quiz_questions cascade;
drop table if exists public.course_lessons cascade;
drop table if exists public.course_modules cascade;
drop table if exists public.quizzes cascade;

-- Course modules with full metadata
create table if not exists public.course_modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  workspace_id uuid not null,
  title text not null,
  description text,
  icon text default '📚',
  publish_status text default 'draft'
    check (publish_status in ('published', 'draft', 'coming_soon')),
  nqf_level text,
  required_for_completion boolean default true,
  drip_days integer default 0,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lessons inside modules
create table if not exists public.course_lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null,
  workspace_id uuid not null,
  title text not null,
  lesson_type text not null
    check (lesson_type in (
      'text','video','quiz','assignment','pdf',
      'audio','live_session','flashcards','code','scorm'
    )),
  content jsonb default '{}',
  position integer default 0,
  is_preview boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Quiz questions
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  workspace_id uuid not null,
  question_type text not null
    check (question_type in (
      'mcq','true_false','short_answer','matching',
      'ordering','fill_blank','code','file_upload'
    )),
  question_text text not null,
  options jsonb default '[]',
  correct_answer jsonb,
  explanation text,
  points integer default 1,
  position integer default 0,
  created_at timestamptz default now()
);

-- Quiz settings per lesson
create table if not exists public.quiz_settings (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid not null unique references public.course_lessons(id) on delete cascade,
  time_limit_minutes integer,
  max_attempts integer default 3,
  pass_percentage integer default 70,
  show_answers_after text default 'submission'
    check (show_answers_after in ('submission','never','after_due')),
  randomize_questions boolean default false,
  publish_status text default 'draft'
    check (publish_status in ('active','draft','scheduled')),
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

-- Student quiz attempts
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid not null,
  student_id uuid not null,
  workspace_id uuid not null,
  answers jsonb default '{}',
  score integer,
  max_score integer,
  percentage numeric,
  passed boolean,
  time_taken_seconds integer,
  submitted_at timestamptz default now()
);

-- LMS automation rules
create table if not exists public.lms_automation_rules (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'course_completed','lesson_completed','quiz_passed',
    'quiz_failed','module_completed','enrollment_created',
    'certificate_issued','struggling_detected'
  )),
  trigger_config jsonb default '{}',
  action_type text not null check (action_type in (
    'enroll_course','revoke_course','enroll_bundle',
    'grant_community','add_tag','send_email',
    'send_whatsapp','assign_certificate','notify_instructor'
  )),
  action_config jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS on all new tables
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_settings enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lms_automation_rules enable row level security;

-- RLS policies (workspace_members pattern)
create policy "workspace members access course_modules"
  on public.course_modules for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members access course_lessons"
  on public.course_lessons for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members access quiz_questions"
  on public.quiz_questions for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members access quiz_settings"
  on public.quiz_settings for all
  using (lesson_id in (
    select id from public.course_lessons where workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  ));

create policy "workspace members access quiz_attempts"
  on public.quiz_attempts for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members access lms_automation_rules"
  on public.lms_automation_rules for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
