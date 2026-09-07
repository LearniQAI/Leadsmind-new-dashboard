-- Storage-policy hardening, sibling-bug pass on 'branding'.
--
-- Audited: SettingsClient.tsx uploads logos/favicons directly from the browser via
-- supabase.storage.from('branding') (real client-side access -- unlike kyc-documents/
-- employee-documents, this one is NOT admin-client-only, so the removal-based lockdown
-- used there does not apply here). The correct fix is the path-scoping pattern already
-- proven on blog-media / media / social-media / ai-generated-media / builder-media.
--
-- The old "Workspace admins can manage branding assets" policy checked only
-- auth.role() = 'authenticated' with no path scoping at all -- any authenticated user in
-- any workspace could overwrite or delete another workspace's logo/favicon. The upload
-- path also never included a workspace segment (`logo-{timestamp}.{ext}` at the bucket
-- root), so path-scoping couldn't have worked until the app code was fixed to prefix
-- uploads with the real active workspace id (src/app/settings/SettingsClient.tsx, using
-- the same getActiveWorkspaceId() helper MediaVaultModal.tsx already uses for
-- builder-media -- see 20260829000000_lockdown_storage_buckets.sql).
--
-- SELECT stays public and untouched: branding assets (logos, favicons) are meant to
-- render on public-facing pages (portal, marketing, email templates) without auth --
-- confirmed via real callers in src/app/(portal)/portal/layout.tsx,
-- src/app/(marketing)/landing/data.tsx, src/lib/automations/EmailAutomationService.ts.
DROP POLICY IF EXISTS "Workspace admins can manage branding assets" ON storage.objects;

DROP POLICY IF EXISTS "Auth Branding Upload" ON storage.objects;
CREATE POLICY "Auth Branding Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'branding'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Branding Update" ON storage.objects;
CREATE POLICY "Auth Branding Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'branding'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'branding'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Branding Delete" ON storage.objects;
CREATE POLICY "Auth Branding Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'branding'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

-- Sibling-bug sweep findings, NOT fixed in this migration (see build report):
-- lms_content, contact-avatars, form_uploads, workspace-logos are all confirmed genuinely
-- unused by any current app code (real functionality moved to the 'media' and 'avatars'
-- buckets respectively, or in form_uploads'/workspace-logos' case, never had a real
-- caller at all) -- flagged as candidates for a separate, deliberate bucket-removal
-- decision rather than policy-hardened or silently deleted here.
