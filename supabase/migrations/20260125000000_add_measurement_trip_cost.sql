-- Migration: Add trip cost tracking to measurement reports
-- Allows admin/manager to record cost of measurement trips

-- Add new columns to measurement_reports table
ALTER TABLE measurement_reports 
ADD COLUMN IF NOT EXISTS trip_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cost_per_km DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS trip_cost_updated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS trip_cost_updated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN measurement_reports.trip_cost IS 'Total trip cost in EUR, entered by admin/manager';
COMMENT ON COLUMN measurement_reports.cost_per_km IS 'Cost rate per kilometer for this trip';
COMMENT ON COLUMN measurement_reports.trip_cost_updated_by IS 'User who last updated the trip cost';
COMMENT ON COLUMN measurement_reports.trip_cost_updated_at IS 'Timestamp when trip cost was last updated';
