-- Priority 0 security remediation (item 2): the "Public form submissions" INSERT
-- policy on public.contacts was created with WITH CHECK (true) — the migration
-- comment that introduced it (20240101000077_phase44_universal_api_branding.sql)
-- explicitly says workspace_id/api_key validation was deferred to the application
-- layer, but no app-layer validation ever existed (handlePageFormSubmission in
-- src/app/actions/builder.ts trusted a raw client-supplied workspaceId with zero
-- check that it belonged to the submitted pageId).
--
-- The app-layer fix now derives workspace_id server-side from the pageId's own
-- `pages` row, so the legitimate public-form-submission flow no longer trusts
-- client input. This migration is the defense-in-depth half of that fix: it
-- narrows the wide-open policy so a caller bypassing the app layer entirely
-- (hitting PostgREST directly with the public anon key) can no longer insert a
-- contact under an arbitrary/nonexistent workspace_id — the target workspace_id
-- must correspond to a real workspace that actually has at least one builder
-- page. contacts has no page_id/website_id column of its own, so a full
-- pageId-to-workspace binding can't be enforced at the row level here (that
-- binding is what the app-layer fix verifies); this policy narrows the blast
-- radius from "any UUID" to "a real workspace with a real published surface".

DROP POLICY IF EXISTS "Public form submissions" ON public.contacts;

CREATE POLICY "Public form submissions"
    ON public.contacts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pages
            WHERE pages.workspace_id = contacts.workspace_id
        )
    );
