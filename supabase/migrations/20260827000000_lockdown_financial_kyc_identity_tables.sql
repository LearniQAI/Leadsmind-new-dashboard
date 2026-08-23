-- Lock down financial, KYC, and identity-sensitive tables/storage that allowed
-- anonymous or cross-tenant read/write via unrestricted USING (true) predicates.
--
-- Confirmed vulnerable (live verification, this session):
--   1. source_of_funds_declarations / conveyancing_shares — anon SELECT/UPDATE via USING (true)
--   2. kyc-documents storage bucket — any authenticated user could read/upload any object
--   3. oauth_authorization_codes / oauth_access_tokens — USING (true), no role restriction
--   4. form_partial_submissions — already remediated in
--      20260822000100_secure_partial_submissions_and_restore_rls.sql; no action needed here.
--
-- Confirmed no legitimate app code path is broken by these changes:
--   - src/app/actions/propertyDeals.ts's public token flows
--     (getFundsDeclarationByToken, submitFundsDeclaration, getConveyancingShareByToken)
--     all use createAdminClient() (service role), which bypasses RLS entirely and is
--     unaffected by dropping the anon USING(true) policies below.
--   - kyc-documents is only ever touched via src/app/api/kyc/documents/upload/route.ts and
--     src/app/api/kyc/documents/download/route.ts, both using createAdminClient(); no
--     browser code calls supabase.storage.from('kyc-documents') directly, so removing the
--     client-facing storage.objects policies removes an unused, dangerous bypass path (any
--     authenticated user could otherwise download/overwrite any other workspace's FICA/KYC
--     documents directly via the storage API, skipping the download route's workspace
--     membership + consent checks).
--   - oauth_authorization_codes / oauth_access_tokens are only queried via
--     createAdminClient() in src/app/api/oauth/token/route.ts,
--     src/app/api/oauth/authorize/route.ts, and src/lib/api/auth.ts.

-- =====================================================================
-- 1. source_of_funds_declarations + conveyancing_shares
-- =====================================================================

DROP POLICY IF EXISTS "anonymous select declaration by token" ON public.source_of_funds_declarations;
DROP POLICY IF EXISTS "anonymous update declaration by token" ON public.source_of_funds_declarations;
DROP POLICY IF EXISTS "workspace members manage declarations" ON public.source_of_funds_declarations;

CREATE POLICY "workspace members manage declarations"
  ON public.source_of_funds_declarations FOR ALL TO authenticated
  USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

REVOKE ALL PRIVILEGES ON TABLE public.source_of_funds_declarations FROM anon;

DROP POLICY IF EXISTS "anonymous select conveyancing_shares" ON public.conveyancing_shares;
DROP POLICY IF EXISTS "workspace members manage conveyancing_shares" ON public.conveyancing_shares;

CREATE POLICY "workspace members manage conveyancing_shares"
  ON public.conveyancing_shares FOR ALL TO authenticated
  USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

REVOKE ALL PRIVILEGES ON TABLE public.conveyancing_shares FROM anon;

-- =====================================================================
-- 2. kyc-documents storage bucket
--    Object paths are contacts/{contactId}/... (no workspace segment), and
--    no legitimate code needs direct client-side access at all, so the
--    correct fix is to remove the client-facing policies entirely rather
--    than path-scope them.
-- =====================================================================

DROP POLICY IF EXISTS "Allow authenticated users to read KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert KYC documents" ON storage.objects;

-- =====================================================================
-- 3. oauth_authorization_codes / oauth_access_tokens
--    Policies were labeled "Service role full access" but had no role
--    restriction, so USING (true) applied to any role able to reach the
--    table. Restrict explicitly to service_role.
-- =====================================================================

DROP POLICY IF EXISTS "Service role full access to oauth_authorization_codes" ON public.oauth_authorization_codes;
CREATE POLICY "Service role full access to oauth_authorization_codes"
  ON public.oauth_authorization_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to oauth_access_tokens" ON public.oauth_access_tokens;
CREATE POLICY "Service role full access to oauth_access_tokens"
  ON public.oauth_access_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL PRIVILEGES ON TABLE public.oauth_authorization_codes FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.oauth_access_tokens FROM anon, authenticated;

-- =====================================================================
-- 4. form_partial_submissions — already remediated in
--    20260822000100_secure_partial_submissions_and_restore_rls.sql
--    (anon privileges revoked, policy scoped via check_workspace_access()).
--    No further action needed here.
-- =====================================================================
