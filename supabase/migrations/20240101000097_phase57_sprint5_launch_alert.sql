-- Phase 57: Sprint 5 Release Notes, Search Engine Webhook Triggers, & Staging Logs Truncation
CREATE TABLE IF NOT EXISTS public.platform_release_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    screen_route TEXT NOT NULL, -- e.g. '/contacts', '/pipelines', '/invoices', etc.
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.platform_release_notes ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access
DROP POLICY IF EXISTS "Public Read Access on Release Notes" ON public.platform_release_notes;
CREATE POLICY "Public Read Access on Release Notes"
    ON public.platform_release_notes FOR SELECT
    USING (true);

-- Seed platform release notes for active dashboard screens
INSERT INTO public.platform_release_notes (title, description, screen_route) VALUES
('Biometric Tagging Optimization', 'Contacts layout is now fully optimized with real-time biometric fields.', '/contacts'),
('Pipeline Metrics Update', 'Sales deal streams now include automated conversion rate indexes.', '/pipelines'),
('Direct Banking Statements Integration', 'Connect FNB and Absa directly to reconcile client invoice feeds.', '/invoices'),
('Smart Scheduler Zones', 'Calendar booking slots support multi-region timezone synchronization.', '/calendar'),
('Round-Robin Workflows', 'Team assignees are now routed using a round-robin rotation sequence.', '/automations')
ON CONFLICT DO NOTHING;

-- Enable pg_net extension to fire asynchronous HTTP calls on article updates
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function for automated search engine webhook notification
CREATE OR REPLACE FUNCTION public.notify_search_engines_on_article_update()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://www.leadsmind.io/api/webhooks/article-updated';
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'slug', NEW.slug,
    'title', NEW.title,
    'event', TG_OP,
    'updated_at', NEW.updated_at
  );
  
  -- Perform async HTTP POST call via pg_net
  PERFORM net.http_post(
    url := webhook_url,
    body := payload::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Safe fallback: do not crash transactions if pg_net runs into local limits
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on help_articles
DROP TRIGGER IF EXISTS trg_article_update_ping ON public.help_articles;
CREATE TRIGGER trg_article_update_ping
  AFTER INSERT OR UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_engines_on_article_update();

-- Clear staging search logs for production clean launch
TRUNCATE TABLE public.help_search_log CASCADE;
