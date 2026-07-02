-- Sprint 1: Help Center Database Bedrock, pgvector Engine & RAG Models
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: help_articles
CREATE TABLE IF NOT EXISTS public.help_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body_plain TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Getting Started', 'CRM Foundations')),
    content_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    video_url TEXT,
    video_chapters_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    faq_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    embedding vector(1536),
    helpful_yes INTEGER DEFAULT 0 NOT NULL,
    helpful_no INTEGER DEFAULT 0 NOT NULL,
    last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HNSW Vector Index for OpenAI embeddings
CREATE INDEX IF NOT EXISTS idx_help_articles_embedding ON public.help_articles 
USING hnsw (embedding vector_cosine_ops);

-- Table: help_screenshots
CREATE TABLE IF NOT EXISTS public.help_screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    image_alt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: help_search_log
CREATE TABLE IF NOT EXISTS public.help_search_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    selected_article_id UUID REFERENCES public.help_articles(id) ON DELETE SET NULL,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: lena_conversations
CREATE TABLE IF NOT EXISTS public.lena_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Queries indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_screenshots_article_id ON public.help_screenshots(article_id);
CREATE INDEX IF NOT EXISTS idx_help_search_log_workspace_id ON public.help_search_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lena_conversations_workspace_id ON public.lena_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lena_conversations_user_id ON public.lena_conversations(user_id);

-- RPC for Vector Match cosine similarity
CREATE OR REPLACE FUNCTION public.match_help_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  body_plain TEXT,
  category TEXT,
  content_json JSONB,
  video_url TEXT,
  video_chapters_json JSONB,
  faq_json JSONB,
  helpful_yes INTEGER,
  helpful_no INTEGER,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ha.id,
    ha.slug,
    ha.title,
    ha.body_plain,
    ha.category,
    ha.content_json,
    ha.video_url,
    ha.video_chapters_json,
    ha.faq_json,
    ha.helpful_yes,
    ha.helpful_no,
    ha.last_reviewed_at,
    1 - (ha.embedding <=> query_embedding) AS similarity
  FROM public.help_articles ha
  WHERE 1 - (ha.embedding <=> query_embedding) > match_threshold
  ORDER BY ha.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lena_conversations ENABLE ROW LEVEL SECURITY;

-- Policies for help_articles
CREATE POLICY "Public Read Access on Help Articles"
    ON public.help_articles FOR SELECT
    USING (true);

CREATE POLICY "Administrative Write Access on Help Articles"
    ON public.help_articles FOR ALL
    USING (true); -- Accessible by internal processes / seeding

-- Policies for help_screenshots
CREATE POLICY "Public Read Access on Help Screenshots"
    ON public.help_screenshots FOR SELECT
    USING (true);

CREATE POLICY "Administrative Write Access on Help Screenshots"
    ON public.help_screenshots FOR ALL
    USING (true);

-- Policies for help_search_log
CREATE POLICY "Search Log Log Insertions"
    ON public.help_search_log FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Workspace Members View search logs"
    ON public.help_search_log FOR SELECT
    USING (workspace_id IN (SELECT ws_member.workspace_id FROM public.workspace_members ws_member WHERE ws_member.user_id = auth.uid()));

-- Policies for lena_conversations
CREATE POLICY "Workspace Members Manage lena conversations"
    ON public.lena_conversations FOR ALL
    USING (workspace_id IN (SELECT ws_member.workspace_id FROM public.workspace_members ws_member WHERE ws_member.user_id = auth.uid()));

-- Triggers for modtime auto update
CREATE OR REPLACE FUNCTION update_help_articles_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_help_articles_modtime
BEFORE UPDATE ON public.help_articles
FOR EACH ROW EXECUTE PROCEDURE update_help_articles_modtime();

CREATE OR REPLACE FUNCTION update_lena_conversations_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lena_conversations_modtime
BEFORE UPDATE ON public.lena_conversations
FOR EACH ROW EXECUTE PROCEDURE update_lena_conversations_modtime();
