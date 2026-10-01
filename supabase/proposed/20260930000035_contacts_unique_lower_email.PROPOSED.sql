-- PROPOSED — NOT APPLIED. Awaiting approval. Kept outside supabase/migrations so `supabase db push` cannot pick it up.
--
-- One client per (workspace, case-insensitive email). Today UNIQUE (workspace_id, email) is exact-case, so
-- "Bob@x.com" and "bob@x.com" can both exist in a workspace. The application already treats them as the same
-- client (ContactService.createContact does a case-insensitive lookup first); this makes the database agree.
--
-- Partial: NULL and blank emails are excluded, so clients without an email (14 today) never collide.
-- Read-only pre-check on the live project (2026-10-01): 89 contacts, 75 with an email, 14 NULL, 0 blank, 0 padded,
-- 0 (workspace_id, lower(btrim(email))) duplicate groups -> the index builds cleanly.
--
-- The guard below fails the migration with a readable message if a duplicate has appeared since the pre-check,
-- instead of an opaque index-build error. Table is tiny, so a plain (locking) CREATE INDEX is fine.
DO $$
DECLARE dup_groups integer;
BEGIN
  SELECT count(*) INTO dup_groups FROM (
    SELECT 1 FROM public.contacts
    WHERE email IS NOT NULL AND btrim(email) <> ''
    GROUP BY workspace_id, lower(btrim(email))
    HAVING count(*) > 1
  ) d;
  IF dup_groups > 0 THEN
    RAISE EXCEPTION 'contacts has % case-insensitive duplicate (workspace_id, email) groups; merge them first', dup_groups;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_workspace_lower_email_key
  ON public.contacts (workspace_id, lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';
