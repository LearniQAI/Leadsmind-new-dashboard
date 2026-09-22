-- LMS batch 5 / RAG rebuild, stage 3: real-content re-embed triggers.
--
-- Ingestion previously only fired inline (synchronous OpenAI calls) from POST/PATCH
-- /api/lms/lessons — a lesson-metadata save, not a content edit. Every real content edit path
-- (content_blocks CRUD, canvas saves) never triggered it at all. Canvas saves in particular
-- write `pages.content` DIRECTLY from the browser (BuilderEditor.tsx's Supabase client), never
-- through a Next.js route — so no application-code hook can see every save. Database triggers
-- on the two real source-of-truth tables (content_blocks, pages) catch every write path
-- uniformly, including that one, without blocking the save on an OpenAI round trip.
--
-- Async design: a trigger enqueues (cheap, synchronous) into lms_ai_ingest_queue and marks
-- course_lessons.ai_content_status = 'stale'; a cron poller (registered separately in
-- vercel.json) processes the queue every 5 minutes, calling the real chunking/embedding and
-- summary pipelines, then marks the lesson 'current' (or 'failed', with the row kept for retry
-- up to a small cap). The queue is one row per lesson (PK), not a history log — rapid repeated
-- edits to the same lesson coalesce into a single pending re-embed.

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS ai_content_status text
    CHECK (ai_content_status IN ('pending', 'stale', 'current', 'failed')),
  ADD COLUMN IF NOT EXISTS ai_content_error text,
  ADD COLUMN IF NOT EXISTS ai_content_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lms_ai_ingest_queue (
  lesson_id uuid PRIMARY KEY REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lms_ai_ingest_queue_requested_at ON public.lms_ai_ingest_queue (requested_at);

ALTER TABLE public.lms_ai_ingest_queue ENABLE ROW LEVEL SECURITY;
-- Service-role only — the cron worker is the only reader/writer; nothing client-facing needs
-- direct access to a work queue (the trigger function below runs SECURITY DEFINER, so it can
-- write to this table regardless of the RLS policy on the triggering table/role).
CREATE POLICY "service_role only lms_ai_ingest_queue" ON public.lms_ai_ingest_queue
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.lms_enqueue_ai_ingest(p_lesson_id uuid, p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_lesson_id IS NULL OR p_workspace_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.lms_ai_ingest_queue (lesson_id, workspace_id, requested_at, attempts)
  VALUES (p_lesson_id, p_workspace_id, now(), 0)
  ON CONFLICT (lesson_id) DO UPDATE SET requested_at = now(), attempts = 0;

  UPDATE public.course_lessons
     SET ai_content_status = 'stale'
   WHERE id = p_lesson_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lms_content_blocks_enqueue_ai_ingest()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lesson_id uuid := COALESCE(NEW.lesson_id, OLD.lesson_id);
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM public.course_lessons WHERE id = v_lesson_id;
  PERFORM public.lms_enqueue_ai_ingest(v_lesson_id, v_workspace_id);
  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trg_content_blocks_enqueue_ai_ingest ON public.content_blocks;
CREATE TRIGGER trg_content_blocks_enqueue_ai_ingest
  AFTER INSERT OR UPDATE OR DELETE ON public.content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.lms_content_blocks_enqueue_ai_ingest();

CREATE OR REPLACE FUNCTION public.lms_pages_enqueue_ai_ingest()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.course_lesson_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Only when the actual canvas tree changed, not on every metadata touch (last_auto_save_at
  -- etc. get bumped far more often than real content edits).
  IF TG_OP = 'UPDATE' AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
    RETURN NEW;
  END IF;
  PERFORM public.lms_enqueue_ai_ingest(NEW.course_lesson_id, NEW.workspace_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pages_enqueue_ai_ingest ON public.pages;
CREATE TRIGGER trg_pages_enqueue_ai_ingest
  AFTER INSERT OR UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.lms_pages_enqueue_ai_ingest();

-- The legacy course_lessons.content field is empty on every real lesson today, but
-- PATCH /api/lms/lessons still accepts and writes it, so it stays a real (if now rare) content
-- source getLessonTextForAI() reads (lessonContentForAI.ts's legacyLessonText fallback). This
-- is what lets the lessons route drop its own inline processLessonForRAG/processLessonSummary
-- calls entirely in favour of the trigger-driven queue, uniformly, without a special case.
CREATE OR REPLACE FUNCTION public.lms_lessons_enqueue_ai_ingest()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
    PERFORM public.lms_enqueue_ai_ingest(NEW.id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lessons_enqueue_ai_ingest ON public.course_lessons;
CREATE TRIGGER trg_lessons_enqueue_ai_ingest
  AFTER INSERT OR UPDATE OF content ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.lms_lessons_enqueue_ai_ingest();
