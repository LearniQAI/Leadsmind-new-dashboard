-- Task 96: RAG-Based Q&A Over Course Content
-- pgvector is already enabled (see 20240101000091_phase53_help_center_sprint1.sql,
-- which also established the exact pattern replicated here: vector(1536) for
-- text-embedding-3-small, an HNSW cosine-similarity index, and a match_* RPC).

CREATE TABLE IF NOT EXISTS public.course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content_text TEXT NOT NULL,
    -- Snapshot of lesson/module titles at embed time, for citation display without
    -- an extra join at query time. Only goes stale if a title changes without the
    -- lesson's content also changing (which wouldn't retrigger re-embedding, since
    -- content_hash only tracks the extracted text) — a known, minor limitation.
    source_reference JSONB NOT NULL,
    -- Hash of the WHOLE lesson's extracted text (shared by every chunk from that
    -- lesson/version) — lets the processing pipeline skip re-embedding on a lesson
    -- save where the actual text content didn't change.
    content_hash TEXT NOT NULL,
    embedding vector(1536),
    model_used VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_embedding
    ON public.course_content_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_lesson
    ON public.course_content_chunks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course
    ON public.course_content_chunks(course_id);

-- Vector similarity RPC, scoped to one course — same shape as match_help_articles.
CREATE OR REPLACE FUNCTION public.match_course_content_chunks(
  query_embedding vector(1536),
  p_course_id UUID,
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  chunk_index INT,
  content_text TEXT,
  source_reference JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ccc.id,
    ccc.lesson_id,
    ccc.chunk_index,
    ccc.content_text,
    ccc.source_reference,
    1 - (ccc.embedding <=> query_embedding) AS similarity
  FROM public.course_content_chunks ccc
  WHERE ccc.course_id = p_course_id
    AND 1 - (ccc.embedding <=> query_embedding) > match_threshold
  ORDER BY ccc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

ALTER TABLE public.course_content_chunks ENABLE ROW LEVEL SECURITY;

-- Instructors (internal team members) manage chunks for their own workspace.
DROP POLICY IF EXISTS "instructors manage course_content_chunks" ON public.course_content_chunks;
CREATE POLICY "instructors manage course_content_chunks" ON public.course_content_chunks
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Enrolled students read chunks for courses they're enrolled in — same
-- contact/email + enrollments join pattern as student_rls_policies.sql, NOT
-- workspace_members (students are CRM contacts, not necessarily team members).
DROP POLICY IF EXISTS "students read course_content_chunks for enrolled courses" ON public.course_content_chunks;
CREATE POLICY "students read course_content_chunks for enrolled courses" ON public.course_content_chunks
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.contacts ct ON e.contact_id = ct.id
      WHERE e.course_id = course_content_chunks.course_id
      AND ct.email = auth.jwt() ->> 'email'
    ));

-- Q&A interaction history — append-only, same shape/rationale as the other
-- ai_*_generations tables. user_id is auth.uid() (the real Supabase Auth
-- identity), not contact_id, since RLS here keys on auth.uid() directly.
CREATE TABLE IF NOT EXISTS public.course_qa_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_chunks_used JSONB NOT NULL DEFAULT '[]'::JSONB,
    grounded BOOLEAN NOT NULL DEFAULT false,
    model_used VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_qa_interactions_user_course
    ON public.course_qa_interactions(user_id, course_id, created_at DESC);

ALTER TABLE public.course_qa_interactions ENABLE ROW LEVEL SECURITY;

-- Students see only their own Q&A history — no existing instructor-visibility
-- precedent was found for equivalent student-activity tables (quiz_attempts
-- RLS is also strictly student-own-rows-only in this codebase), so this
-- matches that same convention rather than inventing new instructor access.
DROP POLICY IF EXISTS "users read own course_qa_interactions" ON public.course_qa_interactions;
CREATE POLICY "users read own course_qa_interactions" ON public.course_qa_interactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
