-- Sprint 7: Analytics and Conversion Intelligence

-- 1. Create form_analytics_events table
-- Used to store raw tracking events (viewed, focused, completed, abandoned)
CREATE TABLE IF NOT EXISTS public.form_analytics_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'view', 'field_focus', 'field_complete', 'step_complete', 'submit', 'abandon'
    field_id TEXT,
    step_id TEXT,
    variant_id TEXT, -- For A/B testing
    metadata JSONB DEFAULT '{}', -- stores time_spent, device, referrer, error_msg, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast analytics aggregation queries
CREATE INDEX IF NOT EXISTS idx_form_analytics_events_form_id ON public.form_analytics_events(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_events_created_at ON public.form_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_form_analytics_events_session ON public.form_analytics_events(session_id);

-- 2. Create form_analytics_aggregates table (for fast dashboard loading)
CREATE TABLE IF NOT EXISTS public.form_analytics_aggregates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    variant_id TEXT,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    submissions INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    device_breakdown JSONB DEFAULT '{}',
    source_breakdown JSONB DEFAULT '{}',
    field_dropoffs JSONB DEFAULT '{}',
    step_dropoffs JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, variant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_form_analytics_aggregates_form_date ON public.form_analytics_aggregates(form_id, date);

-- 3. A/B Testing Variants config
-- Stored in forms.config -> 'ab_testing' -> { enabled: true, variants: [{ id, traffic_split, overrides }] }
-- This doesn't need a schema change, just utilizing the existing JSONB config column.

-- Add security policies
ALTER TABLE public.form_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace users to read analytics aggregates" ON public.form_analytics_aggregates;
CREATE POLICY "Allow workspace users to read analytics aggregates"
  ON public.form_analytics_aggregates FOR SELECT
  USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Allow workspace users to read analytics events" ON public.form_analytics_events;
CREATE POLICY "Allow workspace users to read analytics events"
  ON public.form_analytics_events FOR SELECT
  USING (public.check_workspace_access(workspace_id));