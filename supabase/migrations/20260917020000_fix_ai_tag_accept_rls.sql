-- Fix: accepting an AI-suggested tag (src/app/actions/aiRecommendations.ts
-- acceptAiRecommendation) fails with "Failed to create suggested tag"
-- whenever the suggested tag doesn't already exist.
--
-- Root cause: the tags INSERT policy from 20260729000000_smart_tags_schema.sql
-- only allows `tag_type = 'manual' AND created_by = auth.uid()`. The AI-accept
-- path inserts `tag_type = 'ai_smart'` with no created_by, which the policy's
-- WITH CHECK rejects outright — every "Accept" on a brand-new suggested tag
-- was failing RLS, not actually hitting a name collision or bad data.
--
-- Fix: allow the same 'ai_smart' insert when attributed to the accepting
-- user (created_by = auth.uid()) — the human clicking Accept is the real
-- author of record, same as a manual tag.
DROP POLICY IF EXISTS "Workspace members can create manual tags" ON public.tags;
CREATE POLICY "Workspace members can create manual or accepted-ai tags" ON public.tags
    FOR INSERT WITH CHECK (
        public.check_workspace_access(workspace_id)
        AND created_by = auth.uid()
        AND tag_type IN ('manual', 'ai_smart')
    );
