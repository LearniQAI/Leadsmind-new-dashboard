-- Create storage bucket for Builder Media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('builder-media', 'builder-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images
DROP POLICY IF EXISTS "Public Builder Media Access" ON storage.objects;
CREATE POLICY "Public Builder Media Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'builder-media');

-- Authenticated users can upload images
DROP POLICY IF EXISTS "Auth Builder Media Upload" ON storage.objects;
CREATE POLICY "Auth Builder Media Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'builder-media');

-- Authenticated users can update/delete their own images
DROP POLICY IF EXISTS "Auth Builder Media Update" ON storage.objects;
CREATE POLICY "Auth Builder Media Update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'builder-media');

DROP POLICY IF EXISTS "Auth Builder Media Delete" ON storage.objects;
CREATE POLICY "Auth Builder Media Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'builder-media');
