-- Drop potentially conflicting constraints
ALTER TABLE pricing_base DROP CONSTRAINT IF EXISTS pricing_base_model_family_construction_type_cover_type_zone_key;
ALTER TABLE pricing_base DROP CONSTRAINT IF EXISTS pricing_base_model_family_construction_type_cover_type_zone_width_mm_depth_mm_key;

-- Create a robust unique index that handles NULL source_import_id correctly
-- We use COALESCE to treat NULL as an empty string for uniqueness purposes, preventing duplicates even for global items.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_base_unique_composite 
ON pricing_base (
    model_family, 
    construction_type, 
    cover_type, 
    zone, 
    width_mm, 
    depth_mm, 
    (COALESCE(source_import_id, ''))
);
