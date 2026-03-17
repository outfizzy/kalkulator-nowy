-- Add expected_duration column for multi-day installations
ALTER TABLE installations ADD COLUMN IF NOT EXISTS expected_duration INTEGER DEFAULT 1;
COMMENT ON COLUMN installations.expected_duration IS 'Number of days for installation (multi-day support)';
