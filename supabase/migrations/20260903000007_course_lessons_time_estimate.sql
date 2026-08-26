-- Phase B, Step 7: admin-settable time estimate per lesson (PRD Section 10 sidebar element).
alter table course_lessons add column time_estimate_minutes integer;
