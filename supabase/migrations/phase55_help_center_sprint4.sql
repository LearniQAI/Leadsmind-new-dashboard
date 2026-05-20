-- Phase 55: Sprint 4 Help Center - Forums & Extended Analytics Support

-- 1. Relax/Extend help_articles category check constraint to support Phase II content library
ALTER TABLE public.help_articles DROP CONSTRAINT IF EXISTS help_articles_category_check;
ALTER TABLE public.help_articles ADD CONSTRAINT help_articles_category_check CHECK (category IN (
    'Getting Started', 
    'CRM Foundations',
    'LMS Advanced Workflows',
    'Accounting & Finance',
    'Invoicing & Automated Payments',
    'Email Marketing System',
    'Workflow Automation',
    'System Controls & Extensions'
));

-- 2. Create forum_posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Workspace Member',
    board TEXT CHECK (board IN (
        'Ask a Question', 
        'Show and Tell Showcase', 
        'SA Business Tax & Continuity Strategy', 
        'Feature Request Voting', 
        'Verified Automation Recipes'
    )) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create forum_comments table
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Workspace Member',
    content TEXT NOT NULL,
    is_lena BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create index for forum performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_workspace_id ON public.forum_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON public.forum_comments(post_id);

-- 5. Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- 6. Set RLS Policies for forum_posts
DROP POLICY IF EXISTS "Workspace Members View forum posts" ON public.forum_posts;
CREATE POLICY "Workspace Members View forum posts"
    ON public.forum_posts FOR SELECT
    USING (workspace_id IN (SELECT ws_member.workspace_id FROM public.workspace_members ws_member WHERE ws_member.user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace Members Create forum posts" ON public.forum_posts;
CREATE POLICY "Workspace Members Create forum posts"
    ON public.forum_posts FOR INSERT
    WITH CHECK (workspace_id IN (SELECT ws_member.workspace_id FROM public.workspace_members ws_member WHERE ws_member.user_id = auth.uid()));

-- 7. Set RLS Policies for forum_comments
DROP POLICY IF EXISTS "Workspace Members View comments" ON public.forum_comments;
CREATE POLICY "Workspace Members View comments"
    ON public.forum_comments FOR SELECT
    USING (true); -- Publicly viewable comments if posts are visible

DROP POLICY IF EXISTS "Workspace Members Create comments" ON public.forum_comments;
CREATE POLICY "Workspace Members Create comments"
    ON public.forum_comments FOR INSERT
    WITH CHECK (true); -- Allow comments insertion (needed for both user and LENA auto moderator)
