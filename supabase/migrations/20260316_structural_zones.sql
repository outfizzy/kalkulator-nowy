-- Add structural zone columns to customers table
-- DIN EN 1991-1-3/NA (Snow) and DIN EN 1991-1-4/NA (Wind)

ALTER TABLE customers ADD COLUMN IF NOT EXISTS wind_zone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS snow_zone_din TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS structural_recommendation TEXT;

COMMENT ON COLUMN customers.wind_zone IS 'DIN EN 1991-1-4/NA wind zone, e.g. WZ1, WZ2, WZ3, WZ4';
COMMENT ON COLUMN customers.snow_zone_din IS 'DIN EN 1991-1-3/NA snow zone, e.g. SLZ1, SLZ1a, SLZ2, SLZ2a, SLZ3';
COMMENT ON COLUMN customers.structural_recommendation IS 'Structural recommendation: standard, reinforced, heavy-duty';
