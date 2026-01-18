-- Add explicit columns to price_tables for robust Aluxe pricing lookup
ALTER TABLE price_tables
ADD COLUMN IF NOT EXISTS model_family text, -- e.g. "Trendstyle", "Ultrastyle"
ADD COLUMN IF NOT EXISTS zone int, -- 1, 2, 3
ADD COLUMN IF NOT EXISTS cover_type text, -- 'polycarbonate', 'glass'
ADD COLUMN IF NOT EXISTS construction_type text; -- 'wall', 'freestanding'

-- Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_price_tables_lookup 
ON price_tables (model_family, zone, cover_type, construction_type);
