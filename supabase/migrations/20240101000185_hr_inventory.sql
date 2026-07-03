create table if not exists public.employees (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  id_number text,
  role text,
  department text,
  employment_type text default 'full_time'
    check (employment_type in ('full_time','part_time','contractor','intern')),
  start_date date,
  salary numeric(15,2) default 0,
  salary_frequency text default 'monthly'
    check (salary_frequency in ('monthly','weekly','hourly')),
  status text default 'active'
    check (status in ('active','inactive','terminated')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null
    check (leave_type in ('annual','sick','maternity','paternity','family','unpaid','study')),
  start_date date not null,
  end_date date not null,
  days_count integer not null,
  reason text,
  status text default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.payroll_runs (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  period_label text not null,
  status text default 'draft'
    check (status in ('draft','processing','paid','cancelled')),
  total_gross numeric(15,2) default 0,
  total_paye numeric(15,2) default 0,
  total_uif numeric(15,2) default 0,
  total_sdl numeric(15,2) default 0,
  total_net numeric(15,2) default 0,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.payslips (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  gross_salary numeric(15,2) default 0,
  paye numeric(15,2) default 0,
  uif_employee numeric(15,2) default 0,
  uif_employer numeric(15,2) default 0,
  sdl numeric(15,2) default 0,
  net_salary numeric(15,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.time_entries (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  project_name text,
  description text not null,
  date date not null default current_date,
  hours numeric(5,2) not null,
  billable boolean default true,
  hourly_rate numeric(10,2) default 0,
  billed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  sku text,
  description text,
  category text,
  unit text default 'unit',
  quantity_in_stock integer default 0,
  reorder_level integer default 5,
  cost_price numeric(10,2) default 0,
  selling_price numeric(10,2) default 0,
  supplier text,
  status text default 'active'
    check (status in ('active','discontinued','out_of_stock')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS on all tables
alter table public.employees enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payslips enable row level security;
alter table public.time_entries enable row level security;
alter table public.inventory_items enable row level security;

-- Policies
drop policy if exists "workspace members manage employees" on public.employees;
create policy "workspace members manage employees"
  on public.employees for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage leave_requests" on public.leave_requests;
create policy "workspace members manage leave_requests"
  on public.leave_requests for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage payroll_runs" on public.payroll_runs;
create policy "workspace members manage payroll_runs"
  on public.payroll_runs for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage payslips" on public.payslips;
create policy "workspace members manage payslips"
  on public.payslips for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage time_entries" on public.time_entries;
create policy "workspace members manage time_entries"
  on public.time_entries for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

drop policy if exists "workspace members manage inventory_items" on public.inventory_items;
create policy "workspace members manage inventory_items"
  on public.inventory_items for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
