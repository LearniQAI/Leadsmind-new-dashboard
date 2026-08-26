-- Phase A, Migration 3: unlock_type on course_lessons.
alter table course_lessons add column unlock_type text not null
  default 'sequential' check (unlock_type in
  ('sequential','immediate','drip','quiz_gated'));
