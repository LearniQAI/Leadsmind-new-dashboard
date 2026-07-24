-- contact_activities_type_check was last widened in 20240101000031_phase16_invoicing_sprint1
-- to ('note', 'task', 'deal', 'system', 'invoice', 'quote'). Since then, both application code
-- and the fn_sync_appointment_to_crm_activities appointment trigger (20240101000198) started
-- inserting types the constraint never learned about. Because that trigger has no exception
-- handler, a constraint violation aborts the whole appointment INSERT/UPDATE transaction, so
-- every real booking tied to a contact has been failing outright. Also folds in the 'edit'
-- value flagged separately in Task 11 — same constraint, one consolidated fix.
--
-- Values added and where they come from:
--   booking_scheduled, booking_noshow, meeting  -- fn_sync_appointment_to_crm_activities trigger
--   edit             -- contact create/update, form builder + automation activity logging, PayFast webhook
--   document, signature                          -- src/app/actions/documents.ts
--   calendar                                      -- src/app/actions/portalBookings.ts
--   project                                       -- src/app/actions/projects.ts
--   support_message                               -- src/app/api/webhooks/support/inbound
--   note_added, status_change, crm_push, tag_added, tag_removed  -- contact/lead workspace activity log
ALTER TABLE public.contact_activities DROP CONSTRAINT IF EXISTS contact_activities_type_check;
ALTER TABLE public.contact_activities ADD CONSTRAINT contact_activities_type_check
CHECK (type IN (
    'note', 'task', 'deal', 'system', 'invoice', 'quote',
    'edit', 'booking_scheduled', 'booking_noshow', 'meeting',
    'document', 'signature', 'calendar', 'project', 'support_message',
    'note_added', 'status_change', 'crm_push', 'tag_added', 'tag_removed'
));
