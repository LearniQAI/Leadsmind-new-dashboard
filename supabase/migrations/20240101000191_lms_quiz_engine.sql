-- Migration: LMS Quiz Engine Tables & RLS Policies
-- File: supabase/migrations/20260531000002_lms_quiz_engine.sql

-- 1. Ensure lms_quizzes has a foreign key to public.lessons for direct linkage
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

-- 2. Create QuizOptions table if not exists for granular relational question option nodes
CREATE TABLE IF NOT EXISTS public.lms_quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    question_id UUID NOT NULL REFERENCES public.lms_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create QuizExplanations table if not exists for granular pedagogical feedback loops
CREATE TABLE IF NOT EXISTS public.lms_quiz_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    question_id UUID NOT NULL REFERENCES public.lms_questions(id) ON DELETE CASCADE,
    explanation_text TEXT NOT NULL,
    trigger_condition TEXT DEFAULT 'always', -- 'always', 'correct', 'incorrect', or option_id
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_explanations ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreate all policies using public.workspace_members mapping for workspace context security
DROP POLICY IF EXISTS "Workspace access for quizzes" ON public.lms_quizzes;
CREATE POLICY "Workspace access for quizzes"
ON public.lms_quizzes FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace access for questions" ON public.lms_questions;
CREATE POLICY "Workspace access for questions"
ON public.lms_questions FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace access for quiz options" ON public.lms_quiz_options;
CREATE POLICY "Workspace access for quiz options"
ON public.lms_quiz_options FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace access for quiz explanations" ON public.lms_quiz_explanations;
CREATE POLICY "Workspace access for quiz explanations"
ON public.lms_quiz_explanations FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6. Index optimizations
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.lms_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.lms_quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_explanations_question ON public.lms_quiz_explanations(question_id);
