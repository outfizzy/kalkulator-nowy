-- Add structural metadata columns to price_matrix_entries
-- These columns store required construction elements per dimension

ALTER TABLE price_matrix_entries 
ADD COLUMN IF NOT EXISTS posts_count INTEGER,
ADD COLUMN IF NOT EXISTS fields_count INTEGER,
ADD COLUMN IF NOT EXISTS rafter_type TEXT,
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS structural_note TEXT;

-- Add comments for documentation
COMMENT ON COLUMN price_matrix_entries.posts_count IS 'Number of posts required (Anzahl Pfosten)';
COMMENT ON COLUMN price_matrix_entries.fields_count IS 'Number of fields/sections (Anzahl Felder)';
COMMENT ON COLUMN price_matrix_entries.rafter_type IS 'Required rafter type: M-Sparren, L-Sparren, XL-Sparren, etc.';
COMMENT ON COLUMN price_matrix_entries.area_m2 IS 'Roof area in square meters (Fläche)';
COMMENT ON COLUMN price_matrix_entries.structural_note IS 'Additional structural notes (steel reinforcement, etc.)';
