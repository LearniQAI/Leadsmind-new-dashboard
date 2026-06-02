-- Drop existing tables to ensure schema matches the new chat widget requirements
drop table if exists public.lena_messages cascade;
drop table if exists public.lena_conversations cascade;
drop table if exists public.lena_configs cascade;
drop table if exists public.lena_knowledge_base cascade;
drop table if exists public.lena_agents cascade;

create table if not exists public.lena_configs (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null unique,
  bot_name text default 'LENA',
  bot_avatar_url text,
  welcome_message text default 'Hi there! I am LENA. How can I help you today?',
  tone text default 'friendly' check (tone in ('formal','friendly','professional','casual')),
  language text default 'english',
  primary_color text default '#6366F1',
  position text default 'right' check (position in ('left','right')),
  office_hours jsonb default '{}',
  quick_replies jsonb default '[]',
  trigger_rules jsonb default '[]',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lena_knowledge_base (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  title text not null,
  content text not null,
  category text,
  always_include boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lena_agents (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  user_id uuid references auth.users(id),
  display_name text not null,
  role_label text,
  avatar_url text,
  availability text default 'offline'
    check (availability in ('online','offline','busy')),
  routing_topics text[] default '{}',
  working_hours jsonb default '{}',
  avg_response_minutes integer default 5,
  created_at timestamptz default now()
);

create table if not exists public.lena_conversations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  visitor_id text not null,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  crm_contact_id uuid,
  page_url text,
  status text default 'active'
    check (status in ('active','waiting_agent','with_agent','resolved')),
  assigned_agent_id uuid references public.lena_agents(id),
  mode text default 'ai' check (mode in ('ai','human')),
  lead_captured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lena_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.lena_conversations(id) on delete cascade,
  workspace_id uuid not null,
  sender_type text not null check (sender_type in ('visitor','ai','agent','system')),
  sender_id text,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.lena_configs enable row level security;
alter table public.lena_knowledge_base enable row level security;
alter table public.lena_agents enable row level security;
alter table public.lena_conversations enable row level security;
alter table public.lena_messages enable row level security;

-- RLS policies using workspace_members pattern
create policy "workspace members manage lena_configs"
  on public.lena_configs for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members manage lena_knowledge_base"
  on public.lena_knowledge_base for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members manage lena_agents"
  on public.lena_agents for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members manage lena_conversations"
  on public.lena_conversations for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));

create policy "workspace members manage lena_messages"
  on public.lena_messages for all
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
