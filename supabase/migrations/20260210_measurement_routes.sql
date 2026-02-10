-- Create measurement_routes table for storing calculated routes and fuel costs
CREATE TABLE IF NOT EXISTS measurement_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE UNIQUE,
    origin_address TEXT DEFAULT 'Gubin 66-620, Poland' NOT NULL,
    destination_address TEXT NOT NULL,
    distance_km NUMERIC NOT NULL CHECK (distance_km >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    route_polyline TEXT, -- Encoded polyline for map display
    fuel_price_per_liter NUMERIC, -- Price from fuel_prices table
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add computed columns for fuel consumption and cost
-- Fuel consumption: 8 liters per 100km
ALTER TABLE measurement_routes
ADD COLUMN fuel_consumption_liters NUMERIC GENERATED ALWAYS AS (distance_km * 0.08) STORED;

-- Fuel cost: consumption × price per liter
ALTER TABLE measurement_routes
ADD COLUMN fuel_cost NUMERIC GENERATED ALWAYS AS (
    CASE 
        WHEN fuel_price_per_liter IS NOT NULL 
        THEN (distance_km * 0.08) * fuel_price_per_liter 
        ELSE NULL 
    END
) STORED;

-- Enable RLS
ALTER TABLE measurement_routes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage routes
CREATE POLICY "Authenticated users can manage measurement routes" ON measurement_routes
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_measurement_routes_measurement_id ON measurement_routes(measurement_id);
CREATE INDEX idx_measurement_routes_calculated_at ON measurement_routes(calculated_at);

-- Add comments
COMMENT ON TABLE measurement_routes IS 'Calculated routes from Gubin to measurement locations with fuel costs';
COMMENT ON COLUMN measurement_routes.distance_km IS 'Total distance in kilometers (highway routes preferred)';
COMMENT ON COLUMN measurement_routes.duration_minutes IS 'Estimated driving time in minutes';
COMMENT ON COLUMN measurement_routes.route_polyline IS 'Google Maps encoded polyline for route visualization';
COMMENT ON COLUMN measurement_routes.fuel_consumption_liters IS 'Calculated fuel consumption at 8L/100km';
COMMENT ON COLUMN measurement_routes.fuel_cost IS 'Total fuel cost based on consumption and price per liter';
