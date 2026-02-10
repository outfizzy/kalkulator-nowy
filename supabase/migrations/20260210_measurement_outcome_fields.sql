-- Add outcome tracking fields to measurements table

-- Add completed_at timestamp
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add outcome field with check constraint
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS outcome TEXT 
CHECK (outcome IN ('signed', 'considering', 'rejected', 'no_show'));

-- Add outcome notes
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Add reminder sent flag
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add route reference
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES measurement_routes(id) ON DELETE SET NULL;

-- Create index for pending measurements (for reminder system)
CREATE INDEX idx_measurements_pending_outcome 
ON measurements(scheduled_date, outcome) 
WHERE outcome IS NULL AND completed_at IS NULL;

-- Create index for route lookups
CREATE INDEX idx_measurements_route_id ON measurements(route_id);

-- Add comments
COMMENT ON COLUMN measurements.completed_at IS 'Timestamp when measurement was marked as completed';
COMMENT ON COLUMN measurements.outcome IS 'Result of measurement: signed (contract), considering (follow-up), rejected, or no_show';
COMMENT ON COLUMN measurements.outcome_notes IS 'Additional notes about the measurement outcome';
COMMENT ON COLUMN measurements.reminder_sent IS 'Whether reminder to complete outcome was sent';
COMMENT ON COLUMN measurements.route_id IS 'Reference to calculated route from measurement_routes';
