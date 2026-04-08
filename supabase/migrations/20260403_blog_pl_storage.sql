-- ═══ Storage Policy for Blog PL Images ═══
-- Allow authenticated users to upload to blog-pl/ folder in the 'public' bucket
-- The bucket 'public' should already exist

-- Upload policy: admin and sales_rep_pl can upload blog images
CREATE POLICY "Blog PL image upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'blog-pl'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'sales_rep_pl')
    )
  );

-- Read policy: anyone can view blog images (they're public content)
CREATE POLICY "Blog PL images publicly readable" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'blog-pl'
  );

-- Update policy: admin and sales_rep_pl can update/replace images
CREATE POLICY "Blog PL image update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'blog-pl'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'sales_rep_pl')
    )
  );

-- Delete policy: admin and sales_rep_pl can delete images  
CREATE POLICY "Blog PL image delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'public'
    AND (storage.foldername(name))[1] = 'blog-pl'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'sales_rep_pl')
    )
  );
