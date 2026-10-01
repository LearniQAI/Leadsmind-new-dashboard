-- Per-quiz settings are retired: module_quiz_defaults (one row per module) is the only source of
-- quiz rules. module_quiz_settings is KEPT, not dropped, as a historical record of what each quiz
-- was configured with (and so the change can be reverted). Nothing reads it any more. Comment-only.
comment on table public.module_quiz_settings is
  'ARCHIVED 2026-10-01: per-quiz settings are no longer read or written. Module rules live in module_quiz_defaults. Kept as a historical record only.';
comment on column public.module_quiz_settings.inherit_module_defaults is
  'Unused since 20261001000002 (there is no per-quiz override).';
