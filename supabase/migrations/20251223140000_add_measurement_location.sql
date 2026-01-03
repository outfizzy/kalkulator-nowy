-- Add location columns to measurements
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS location_lng double precision;

-- Add location columns to customers (for future use/leads)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lng double precision;
