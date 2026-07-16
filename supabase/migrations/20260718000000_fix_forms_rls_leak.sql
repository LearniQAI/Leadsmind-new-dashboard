-- Migration 20240101000106_phase63_sprint15_relax_forms_rls.sql added
-- permissive `USING (true)` policies to public.forms "for testing" and was
-- never reverted. Its DROP POLICY statements targeted stale/incorrect
-- policy names (e.g. "Forms are viewable by owner"), so the real,
-- properly-scoped policy from 20240101000016_phase9_10_campaigns_forms.sql
-- ("Workspace Forms Access") was left in place alongside the new
-- open-to-all ones. Postgres combines multiple permissive policies for the
-- same command with OR, so the `USING (true)` policies dominated: any
-- authenticated user, regardless of workspace, has been able to
-- SELECT/INSERT/UPDATE/DELETE any other workspace's forms via the
-- session-bound client. This closes that hole by dropping the testing
-- policies; "Workspace Forms Access" and "Public Form Select" (published
-- forms only, for the embed GET route) remain as the only active policies.
DROP POLICY IF EXISTS "Allow authenticated users to read all forms" ON public.forms;
DROP POLICY IF EXISTS "Allow authenticated users to insert forms" ON public.forms;
DROP POLICY IF EXISTS "Allow authenticated users to update all forms" ON public.forms;
DROP POLICY IF EXISTS "Allow authenticated users to delete all forms" ON public.forms;
