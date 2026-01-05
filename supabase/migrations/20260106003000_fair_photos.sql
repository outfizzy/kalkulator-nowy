-- Create storage bucket for fair uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('fair_uploads', 'fair_uploads', true) -- Public for easier reading in CRM
ON CONFLICT (id) DO NOTHING;

-- Policies for fair_uploads
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'fair_uploads');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fair_uploads' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'fair_uploads' AND auth.role() = 'authenticated');

-- Add fair_photos to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS fair_photos JSONB DEFAULT '[]'::jsonb; -- Store array of { url, name, uploadedAt }
