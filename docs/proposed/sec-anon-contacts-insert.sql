-- PROPOSED, NOT APPLIED. Lives outside supabase/migrations on purpose so `supabase db push` can never pick it up.
-- SEC S1 phase 2: stop anonymous clients inserting contacts.
--
-- THE HOLE (live, proven 2026-10-03 inside a rolled-back transaction): the RLS policy
--     "Public form submissions"  ON public.contacts  FOR INSERT  TO public  WITH CHECK (public.workspace_has_pages(workspace_id))
-- lets ANYONE holding the public anon key insert a contact, with any column values, into ANY workspace that owns at least one page
-- (workspace_has_pages is SECURITY DEFINER and only tests that a pages row exists). Rows default to opted_in = true.
--
-- WHEN TO APPLY (not before; do it in this order):
--   1. Deploy the SEC code commits to production (master). In particular commit "newsletter signup no longer depends on the anonymous
--      contacts INSERT policy": subscribeToNewsletter (src/app/actions/publicBlog.ts) was the ONLY code path that wrote contacts with
--      the anonymous-session client. Every other public contact write (public forms, builder forms, calendar booking, webinar
--      registration, funnel orders, checkout, guest enrolment, API v1, webhooks) already uses the service-role client.
--   2. Smoke-test on Vercel: submit the blog newsletter box on a tenant custom domain, a public form, a builder-page form.
--   3. Re-run the dependents search on the deployed branch:  git grep -n -A3 "from('contacts')" origin/master -- src | grep -E "insert|upsert"
--      and confirm every site uses createAdminClient / getAdminSupabase / a service-role createClient.
--   4. Then apply the statements below as ONE migration through `supabase db push`.
--
-- PROOF (run against production inside ONE DO block that ends in RAISE EXCEPTION, so everything rolled back; 0 probe rows remain,
-- the policy is still present):
--     before_drop_anon_insert=ALLOWED | after_drop_anon_insert=DENIED sqlstate=42501 | service_role_insert_after_drop=OK
--
-- ROLLBACK: recreate the policy exactly as it was:
--     create policy "Public form submissions" on public.contacts for insert to public with check (public.workspace_has_pages(workspace_id));

set local lock_timeout = '3s';

drop policy if exists "Public form submissions" on public.contacts;

-- Optional hardening for a later migration, once nothing anonymous needs the table at all (verify first: anon has no SELECT policy on
-- contacts today, every remaining policy needs a session):
--   revoke all on table public.contacts from anon;
