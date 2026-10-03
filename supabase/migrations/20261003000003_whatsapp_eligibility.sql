-- CE1 / M2: suppression, revoke triggers, consent recording and the ONE eligibility function.
--
-- INVARIANT: a contact is WhatsApp-marketing eligible only if an ACTIVE consent record exists for THIS workspace and the
-- contact's CURRENT phone_e164, and nothing suppresses that number. Eligibility is derived here, at read time, from consent
-- plus suppression. It is never stored as a decision input and never read from contacts.opted_in, tags or any client value.
--
-- Everything below is SECURITY DEFINER with a pinned search_path and is executable by service_role only.

-- 1. Suppression ------------------------------------------------------------------------------------------------------
create table if not exists public.whatsapp_suppressions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  phone_e164    text not null,
  contact_id    uuid references public.contacts(id) on delete set null,
  reason        text not null check (reason in (
                  'USER_OPTED_OUT', 'USER_BLOCKED_BUSINESS', 'USER_REPORTED_BUSINESS',
                  'CONSENT_REVOKED', 'ADMIN_BLOCK', 'POLICY_BLOCK', 'INVALID_NUMBER')),
  source        text,
  suppressed_at timestamptz not null default now(),
  unique (workspace_id, phone_e164, reason)
);

alter table public.whatsapp_suppressions enable row level security;
revoke all on table public.whatsapp_suppressions from public, anon, authenticated;

-- Supports the "any contact on this number opted out" lookup inside wa_marketing_eligible without scanning contacts.
create index if not exists idx_contacts_optout_phone
  on public.contacts (workspace_id, phone_e164)
  where phone_e164 is not null and (opted_out is true or sms_opt_out is true);

-- 2. Revoke -----------------------------------------------------------------------------------------------------------
-- Idempotent. Revokes every live consent for the number, records a suppression and one event per revoked consent.
create or replace function public.wa_revoke_consent(p_workspace uuid, p_phone text, p_reason text, p_source text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := public.normalize_phone_e164(p_phone);
  v_count integer := 0;
begin
  if p_workspace is null or v_phone is null then
    return 0;
  end if;
  if p_reason is null or p_reason not in (
       'USER_OPTED_OUT', 'USER_BLOCKED_BUSINESS', 'USER_REPORTED_BUSINESS',
       'CONSENT_REVOKED', 'ADMIN_BLOCK', 'POLICY_BLOCK', 'INVALID_NUMBER') then
    raise exception 'wa_revoke_consent: invalid reason %', p_reason using errcode = '22023';
  end if;

  insert into public.whatsapp_suppressions (workspace_id, phone_e164, reason, source)
  values (p_workspace, v_phone, p_reason, p_source)
  on conflict (workspace_id, phone_e164, reason) do nothing;

  with revoked as (
    update public.whatsapp_consent_records
       set status = 'REVOKED', revoked_at = now(), revoke_reason = p_reason
     where workspace_id = p_workspace
       and phone_e164 = v_phone
       and status in ('PENDING_VERIFICATION', 'ACTIVE')
    returning id, workspace_id
  ), ev as (
    insert into public.whatsapp_consent_events (consent_id, workspace_id, event, actor, detail)
    select id, workspace_id, 'revoked', p_source, jsonb_build_object('reason', p_reason)
      from revoked
    returning 1
  )
  select count(*) into v_count from ev;

  return v_count;
end;
$$;

-- 3. Revoke triggers on existing tables (new triggers only; no existing trigger or function is modified) ----------------
-- Both are narrow, run AFTER the original statement, and can NEVER make it fail: any error is reported with RAISE WARNING
-- (visible in the database log) and the original write proceeds. That is safe because wa_marketing_eligible re-derives
-- suppression from sms_suppression_list and the contact flags at read time, so a trigger failure cannot make a suppressed
-- number eligible; tests prove both paths.

create or replace function public.wa_on_sms_suppression()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- invalid_number (and any deliverability reason) suppresses sending but is NOT a withdrawal of consent.
  if new.reason is distinct from 'invalid_number' then
    perform public.wa_revoke_consent(new.workspace_id, new.phone_e164, 'USER_OPTED_OUT', 'sms_suppression_list:' || coalesce(new.source, new.reason));
  end if;
  return null;
exception when others then
  raise warning 'wa_on_sms_suppression failed (workspace %, sqlstate %): %', new.workspace_id, sqlstate, sqlerrm;
  return null;
end;
$$;

drop trigger if exists wa_sms_suppression_revokes_consent on public.sms_suppression_list;
create trigger wa_sms_suppression_revokes_consent
  after insert or update on public.sms_suppression_list
  for each row execute function public.wa_on_sms_suppression();

create or replace function public.wa_on_contact_opt_out()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.phone_e164 is not null then
    perform public.wa_revoke_consent(new.workspace_id, new.phone_e164, 'USER_OPTED_OUT', 'contacts_flag');
  end if;
  return null;
exception when others then
  raise warning 'wa_on_contact_opt_out failed (contact %, sqlstate %): %', new.id, sqlstate, sqlerrm;
  return null;
end;
$$;

drop trigger if exists wa_contact_opt_out_revokes_consent on public.contacts;
create trigger wa_contact_opt_out_revokes_consent
  after update of opted_out, sms_opt_out on public.contacts
  for each row
  when ((new.opted_out is true and old.opted_out is distinct from true)
     or (new.sms_opt_out is true and old.sms_opt_out is distinct from true))
  execute function public.wa_on_contact_opt_out();

-- 4. Record consent ---------------------------------------------------------------------------------------------------
-- Result codes: created | activated | already_active | already_pending | previously_opted_out | invalid_phone |
--               invalid_contact | invalid_input.
-- Consent can never be flipped back by this function: a number with any REVOKED consent, a USER_OPTED_OUT / CONSENT_REVOKED
-- suppression, or a user opt-out row in sms_suppression_list is refused and nothing is written.
create or replace function public.wa_record_consent(
  p_workspace            uuid,
  p_contact_id           uuid,
  p_phone_e164           text,
  p_status               text,
  p_source_type          text,
  p_source_id            uuid,
  p_source_url           text,
  p_form_version_id      uuid,
  p_consent_text         text,
  p_consent_text_version text,
  p_terms_version        text,
  p_privacy_version      text,
  p_consented_at         timestamptz,
  p_timezone             text,
  p_ip_hash              text,
  p_user_agent           text,
  p_actor                text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := public.normalize_phone_e164(p_phone_e164);
  v_existing record;
  v_id uuid;
begin
  if v_phone is null then
    return 'invalid_phone';
  end if;
  if p_workspace is null
     or p_status is null or p_status not in ('PENDING_VERIFICATION', 'ACTIVE')
     or coalesce(btrim(p_source_type), '') = ''
     or coalesce(btrim(p_consent_text), '') = ''
     or coalesce(btrim(p_consent_text_version), '') = ''
     or p_consented_at is null then
    return 'invalid_input';
  end if;
  if not exists (select 1 from public.workspaces w where w.id = p_workspace) then
    return 'invalid_input';
  end if;
  if p_contact_id is not null
     and not exists (select 1 from public.contacts c where c.id = p_contact_id and c.workspace_id = p_workspace) then
    return 'invalid_contact';
  end if;

  -- A previous withdrawal is permanent.
  if exists (select 1 from public.whatsapp_consent_records r
              where r.workspace_id = p_workspace and r.phone_e164 = v_phone and r.status = 'REVOKED')
     or exists (select 1 from public.whatsapp_suppressions s
              where s.workspace_id = p_workspace and s.phone_e164 = v_phone
                and s.reason in ('USER_OPTED_OUT', 'CONSENT_REVOKED'))
     or exists (select 1 from public.sms_suppression_list l
              where l.workspace_id = p_workspace and l.phone_e164 = v_phone and l.reason is distinct from 'invalid_number') then
    return 'previously_opted_out';
  end if;

  select r.id, r.status into v_existing
    from public.whatsapp_consent_records r
   where r.workspace_id = p_workspace and r.phone_e164 = v_phone
     and r.consent_type = 'MARKETING_WHATSAPP' and r.status in ('PENDING_VERIFICATION', 'ACTIVE')
   limit 1;
  if found then
    if v_existing.status = 'ACTIVE' then
      return 'already_active';
    elsif p_status = 'ACTIVE' then
      update public.whatsapp_consent_records set status = 'ACTIVE' where id = v_existing.id and status = 'PENDING_VERIFICATION';
      insert into public.whatsapp_consent_events (consent_id, workspace_id, event, actor, detail)
      values (v_existing.id, p_workspace, 'activated', p_actor, jsonb_build_object('source_type', p_source_type));
      return 'activated';
    else
      return 'already_pending';
    end if;
  end if;

  insert into public.whatsapp_consent_records (
    workspace_id, contact_id, phone_e164, consent_type, status, source_type, source_id, source_url, form_version_id,
    consent_text, consent_text_version, terms_version, privacy_version, consented_at, timezone, ip_hash, user_agent)
  values (
    p_workspace, p_contact_id, v_phone, 'MARKETING_WHATSAPP', p_status, p_source_type, p_source_id, p_source_url, p_form_version_id,
    p_consent_text, p_consent_text_version, p_terms_version, p_privacy_version, p_consented_at, p_timezone, p_ip_hash, p_user_agent)
  on conflict (workspace_id, phone_e164, consent_type) where status in ('PENDING_VERIFICATION', 'ACTIVE') do nothing
  returning id into v_id;

  if v_id is null then
    -- Lost a race with a concurrent call: exactly one live record exists and it is not ours.
    return 'already_active';
  end if;

  insert into public.whatsapp_consent_events (consent_id, workspace_id, event, actor, detail)
  values (v_id, p_workspace, 'created', p_actor,
          jsonb_build_object('status', p_status, 'source_type', p_source_type, 'consent_text_version', p_consent_text_version));
  return 'created';
end;
$$;

-- 5. THE eligibility function -----------------------------------------------------------------------------------------
-- Returns the contacts of p_workspace that may receive WhatsApp MARKETING right now. Set-based, no per-row loops.
--   * The contact's CURRENT phone_e164 must equal an ACTIVE MARKETING_WHATSAPP consent's phone_e164 in the same workspace
--     (changing the phone voids eligibility; importing or inserting another contact with the number does not create it).
--   * No whatsapp_suppressions row for the number, whatever the reason.
--   * No sms_suppression_list row for the number (user opt-outs and invalid-number rows both suppress).
--   * No contact in the workspace on the same number has opted_out or sms_opt_out set.
--   * contacts.opted_in and tags are NEVER read.
-- p_contact_ids = null considers every contact in the workspace; otherwise only the listed ids that belong to it (foreign
-- ids silently return nothing because the workspace predicate comes first).
--
-- CE2 GATES GO HERE (add by CREATE OR REPLACE of this function, nothing else changes):
--   tenant WhatsApp marketing status (NORMAL/MONITORED ok; RESTRICTED/SUSPENDED/TERMINATED => return nothing),
--   accepted terms version, and the global marketing kill switch.
create or replace function public.wa_marketing_eligible(p_workspace uuid, p_contact_ids uuid[] default null)
returns table (contact_id uuid, phone_e164 text, consent_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.phone_e164, cr.id
    from public.contacts c
    join public.whatsapp_consent_records cr
      on cr.workspace_id = c.workspace_id
     and cr.phone_e164   = c.phone_e164
     and cr.consent_type = 'MARKETING_WHATSAPP'
     and cr.status       = 'ACTIVE'
   where c.workspace_id = p_workspace
     and c.phone_e164 is not null
     and (p_contact_ids is null or c.id = any (p_contact_ids))
     and not exists (select 1 from public.whatsapp_suppressions s
                      where s.workspace_id = c.workspace_id and s.phone_e164 = c.phone_e164)
     and not exists (select 1 from public.sms_suppression_list l
                      where l.workspace_id = c.workspace_id and l.phone_e164 = c.phone_e164)
     and not exists (select 1 from public.contacts d
                      where d.workspace_id = c.workspace_id and d.phone_e164 = c.phone_e164
                        and (d.opted_out is true or d.sms_opt_out is true));
$$;

-- 6. Function ACLs: service_role only -----------------------------------------------------------------------------------
revoke execute on function public.wa_revoke_consent(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.wa_on_sms_suppression() from public, anon, authenticated;
revoke execute on function public.wa_on_contact_opt_out() from public, anon, authenticated;
revoke execute on function public.wa_record_consent(uuid, uuid, text, text, text, uuid, text, uuid, text, text, text, text, timestamptz, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.wa_marketing_eligible(uuid, uuid[]) from public, anon, authenticated;

grant execute on function public.wa_revoke_consent(uuid, text, text, text) to service_role;
grant execute on function public.wa_record_consent(uuid, uuid, text, text, text, uuid, text, uuid, text, text, text, text, timestamptz, text, text, text, text) to service_role;
grant execute on function public.wa_marketing_eligible(uuid, uuid[]) to service_role;
