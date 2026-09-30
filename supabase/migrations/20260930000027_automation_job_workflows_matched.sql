-- Distinguishes "ran, zero workflows configured for this trigger" from a real success, so the
-- submissions page badge (src/app/forms/[id]/submissions/page.tsx) can show "No matching
-- workflow" instead of implying an automation actually fired.
ALTER TABLE form_automation_jobs ADD COLUMN IF NOT EXISTS workflows_matched INTEGER;
