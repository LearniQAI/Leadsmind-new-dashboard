-- LMS Phase 1: stable, unique per-course module order + published_at.
-- Additive only. No column dropped, no row deleted. Status model unchanged
-- (publish_status + is_active); DRAFT/PUBLISHED/INACTIVE is derived from them in the API.

-- 1. Snapshot before any write (no staging / no PITR).
create table if not exists public._bak_course_modules_20260928 as
  select * from public.course_modules;

-- 2. published_at (nullable; backfilled for modules already published).
alter table public.course_modules add column if not exists published_at timestamptz;
update public.course_modules
   set published_at = coalesce(updated_at, created_at)
 where publish_status = 'published' and published_at is null;

-- 3. Backfill position: 1-based per course, by created_at then id (deterministic).
--    Every module was position 0, so no existing meaningful order is overwritten.
update public.course_modules m
   set position = r.rn
  from (
    select id, row_number() over (partition by course_id order by created_at, id) as rn
      from public.course_modules
  ) r
 where m.id = r.id;

-- 4. Insert guard: a new module (or a duplicate) whose position is null, 0 or already
--    taken gets the next free slot, so the unique constraint can never break creation
--    from code that still sends position 0.
create or replace function public.course_modules_assign_position()
returns trigger language plpgsql as $$
begin
  if new.position is null or new.position <= 0 or exists (
    select 1 from public.course_modules
     where course_id = new.course_id and position = new.position
  ) then
    select coalesce(max(position), 0) + 1 into new.position
      from public.course_modules where course_id = new.course_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_course_modules_assign_position on public.course_modules;
create trigger trg_course_modules_assign_position
  before insert on public.course_modules
  for each row execute function public.course_modules_assign_position();

-- 5. Unique per course. DEFERRABLE so a whole reorder can swap positions inside one
--    transaction (Phase 4) without tripping mid-statement.
alter table public.course_modules alter column position set not null;
alter table public.course_modules
  add constraint course_modules_course_position_key
  unique (course_id, position) deferrable initially deferred;
