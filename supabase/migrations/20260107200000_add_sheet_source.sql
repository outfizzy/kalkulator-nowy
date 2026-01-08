
-- Add sheet_source column to price_tables to track origin
ALTER TABLE price_tables
ADD COLUMN IF NOT EXISTS sheet_source TEXT;

COMMENT ON COLUMN price_tables.sheet_source IS 'Original Excel sheet name for auditing data integrity';
