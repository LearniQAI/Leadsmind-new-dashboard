-- Real Form Analytics + A/B Testing: variant schema.
-- form_analytics_events/form_analytics_aggregates/form_partial_submissions
-- already exist and are populated (form_analytics_aggregates is dead and
-- left untouched here — analytics reads go straight at form_analytics_events
-- and form_submissions instead of relying on an unpopulated rollup table).
-- page_variants (funnel/page builder) is FK-bound to public.pages and is not
-- reusable for standalone forms, so this adds a form-scoped equivalent.

CREATE TABLE IF NOT EXISTS public.form_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_control BOOLEAN NOT NULL DEFAULT false,
    traffic_weight INT NOT NULL DEFAULT 50 CHECK (traffic_weight > 0 AND traffic_weight <= 100),
    field_overrides JSONB NOT NULL DEFAULT '{}', -- { [fieldId]: { label } }
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_variants_form ON public.form_variants(form_id);

ALTER TABLE public.form_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace users to read form variants" ON public.form_variants;
CREATE POLICY "Allow workspace users to read form variants"
  ON public.form_variants FOR SELECT
  USING (public.check_workspace_access(workspace_id));

-- Attribute submissions to the variant the visitor was assigned, so real
-- per-variant conversion counts can be computed directly from
-- form_submissions instead of relying on client-fired 'submit' events
-- (which are lost if the tab closes before the beacon fires).
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.form_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_variant ON public.form_submissions(variant_id);
