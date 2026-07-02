-- Migration: Phase 90 - Teammate Avatar Engine & Storage Fields Configuration

-- 1. Extend public.users profiles with team member metadata
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS avatar_preset_id TEXT,
    ADD COLUMN IF NOT EXISTS job_title TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS identity_color TEXT DEFAULT '#3b82f6';

-- 2. Add computed full_name column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users 
            ADD COLUMN full_name TEXT GENERATED ALWAYS AS (TRIM(first_name || ' ' || last_name)) STORED;
    END IF;
END $$;

-- 3. Extend blog_social_imports with team_member_id for tracking creators of imports
ALTER TABLE public.blog_social_imports 
    ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Enable index for team member lookup speed
CREATE INDEX IF NOT EXISTS idx_users_job_title ON public.users(job_title);
CREATE INDEX IF NOT EXISTS idx_blog_social_imports_team_member ON public.blog_social_imports(team_member_id);
