-- Lesson Builder Foundation (Systeme-parity Master Prompt, Part 1, Step 0/1 schema decision).
--
-- Audit finding: the existing Craft.js builder (BuilderEditor.tsx) already stores its node
-- tree in `pages.content` (jsonb), joined polymorphically via a nullable
-- website_page_id/funnel_step_id pair guarded by `page_context_check`. Rather than duplicating
-- that jsonb-tree-plus-autosave-plus-undo/redo infrastructure a second time on course_lessons
-- (a new builder_content column would mean reimplementing loadContent/handleSaveDraft/
-- sanitizeCraftJson from scratch for lessons), this reuses the exact same `pages` table and the
-- exact same BuilderEditor component, by adding a third polymorphic link: course_lesson_id.
--
-- Real-world existing constraint text (confirmed via information_schema before writing this):
--   CHECK ((website_page_id IS NOT NULL AND funnel_step_id IS NULL)
--       OR (website_page_id IS NULL AND funnel_step_id IS NOT NULL)
--       OR (website_page_id IS NULL AND funnel_step_id IS NULL))
-- The third branch (both null) was already a legal state before this migration — replaced
-- below with a real 3-way exclusive check so a lesson page can no longer collide with that
-- "neither" state.

alter table pages add column course_lesson_id uuid references course_lessons(id) on delete cascade;

create unique index pages_course_lesson_id_unique on pages(course_lesson_id) where course_lesson_id is not null;
create index pages_course_lesson_id_idx on pages(course_lesson_id);

alter table pages drop constraint page_context_check;

alter table pages add constraint page_context_check check (
  (website_page_id is not null)::int
  + (funnel_step_id is not null)::int
  + (course_lesson_id is not null)::int
  <= 1
);
