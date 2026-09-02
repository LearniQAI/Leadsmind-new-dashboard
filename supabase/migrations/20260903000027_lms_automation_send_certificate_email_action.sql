-- Batch 4 (G7) — automatic certificate delivery on completion.
--
-- lms_automation_rules.action_type has a real CHECK constraint (migration
-- 20240101000171_lms_admin.sql) whose allowed list does NOT include the new dedicated
-- 'send_certificate_email' action (src/lib/lms/certificateEmail.ts /
-- libs/workers/src/automation-executor.ts). Confirmed live: without this migration, seeding
-- the certificate_issued -> send_certificate_email rule (courseBlueprints.ts::
-- seedCertificateDeliveryBlueprint) would fail its insert with a check-constraint violation.

alter table public.lms_automation_rules drop constraint if exists lms_automation_rules_action_type_check;

alter table public.lms_automation_rules add constraint lms_automation_rules_action_type_check
  check (action_type in (
    'enroll_course','revoke_course','enroll_bundle',
    'grant_community','add_tag','send_email',
    'send_whatsapp','assign_certificate','notify_instructor',
    'send_certificate_email'
  ));
