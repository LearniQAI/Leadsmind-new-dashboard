-- Phase A, Migration 4: backfill one content_block per existing lesson.
-- Audit (Step 0, re-run live) found only one live lesson_type value in use: 'text',
-- across all 10 rows, with content jsonb containing an always-empty video_url key.
-- Mapped per the PRD: text/rich_text -> type 'rich_text', completion_rule 'none'.
insert into content_blocks (lesson_id, position, type, file_url, completion_rule, completion_threshold, content)
select
  id,
  0,
  'rich_text',
  nullif(content->>'video_url', ''),
  'none',
  null,
  coalesce(content, '{}'::jsonb)
from course_lessons
where lesson_type = 'text';
