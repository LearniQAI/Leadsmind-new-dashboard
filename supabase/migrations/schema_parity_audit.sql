-- LMS & Calendar Missing Field Audit (Feature Verification)

-- 1. Lessons Table Audit
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='youtube_url') THEN
            ALTER TABLE lessons ADD COLUMN youtube_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_preview') THEN
            ALTER TABLE lessons ADD COLUMN is_preview BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='duration_minutes') THEN
            ALTER TABLE lessons ADD COLUMN duration_minutes INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='video_path') THEN
            ALTER TABLE lessons ADD COLUMN video_path TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='pdf_path') THEN
            ALTER TABLE lessons ADD COLUMN pdf_path TEXT;
        END IF;
    END IF;
END $$;

-- 2. Courses Table Audit
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='description') THEN
            ALTER TABLE courses ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='thumbnail_url') THEN
            ALTER TABLE courses ADD COLUMN thumbnail_url TEXT;
        END IF;
    END IF;
END $$;

-- 3. Appointments Table Audit (Status Consistency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        -- Ensure status can handle 'showed_up', 'no_show', etc used in analytics
        -- If it's a text field, it's fine. If it's an enum, we might need to add values.
    END IF;
END $$;
