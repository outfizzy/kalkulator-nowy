-- =====================================================
-- B2B Marketing Materials Module
-- Download center for partners with admin management
-- =====================================================

-- Materials table (files/documents)
CREATE TABLE IF NOT EXISTS b2b_marketing_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other', -- 'catalog', 'photo', 'video', 'tech', 'promo', 'other'
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER, -- bytes
    file_type TEXT, -- MIME type
    thumbnail_url TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'de', -- 'de', 'pl', 'en'
    product_family TEXT, -- Optional link to product
    
    -- Visibility
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    visible_to_roles TEXT[] DEFAULT '{"b2b_partner", "b2b_manager"}',
    
    -- Stats
    download_count INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Download log (tracking)
CREATE TABLE IF NOT EXISTS b2b_downloads_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES b2b_marketing_materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    partner_id UUID REFERENCES b2b_partners(id),
    
    -- Context
    ip_address TEXT,
    user_agent TEXT,
    
    downloaded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_b2b_materials_category ON b2b_marketing_materials(category);
CREATE INDEX IF NOT EXISTS idx_b2b_materials_active ON b2b_marketing_materials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_b2b_downloads_material ON b2b_downloads_log(material_id);
CREATE INDEX IF NOT EXISTS idx_b2b_downloads_partner ON b2b_downloads_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_downloads_date ON b2b_downloads_log(downloaded_at);

-- RLS Policies

ALTER TABLE b2b_marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_downloads_log ENABLE ROW LEVEL SECURITY;

-- Materials: Admin/Manager can do everything
CREATE POLICY "b2b_materials_admin_full" ON b2b_marketing_materials
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'b2b_manager')
        )
    );

-- Materials: Partners can view active materials
CREATE POLICY "b2b_materials_partner_read" ON b2b_marketing_materials
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'b2b_partner'
        )
    );

-- Downloads Log: Admin/Manager can view all
CREATE POLICY "b2b_downloads_admin_view" ON b2b_downloads_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'b2b_manager')
        )
    );

-- Downloads Log: Partners can insert (log their downloads)
CREATE POLICY "b2b_downloads_partner_insert" ON b2b_downloads_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- Storage bucket for marketing files
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2b-marketing', 'b2b-marketing', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "b2b_marketing_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'b2b-marketing');

CREATE POLICY "b2b_marketing_admin_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'b2b-marketing'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'b2b_manager')
    )
);

CREATE POLICY "b2b_marketing_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'b2b-marketing'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'b2b_manager')
    )
);

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(material_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE b2b_marketing_materials
    SET download_count = download_count + 1
    WHERE id = material_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
