-- Create a new private bucket 'attachments'
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

-- Policy: Everyone can view (since we made it public, or restrict if needed)
-- Making it public for simplicity of viewing in UI without signed URLs for now
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'attachments' );

-- Policy: Users can delete their own files (optional, good practice)
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING ( bucket_id = 'attachments' AND auth.uid() = owner );
