-- Batch 6 (G9) — real course categories.
--
-- STEP 0 re-confirmation: an earlier audit's schema-drift sweep found a dead, UNIMPORTED file
-- (src/app/actions/lms/categories.ts) referencing a `course_categories` table and a
-- `courses.category_id` column that did NOT exist on the live schema even then (confirmed:
-- "no table/col" in docs/schema-drift-audit.md's own findings). Re-confirmed again live
-- 2026-09-02: `course_categories` still does not exist (PGRST205), `courses` still has no
-- `category_id` column, and that dead file has since been removed from the repo entirely
-- (not found under src/app/actions/lms/). There is nothing to repair or repoint — this is a
-- genuinely fresh build, not a resurrection.
--
-- Step 1 scope decision: a flat, single-category-per-course model (not tags, not a nested
-- taxonomy) — matches the catalog's existing flat filter set (price/sort), and this project's
-- own earlier finding that a nested taxonomy here would be solving a problem nobody has raised.
-- Workspace-scoped (every other course-facing table in this schema is), admin-manageable
-- (name + a small color swatch), optional per course (ON DELETE SET NULL — deleting a
-- category never deletes or hides the course, it just becomes uncategorized again).

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#0284c7',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index if not exists idx_course_categories_workspace on public.course_categories(workspace_id);

alter table public.courses add column if not exists category_id uuid references public.course_categories(id) on delete set null;
create index if not exists idx_courses_category_id on public.courses(category_id);

alter table public.course_categories enable row level security;

-- Same two-policy workspace-scoping shape used throughout this schema (e.g. course_certificates,
-- migration 20260903000019): workspace members manage their own workspace's categories...
create policy "workspace members manage course_categories"
  on public.course_categories for all
  using (exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = course_categories.workspace_id
      and workspace_members.user_id = auth.uid()
  ));

-- ...and anyone (incl. anonymous — the public course landing pages render category badges too)
-- may read categories, mirroring the existing public-read policy on published courses
-- (allow_public_select_content_blocks_published_courses, content_blocks migration) — a
-- category name/color is not sensitive, and the marketplace/catalog is read via the
-- service-role admin client anyway, so this is defense-in-depth, not the only real read path.
create policy "public read course_categories"
  on public.course_categories for select
  to anon, authenticated
  using (true);

comment on table public.course_categories is
  'Flat, workspace-scoped, single-category-per-course taxonomy for the course catalog filter (Batch 6 / G9). Not a nested taxonomy and not tags — see migration comment for the scope decision.';
comment on column public.courses.category_id is
  'Optional FK to course_categories. NULL = uncategorized; the catalog surfaces this as "All categories" / uncategorized, never hides or errors on it.';

-- Seed a small, generic starter list into every workspace that has at least one real course
-- today — confirmed live: the only real courses in this database are demo/test data (a
-- Mathematics course, an English Language course, a few smoke-test placeholders) with no
-- real content-implied taxonomy of their own, so this is a sensible generic starting set for
-- any course marketplace, not something reverse-engineered from that test data. Re-runnable
-- safely: unique(workspace_id, name) + ON CONFLICT DO NOTHING means running this twice (or
-- against a workspace that already added its own categories with the same names) never
-- duplicates or errors.
insert into public.course_categories (workspace_id, name, color, position)
select w.id, cat.name, cat.color, cat.position
from public.workspaces w
join (values
  ('Business', '#0284c7', 0),
  ('Technology', '#7c3aed', 1),
  ('Language & Communication', '#16a34a', 2),
  ('Health & Wellness', '#dc2626', 3),
  ('Personal Development', '#d97706', 4),
  ('Academic', '#0f172a', 5)
) as cat(name, color, position) on true
where exists (select 1 from public.courses c where c.workspace_id = w.id)
on conflict (workspace_id, name) do nothing;
