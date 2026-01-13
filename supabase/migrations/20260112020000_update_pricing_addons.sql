-- Migration: Update pricing_addons for Visibility and Media
-- Date: 2026-01-12 02:00:00

-- 1. Add price_table_id to link addons to a specific "Price List" container
ALTER TABLE pricing_addons
ADD COLUMN IF NOT EXISTS price_table_id UUID REFERENCES price_tables(id) ON DELETE CASCADE;

-- 2. Add image_url for individual visual representation
ALTER TABLE pricing_addons
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Create index for faster lookups by table
CREATE INDEX IF NOT EXISTS idx_pricing_addons_table_id ON pricing_addons(price_table_id);

-- 4. Update Policies (Ensure RLS allows access via price_table_id if needed, though usually role-based)
-- Existing policies likely cover "authenticated" or "admin", which is fine.

-- 5. Force Refresh Schema Cache (just in case)
NOTIFY pgrst, 'reload config';
