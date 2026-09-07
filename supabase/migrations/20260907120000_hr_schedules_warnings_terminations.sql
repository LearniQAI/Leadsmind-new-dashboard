-- Task 44 foundation: schedules, warnings, terminations for the real /hr module.
-- Follows the exact workspace-scoping + RLS pattern established in
-- 20240101000185_hr_inventory.sql (employees, leave_requests, payroll_runs, ...).
-- Application-level role gating (admin/owner/hr) happens in the API routes via
-- requireWorkspaceRole(), same as the rest of /api/hr/*; RLS here is the
-- workspace-membership backstop, not the primary authorization layer.

create table if not exists public.schedules (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  days_of_week text[] not null default '{mon,tue,wed,thu,fri}'
    check (days_of_week <@ array['mon','tue','wed','thu','fri','sat','sun']),
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  standard_hours_per_day numeric(4,2) not null default 8,
  overtime_threshold_hours numeric(5,2) not null default 40,
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- An employee's current assigned schedule (nullable — not every employee needs one
-- assigned immediately, and this must not block existing employee create/update flows).
alter table public.employees
  add column if not exists schedule_id uuid references public.schedules(id) on delete set null;

create table if not exists public.warnings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  issued_by uuid references auth.users(id),
  reason text not null,
  notes text,
  warning_date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists public.terminations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  termination_date date not null default current_date,
  last_working_day date,
  reason text not null,
  rehire_eligible boolean not null default true,
  notes text,
  processed_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists schedules_workspace_id_idx on public.schedules(workspace_id);
create index if not exists warnings_workspace_id_idx on public.warnings(workspace_id);
create index if not exists warnings_employee_id_idx on public.warnings(employee_id);
create index if not exists terminations_workspace_id_idx on public.terminations(workspace_id);
create index if not exists terminations_employee_id_idx on public.terminations(employee_id);
create index if not exists employees_schedule_id_idx on public.employees(schedule_id);

alter table public.schedules enable row level security;
alter table public.warnings enable row level security;
alter table public.terminations enable row level security;

drop policy if exists "workspace members manage schedules" on public.schedules;
create policy "workspace members manage schedules"
  on public.schedules for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage warnings" on public.warnings;
create policy "workspace members manage warnings"
  on public.warnings for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage terminations" on public.terminations;
create policy "workspace members manage terminations"
  on public.terminations for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
