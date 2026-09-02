-- Soft-confirm completion: "Mark complete" is now always clickable. If a student clicks it
-- before genuinely finishing the lesson's content (per-block completions and/or the
-- reading/scroll gate), a one-time friendly dialog lets them proceed anyway.
--
-- This flag records — per completion row — whether that specific completion was genuine
-- (every real signal the server independently re-checked was met, or there was nothing to
-- meet) or an override (student confirmed past an incomplete state). The server sets it from
-- its OWN re-check, never from a client claim. Kept for honest reporting
-- ("content actually completed" vs "skipped ahead"); it has no effect on the student.
--
-- NULL / false = genuine. true = override.

alter table course_progress add column if not exists completion_override boolean not null default false;

comment on column course_progress.completion_override is
  'true when the student marked this lesson complete via the soft-confirm dialog while real completion signals (blocks / reading gate) were not all met. Set server-side from an independent re-check, never trusted from the client.';
