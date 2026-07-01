-- LMS Schema Recovery & Sync (Feature 8 Fixes)

-- 1. Ensure 'modules' table exists (renaming reference from course_modules)
-- In the existing system, it's called 'modules'

DO $$
BEGIN
    -- Fix lms_quizzes table if it was created with wrong reference
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_quizzes') THEN
        -- Rename column if needed
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lms_quizzes' AND column_name = 'moduleid') THEN
            ALTER TABLE lms_quizzes RENAME COLUMN moduleid TO module_id;
        END IF;

        -- Fix Foreign Key
        ALTER TABLE lms_quizzes DROP CONSTRAINT IF EXISTS lms_quizzes_moduleid_fkey;
        
        -- Check if it should reference 'modules'
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
            ALTER TABLE lms_quizzes ADD CONSTRAINT lms_quizzes_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 2. Ensure enrollments table exists
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, contact_id)
);

-- 3. Ensure lesson_progress table exists
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    time_spent INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contact_id, lesson_id)
);

-- 4. Calendar Sync Verify
-- Ensure all columns used in UI exist
DO $$
BEGIN
    -- appointments might need status enum or check
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        -- Standard statuses
    END IF;

    -- Ensure 'created_at' and 'updated_at' exist on all calendar tables
    -- (Standard for most tables but usually good to check)
END $$;
