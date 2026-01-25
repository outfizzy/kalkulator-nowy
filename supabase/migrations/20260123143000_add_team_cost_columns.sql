-- Add missing columns to installation_teams table
-- These columns are used for cost calculation and team management

ALTER TABLE public.installation_teams 
ADD COLUMN IF NOT EXISTS fuel_consumption DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vehicle_maintenance_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5}'::integer[];

-- Add comment
COMMENT ON COLUMN public.installation_teams.fuel_consumption IS 'Fuel consumption per 100km in liters';
COMMENT ON COLUMN public.installation_teams.vehicle_maintenance_rate IS 'Daily vehicle maintenance cost in PLN';
COMMENT ON COLUMN public.installation_teams.working_days IS 'Working days array (1=Mon, 7=Sun)';
