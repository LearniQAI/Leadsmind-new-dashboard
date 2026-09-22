-- LMS batch 2 / fix 7 (data): the only two courses whose `published` and `status` disagreed were QA
-- leftovers "T18 Test Course 1784886250358" / "T18 Test Course 1784886300309" (Olu Max's Workspace,
-- created 2026-07-24, status=draft but published=true, free, 0 modules/lessons, 0 progress, 0
-- certificates, 0 invoices). Owner decision: delete both. Cascade removes their 4 enrolments
-- (2 t18-contact@example.com test contacts + the developer's own two accounts). Explicit ids, so this is
-- a no-op on any other database. Contacts themselves are NOT deleted.
DELETE FROM public.courses
 WHERE id IN ('26d5e566-1692-4021-9327-97139539ef96', '8f198062-eb07-4549-8c96-66d26cff6dd7')
   AND status = 'draft' AND published = true;
