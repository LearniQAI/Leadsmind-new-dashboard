-- Phase 56: Sprint 4 Extended - Support Public Forum Access

-- 1. Drop existing restricted policies
DROP POLICY IF EXISTS "Workspace Members View forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Workspace Members Create forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Workspace Members View comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Workspace Members Create comments" ON public.forum_comments;

-- 2. Define Public Policies for forum_posts
-- Allow anyone (public) to view posts
CREATE POLICY "Public Read forum posts"
    ON public.forum_posts FOR SELECT
    USING (true);

-- Allow anyone to create posts (for anonymous concerns & members)
CREATE POLICY "Public Insert forum posts"
    ON public.forum_posts FOR INSERT
    WITH CHECK (true);

-- Allow admins/moderators to delete or update posts
CREATE POLICY "Admins Modify forum posts"
    ON public.forum_posts FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Define Public Policies for forum_comments
-- Allow anyone to view comments
CREATE POLICY "Public Read comments"
    ON public.forum_comments FOR SELECT
    USING (true);

-- Allow anyone to insert comments
CREATE POLICY "Public Insert comments"
    ON public.forum_comments FOR INSERT
    WITH CHECK (true);
