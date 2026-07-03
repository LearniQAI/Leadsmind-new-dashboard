-- Migration: Extend Modules schema and configure indices for LMS structural hierarchy
-- File: supabase/migrations/20260531000000_lms_extended_modules.sql

-- 1. Create the publish status ENUM for modules
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'module_publish_status') THEN
        CREATE TYPE module_publish_status AS ENUM ('Draft', 'Published', 'Coming Soon');
    END IF;
END $$;

-- 2. Rename title to name in modules if exists, maintaining data integrity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'title') THEN
        ALTER TABLE public.modules RENAME COLUMN title TO name;
    END IF;
END $$;

-- 3. Extend public.modules table with the required attributes
ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS publish_status module_publish_status DEFAULT 'Draft',
ADD COLUMN IF NOT EXISTS nqf_level VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_required_for_completion BOOLEAN DEFAULT false;

-- 4. Set default value for any legacy rows that might exist in modules
UPDATE public.modules SET publish_status = 'Draft' WHERE publish_status IS NULL;

-- 5. Add index optimizations for hierarchy ordering (Courses › Course Name › Module › Lesson/Lecture)
-- Optimizes querying modules under a course by their order_index
CREATE INDEX IF NOT EXISTS idx_modules_course_id_order 
ON public.modules (course_id, order_index ASC);

-- Optimizes querying lessons under a module by their order_index
CREATE INDEX IF NOT EXISTS idx_lessons_module_id_order 
ON public.lessons (module_id, order_index ASC);

-- 6. Ensure RLS is enabled and verify default policy
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Note: Recreate policies for courses, modules, and lessons to use workspace_members 
-- instead of the non-existent public.profiles table.
DROP POLICY IF EXISTS "Workspace owners can manage courses" ON public.courses;
CREATE POLICY "Workspace owners can manage courses"
ON public.courses FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace owners can manage modules" ON public.modules;
CREATE POLICY "Workspace owners can manage modules"
ON public.modules FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = modules.course_id 
    AND c.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "Workspace owners can manage lessons" ON public.lessons;
CREATE POLICY "Workspace owners can manage lessons"
ON public.lessons FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.modules m 
    JOIN public.courses c ON m.course_id = c.id 
    WHERE m.id = lessons.module_id 
    AND c.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
));
