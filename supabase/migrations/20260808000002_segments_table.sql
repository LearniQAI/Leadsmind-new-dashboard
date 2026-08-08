-- CONTACT SEGMENTS — saves a SegmentationCompiler RuleGroup (see
-- src/lib/intelligence/SegmentationCompiler.ts) as a reusable, named entity
-- instead of requiring every campaign to rebuild its rules from scratch.
-- rule_group JSONB mirrors the RuleGroup shape exactly ({ logic, rules[] })
-- so it can be passed straight into SegmentationCompiler.executeSegment()
-- with no translation layer.

CREATE TABLE IF NOT EXISTS public.segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_group JSONB NOT NULL DEFAULT '{"logic": "AND", "rules": []}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_segments_workspace_name_unique
    ON public.segments(workspace_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_segments_workspace_id ON public.segments(workspace_id);

DROP TRIGGER IF EXISTS update_segments_updated_at ON public.segments;
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view segments" ON public.segments;
CREATE POLICY "Workspace members can view segments" ON public.segments
    FOR SELECT USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace members can create segments" ON public.segments;
CREATE POLICY "Workspace members can create segments" ON public.segments
    FOR INSERT WITH CHECK (
        public.check_workspace_access(workspace_id)
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Workspace members can update segments" ON public.segments;
CREATE POLICY "Workspace members can update segments" ON public.segments
    FOR UPDATE USING (
        public.check_workspace_access(workspace_id)
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = segments.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('admin', 'owner')
            )
        )
    );

DROP POLICY IF EXISTS "Workspace members can delete segments" ON public.segments;
CREATE POLICY "Workspace members can delete segments" ON public.segments
    FOR DELETE USING (
        public.check_workspace_access(workspace_id)
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = segments.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('admin', 'owner')
            )
        )
    );
