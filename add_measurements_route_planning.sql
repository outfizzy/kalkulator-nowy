-- Enhancement: Add route planning and location fields to measurements table

-- Add new columns for route planning and geolocation
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS order_in_route INTEGER,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS distance_from_previous DECIMAL(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN measurements.estimated_duration IS 'Estimated duration of measurement in minutes (default: 30)';
COMMENT ON COLUMN measurements.order_in_route IS 'Order of this measurement in the optimized route for the day';
COMMENT ON COLUMN measurements.location_lat IS 'Latitude coordinate from geocoding';
COMMENT ON COLUMN measurements.location_lng IS 'Longitude coordinate from geocoding';
COMMENT ON COLUMN measurements.distance_from_previous IS 'Distance in kilometers from previous measurement in route';

-- Create index for geospatial queries (useful for future proximity searches)
CREATE INDEX IF NOT EXISTS idx_measurements_location ON measurements(location_lat, location_lng);

-- Create index for route ordering
CREATE INDEX IF NOT EXISTS idx_measurements_route_order ON measurements(scheduled_date, order_in_route);
