-- 1. Table for Premium Templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    content JSONB NOT NULL, -- This is where my serialized JSON goes
    category TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS for Templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view templates" ON templates FOR SELECT USING (true);
CREATE POLICY "Only admins can modify templates" ON templates FOR ALL 
  USING (auth.jwt() ->> 'email' IN ('your-admin-email@example.com'));

-- 3. Enhance Pages Table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS global_css TEXT DEFAULT '';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS header_scripts TEXT DEFAULT '';
