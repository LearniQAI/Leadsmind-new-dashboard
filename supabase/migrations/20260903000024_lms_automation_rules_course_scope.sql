-- LMS Automation Rules — per-course scoping.
--
-- Batch 1 audit finding G1: lms_automation_rules were scoped ONLY by workspace_id.
-- The GET/PATCH/DELETE routes and the client's ?workspaceId= fetch had no course_id
-- filter, and emitLMSEvent() matched rules by (workspace_id, trigger_type, active)
-- only — so a rule built from Course A's Automations tab also fired for Course B.
--
-- Fix: add a nullable course_id.
--   * course_id SET   -> the rule fires ONLY for events on that course (the new
--                        default for every rule created from a course's tab).
--   * course_id NULL  -> the rule stays workspace-wide: it fires for every course
--                        in the workspace. This is a deliberate, distinct category
--                        (e.g. a workspace-level "any certificate issued" rule).
--
-- Existing rows are intentionally left NULL. The only rules in production today were
-- created by the per-course builder but were workspace-wide by construction; keeping
-- them NULL preserves their current behaviour exactly (no silent scope change) while
-- new rules become correctly course-scoped. Owners can narrow a grandfathered rule
-- by editing it and picking a course.

ALTER TABLE public.lms_automation_rules
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lms_automation_rules_course
  ON public.lms_automation_rules(course_id);

-- Composite index matching the emitLMSEvent() lookup (workspace + trigger + active),
-- with course_id trailing so both the course-scoped and NULL (workspace-wide) rows
-- for a trigger are still found by the same scan.
CREATE INDEX IF NOT EXISTS idx_lms_automation_rules_lookup
  ON public.lms_automation_rules(workspace_id, trigger_type, active);

COMMENT ON COLUMN public.lms_automation_rules.course_id IS
  'Course this rule is scoped to. NULL = workspace-wide (fires for every course in the workspace). Non-NULL = fires only for events on that course. Legacy rows are NULL by design.';
