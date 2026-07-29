-- SMART TAGS ENGINE (Part 1) — foundational relational tag model.
--
-- Replaces the never-actually-created `contact_tags_registry` (referenced by
-- src/app/api/v1/tags/route.ts, src/app/api/v1/tags/[id]/route.ts,
-- ContactRepository.ts, TagsClient.tsx and ManageTagsDialog.tsx, but backed by
-- no migration — every one of those code paths throws "relation does not
-- exist" today) with a real, workspace-scoped, hierarchical tag model shared
-- across Contacts, Companies, Deals, Invoices, Courses and Support Tickets.
--
-- Existing array-column tag stores (contacts.tags, opportunities.tags,
-- conversations.tags, pages.tags, lead_finder_results.smart_tags) are left in
-- place by this migration; contacts.tags/opportunities.tags data is moved
-- into this model by the follow-up data migration, and their readers/writers
-- are repointed in application code. The array columns themselves are
-- dropped once repointing is verified.

-- 1. TAG CATEGORIES
CREATE TABLE IF NOT EXISTS public.tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_categories_workspace_name_unique
    ON public.tag_categories(workspace_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_tag_categories_workspace_id ON public.tag_categories(workspace_id);

-- 2. TAGS
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    category_id UUID REFERENCES public.tag_categories(id) ON DELETE SET NULL,
    visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'company')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tag_type TEXT NOT NULL DEFAULT 'manual' CHECK (
        tag_type IN ('manual', 'ai_smart', 'automation', 'temporary', 'system', 'relationship')
    ),
    parent_tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    confidence_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_workspace_name_unique
    ON public.tags(workspace_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON public.tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON public.tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent_tag_id ON public.tags(parent_tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. TAG ASSIGNMENTS (polymorphic, following the crm_activities/collaboration_comments
-- convention — own workspace_id column, no real FK on entity_id since it targets six
-- different tables, composite index for lookup).
CREATE TABLE IF NOT EXISTS public.tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN ('contact', 'company', 'deal', 'invoice', 'course', 'support_ticket')
    ),
    entity_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_entity ON public.tag_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag_id ON public.tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_workspace_id ON public.tag_assignments(workspace_id);

-- 4. TAG HISTORY (audit trail)
-- tag_id intentionally has NO foreign key: it must survive the referenced tag being
-- deleted (tag_name_snapshot preserves readability), and a plain column avoids FK-timing
-- issues when a tag delete cascades into tag_assignments deletes in the same statement.
CREATE TABLE IF NOT EXISTS public.tag_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tag_id UUID,
    tag_name_snapshot TEXT,
    entity_type TEXT,
    entity_id UUID,
    action TEXT NOT NULL CHECK (action IN ('created', 'added', 'removed', 'updated', 'expired', 'deleted')),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'ai')),
    changed_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_history_workspace_id ON public.tag_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tag_history_tag_id ON public.tag_history(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_history_entity ON public.tag_history(entity_type, entity_id);

-- 5. USER TAG FAVORITES
CREATE TABLE IF NOT EXISTS public.user_tag_favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tag_favorites_workspace_id ON public.user_tag_favorites(workspace_id);

-- 6. AI RECOMMENDATIONS (schema only — Part 2's AI generation logic populates this)
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN ('contact', 'company', 'deal', 'invoice', 'course', 'support_ticket')
    ),
    entity_id UUID NOT NULL,
    suggested_tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    suggested_tag_name TEXT,
    confidence_score NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_entity ON public.ai_recommendations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_workspace_id ON public.ai_recommendations(workspace_id);

-- 7. AUDIT TRIGGERS
CREATE OR REPLACE FUNCTION public.log_tag_history() RETURNS TRIGGER AS $$
DECLARE
  v_changed JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type)
    VALUES (
      NEW.workspace_id, NEW.id, NEW.name, 'created',
      NEW.created_by,
      CASE WHEN NEW.created_by IS NOT NULL THEN 'user'
           WHEN NEW.tag_type = 'ai_smart' THEN 'ai'
           ELSE 'system' END
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      v_changed := v_changed || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.color IS DISTINCT FROM OLD.color THEN
      v_changed := v_changed || jsonb_build_object('color', jsonb_build_object('old', OLD.color, 'new', NEW.color));
    END IF;
    IF NEW.icon IS DISTINCT FROM OLD.icon THEN
      v_changed := v_changed || jsonb_build_object('icon', jsonb_build_object('old', OLD.icon, 'new', NEW.icon));
    END IF;
    IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
      v_changed := v_changed || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
    END IF;
    IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
      v_changed := v_changed || jsonb_build_object('visibility', jsonb_build_object('old', OLD.visibility, 'new', NEW.visibility));
    END IF;
    IF NEW.parent_tag_id IS DISTINCT FROM OLD.parent_tag_id THEN
      v_changed := v_changed || jsonb_build_object('parent_tag_id', jsonb_build_object('old', OLD.parent_tag_id, 'new', NEW.parent_tag_id));
    END IF;
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      v_changed := v_changed || jsonb_build_object('expires_at', jsonb_build_object('old', OLD.expires_at, 'new', NEW.expires_at));
    END IF;
    IF NEW.confidence_score IS DISTINCT FROM OLD.confidence_score THEN
      v_changed := v_changed || jsonb_build_object('confidence_score', jsonb_build_object('old', OLD.confidence_score, 'new', NEW.confidence_score));
    END IF;

    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type, changed_fields)
    VALUES (
      NEW.workspace_id, NEW.id, NEW.name, 'updated',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END,
      v_changed
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type)
    VALUES (
      OLD.workspace_id, OLD.id, OLD.name, 'deleted',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tag_change ON public.tags;
CREATE TRIGGER on_tag_change
    AFTER INSERT OR UPDATE OR DELETE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION public.log_tag_history();

CREATE OR REPLACE FUNCTION public.log_tag_assignment_history() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, entity_type, entity_id, action, actor_id, actor_type)
    VALUES (
      NEW.workspace_id, NEW.tag_id, NEW.entity_type, NEW.entity_id, 'added',
      NEW.assigned_by,
      CASE WHEN NEW.assigned_by IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, entity_type, entity_id, action, actor_id, actor_type)
    VALUES (
      OLD.workspace_id, OLD.tag_id, OLD.entity_type, OLD.entity_id, 'removed',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tag_assignment_change ON public.tag_assignments;
CREATE TRIGGER on_tag_assignment_change
    AFTER INSERT OR DELETE ON public.tag_assignments
    FOR EACH ROW EXECUTE FUNCTION public.log_tag_assignment_history();

-- 8. RLS
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tag_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- tag_categories: read for any member; governance (create/edit/delete) restricted to admin/owner
DROP POLICY IF EXISTS "Workspace members can view tag categories" ON public.tag_categories;
CREATE POLICY "Workspace members can view tag categories" ON public.tag_categories
    FOR SELECT USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace admins can create tag categories" ON public.tag_categories;
CREATE POLICY "Workspace admins can create tag categories" ON public.tag_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = tag_categories.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Workspace admins can update tag categories" ON public.tag_categories;
CREATE POLICY "Workspace admins can update tag categories" ON public.tag_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = tag_categories.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Workspace admins can delete tag categories" ON public.tag_categories;
CREATE POLICY "Workspace admins can delete tag categories" ON public.tag_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = tag_categories.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

-- tags: any member reads non-private tags + their own private tags; any member creates
-- manual tags they own; owner/admin can edit or delete any tag (governance override)
DROP POLICY IF EXISTS "Workspace members can view tags" ON public.tags;
CREATE POLICY "Workspace members can view tags" ON public.tags
    FOR SELECT USING (
        public.check_workspace_access(workspace_id)
        AND (visibility <> 'private' OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "Workspace members can create manual tags" ON public.tags;
CREATE POLICY "Workspace members can create manual tags" ON public.tags
    FOR INSERT WITH CHECK (
        public.check_workspace_access(workspace_id)
        AND tag_type = 'manual'
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Workspace members can update tags" ON public.tags;
CREATE POLICY "Workspace members can update tags" ON public.tags
    FOR UPDATE USING (
        public.check_workspace_access(workspace_id)
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = tags.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('admin', 'owner')
            )
        )
    );

DROP POLICY IF EXISTS "Workspace members can delete tags" ON public.tags;
CREATE POLICY "Workspace members can delete tags" ON public.tags
    FOR DELETE USING (
        public.check_workspace_access(workspace_id)
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = tags.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('admin', 'owner')
            )
        )
    );

-- tag_assignments: individual assignment is a regular-member action
DROP POLICY IF EXISTS "Workspace members can view tag assignments" ON public.tag_assignments;
CREATE POLICY "Workspace members can view tag assignments" ON public.tag_assignments
    FOR SELECT USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace members can create tag assignments" ON public.tag_assignments;
CREATE POLICY "Workspace members can create tag assignments" ON public.tag_assignments
    FOR INSERT WITH CHECK (
        public.check_workspace_access(workspace_id)
        AND EXISTS (
            SELECT 1 FROM public.tags t
            WHERE t.id = tag_assignments.tag_id
            AND (t.visibility <> 'private' OR t.created_by = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Workspace members can remove tag assignments" ON public.tag_assignments;
CREATE POLICY "Workspace members can remove tag assignments" ON public.tag_assignments
    FOR DELETE USING (public.check_workspace_access(workspace_id));

-- tag_history: read-only for members; writes happen exclusively through the
-- SECURITY DEFINER triggers above (no INSERT/UPDATE/DELETE policy for client roles)
DROP POLICY IF EXISTS "Workspace members can view tag history" ON public.tag_history;
CREATE POLICY "Workspace members can view tag history" ON public.tag_history
    FOR SELECT USING (public.check_workspace_access(workspace_id));

-- user_tag_favorites: strictly own rows
DROP POLICY IF EXISTS "Users manage their own tag favorites" ON public.user_tag_favorites;
CREATE POLICY "Users manage their own tag favorites" ON public.user_tag_favorites
    FOR ALL USING (auth.uid() = user_id AND public.check_workspace_access(workspace_id))
    WITH CHECK (auth.uid() = user_id AND public.check_workspace_access(workspace_id));

-- ai_recommendations: members can view/review (accept/reject); INSERT is reserved for
-- Part 2's AI pipeline via the service-role client (no client-role INSERT policy)
DROP POLICY IF EXISTS "Workspace members can view ai recommendations" ON public.ai_recommendations;
CREATE POLICY "Workspace members can view ai recommendations" ON public.ai_recommendations
    FOR SELECT USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace members can review ai recommendations" ON public.ai_recommendations;
CREATE POLICY "Workspace members can review ai recommendations" ON public.ai_recommendations
    FOR UPDATE USING (public.check_workspace_access(workspace_id))
    WITH CHECK (public.check_workspace_access(workspace_id));
