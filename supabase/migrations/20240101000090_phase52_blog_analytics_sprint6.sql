-- Sprint 6: Blog Analytics & Comments Framework
-- Table: blog_settings
CREATE TABLE IF NOT EXISTS public.blog_settings (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    comments_engine TEXT DEFAULT 'native' CHECK (comments_engine IN ('none', 'native', 'disqus')),
    disqus_shortname TEXT,
    analytics_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id)
);

-- Table: blog_comments
CREATE TABLE IF NOT EXISTS public.blog_comments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_email TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: blog_pageviews
CREATE TABLE IF NOT EXISTS public.blog_pageviews (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL, -- Anonymous hashed visitor ID
    scroll_depth INTEGER DEFAULT 0, -- percentage
    time_spent INTEGER DEFAULT 0, -- seconds
    source TEXT,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast querying
CREATE INDEX idx_blog_comments_post_id ON public.blog_comments(post_id);
CREATE INDEX idx_blog_comments_workspace_id ON public.blog_comments(workspace_id);
CREATE INDEX idx_blog_pageviews_post_id ON public.blog_pageviews(post_id);
CREATE INDEX idx_blog_pageviews_workspace_id ON public.blog_pageviews(workspace_id);
CREATE INDEX idx_blog_pageviews_created_at ON public.blog_pageviews(created_at);

-- RLS Policies
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_pageviews ENABLE ROW LEVEL SECURITY;

-- Blog Settings Policies
CREATE POLICY "Users can view their workspace blog settings"
    ON public.blog_settings FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their workspace blog settings"
    ON public.blog_settings FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their workspace blog settings"
    ON public.blog_settings FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Blog Comments Policies
CREATE POLICY "Public can view approved comments"
    ON public.blog_comments FOR SELECT
    USING (status = 'approved');

CREATE POLICY "Public can insert comments"
    ON public.blog_comments FOR INSERT
    WITH CHECK (true); -- Public submission

CREATE POLICY "Users can manage workspace comments"
    ON public.blog_comments FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Blog Pageviews Policies
CREATE POLICY "Public can insert pageviews"
    ON public.blog_pageviews FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view workspace pageviews"
    ON public.blog_pageviews FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_blog_settings_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_settings_modtime
BEFORE UPDATE ON public.blog_settings
FOR EACH ROW EXECUTE PROCEDURE update_blog_settings_modtime();

CREATE OR REPLACE FUNCTION update_blog_comments_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_comments_modtime
BEFORE UPDATE ON public.blog_comments
FOR EACH ROW EXECUTE PROCEDURE update_blog_comments_modtime();
