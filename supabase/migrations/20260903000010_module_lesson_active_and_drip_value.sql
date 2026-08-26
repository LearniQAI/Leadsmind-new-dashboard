-- Section C, Steps 3-4: per-lesson drip value + real active/inactive toggles for modules and
-- lessons. Audit found ModuleCard.tsx already reads `module.is_active === false` to show an
-- "Inactive" badge, but no such column existed on course_modules — that check was always
-- false in practice (dead code). Adding the real column makes it actually work, rather than
-- introducing a second, differently-named field.
alter table course_modules add column is_active boolean not null default true;
alter table course_lessons add column is_active boolean not null default true;

-- drip_value is what unlock_type = 'drip' actually counts (days from the point the lesson
-- would otherwise unlock) — not a second, disconnected concept from Phase A's unlock_type.
-- Null/irrelevant when unlock_type isn't 'drip'; the UI shows "Immediately" for any lesson
-- whose unlock_type isn't 'drip', regardless of this value.
alter table course_lessons add column drip_value integer;
