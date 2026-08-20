-- Task 95: AI Course Summaries & Lesson Notes
-- A thin layer on top of Task 96's infrastructure: reuses extractLessonText()
-- and the same content_hash change-detection idea, but this is a single
-- chat-completion summarization call per lesson — no embeddings, no vector
-- column, no retrieval. One row per lesson (upserted on regenerate), not an
-- append-only generation log like the other AI features, since a lesson only
-- ever needs its latest summary shown to students.

CREATE TABLE IF NOT EXISTS public.lesson_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL UNIQUE REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    summary_bullets JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_summaries_course ON public.lesson_summaries(course_id);

CREATE OR REPLACE FUNCTION update_lesson_summaries_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lesson_summaries_modtime ON public.lesson_summaries;
CREATE TRIGGER trg_update_lesson_summaries_modtime
BEFORE UPDATE ON public.lesson_summaries
FOR EACH ROW EXECUTE PROCEDURE update_lesson_summaries_modtime();

ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;

-- Instructors (internal team members) manage summaries for their own
-- workspace — same pattern as course_content_chunks.
DROP POLICY IF EXISTS "instructors manage lesson_summaries" ON public.lesson_summaries;
CREATE POLICY "instructors manage lesson_summaries" ON public.lesson_summaries
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Enrolled students read summaries for courses they're enrolled in — the
-- exact contact/email + enrollments join pattern as student_rls_policies.sql
-- and course_content_chunks (students are CRM contacts, not workspace_members).
DROP POLICY IF EXISTS "students read lesson_summaries for enrolled courses" ON public.lesson_summaries;
CREATE POLICY "students read lesson_summaries for enrolled courses" ON public.lesson_summaries
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.contacts ct ON e.contact_id = ct.id
      WHERE e.course_id = lesson_summaries.course_id
      AND ct.email = auth.jwt() ->> 'email'
    ));
