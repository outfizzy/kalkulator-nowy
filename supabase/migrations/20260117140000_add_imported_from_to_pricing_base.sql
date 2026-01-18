-- Add metadata columns to pricing_base for Manual Importer tracking
ALTER TABLE pricing_base 
ADD COLUMN IF NOT EXISTS imported_from text,
ADD COLUMN IF NOT EXISTS original_line text;

-- Add comment
COMMENT ON COLUMN pricing_base.imported_from IS 'Name of the source model or file this entry was imported from (for Matrix/Addon imports)';
COMMENT ON COLUMN pricing_base.original_line IS 'The original raw CSV/Text line used to generate this entry (for debugging)';
