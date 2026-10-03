-- CE1 / M1: WhatsApp marketing consent evidence.
--
-- A consent record is evidence that a specific person agreed, for a specific business (workspace) and a specific phone
-- number, to receive WhatsApp marketing. These tables are written ONLY by the service role and by SECURITY DEFINER
-- functions (M2). No client (anon or authenticated) has any grant and there are no policies, so a member, an import, an
-- API key or a tag write cannot create or alter consent. Nothing here is backfilled: existing contacts have no consent
-- record and therefore are not eligible.
--
-- Evidence columns are immutable (trigger below). Only status, revoked_at, revoke_reason and contact_id may change, and a
-- REVOKED record can never become live again; a new consent must be a new row created through the consent flow.

create table if not exists public.whatsapp_consent_records (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  contact_id            uuid references public.contacts(id) on delete set null,
  phone_e164            text not null,
  consent_type          text not null default 'MARKETING_WHATSAPP',
  status                text not null check (status in ('PENDING_VERIFICATION', 'ACTIVE', 'REVOKED')),
  source_type           text not null,
  source_id             uuid,
  source_url            text,
  form_version_id       uuid,
  consent_text          text not null,
  consent_text_version  text not null,
  terms_version         text,
  privacy_version       text,
  consented_at          timestamptz not null,
  timezone              text,
  ip_hash               text,
  user_agent            text,
  revoked_at            timestamptz,
  revoke_reason         text,
  created_at            timestamptz not null default now()
);

-- One live (pending or active) consent per workspace + number + type. Two concurrent creators can only produce one row.
create unique index if not exists whatsapp_consent_one_live_per_number
  on public.whatsapp_consent_records (workspace_id, phone_e164, consent_type)
  where status in ('PENDING_VERIFICATION', 'ACTIVE');

create index if not exists whatsapp_consent_workspace_phone
  on public.whatsapp_consent_records (workspace_id, phone_e164);

create index if not exists whatsapp_consent_workspace_contact
  on public.whatsapp_consent_records (workspace_id, contact_id);

-- Append-only by convention: nothing in the application updates or deletes events.
create table if not exists public.whatsapp_consent_events (
  id            uuid primary key default gen_random_uuid(),
  consent_id    uuid not null references public.whatsapp_consent_records(id) on delete cascade,
  workspace_id  uuid not null,
  event         text not null,
  actor         text,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists whatsapp_consent_events_consent
  on public.whatsapp_consent_events (consent_id, created_at);

-- Immutability of the evidence. Raises on purpose: this trigger lives on a NEW table that only trusted code writes to, and a
-- rejected evidence edit must be loud. It never runs on any pre-existing table.
create or replace function public.wa_consent_records_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.workspace_id          is distinct from old.workspace_id
     or new.phone_e164         is distinct from old.phone_e164
     or new.consent_type       is distinct from old.consent_type
     or new.source_type        is distinct from old.source_type
     or new.source_id          is distinct from old.source_id
     or new.source_url         is distinct from old.source_url
     or new.form_version_id    is distinct from old.form_version_id
     or new.consent_text       is distinct from old.consent_text
     or new.consent_text_version is distinct from old.consent_text_version
     or new.terms_version      is distinct from old.terms_version
     or new.privacy_version    is distinct from old.privacy_version
     or new.consented_at       is distinct from old.consented_at
     or new.timezone           is distinct from old.timezone
     or new.ip_hash            is distinct from old.ip_hash
     or new.user_agent         is distinct from old.user_agent
     or new.created_at         is distinct from old.created_at
     or new.id                 is distinct from old.id then
    raise exception 'whatsapp_consent_records evidence columns are immutable' using errcode = 'P0001';
  end if;
  if old.status = 'REVOKED' and new.status is distinct from 'REVOKED' then
    raise exception 'a REVOKED whatsapp consent can never become live again; record a new consent instead' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists whatsapp_consent_records_immutable on public.whatsapp_consent_records;
create trigger whatsapp_consent_records_immutable
  before update on public.whatsapp_consent_records
  for each row execute function public.wa_consent_records_immutable();

-- Lock the tables down: RLS on, no policies, no client grants.
alter table public.whatsapp_consent_records enable row level security;
alter table public.whatsapp_consent_events  enable row level security;

revoke all on table public.whatsapp_consent_records from public, anon, authenticated;
revoke all on table public.whatsapp_consent_events  from public, anon, authenticated;

revoke execute on function public.wa_consent_records_immutable() from public, anon, authenticated;
