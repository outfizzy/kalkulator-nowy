-- Add trip_type column to fuel_logs
ALTER TABLE fuel_logs 
ADD COLUMN IF NOT EXISTS trip_type TEXT CHECK (trip_type IN ('montaż', 'pomiar', 'prywatne'));

-- Add comment
COMMENT ON COLUMN fuel_logs.trip_type IS 'Type of trip: montaż (installation), pomiar (measurement), prywatne (private)';
