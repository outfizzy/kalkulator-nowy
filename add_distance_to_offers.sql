-- Add distance column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS distance INTEGER DEFAULT 0;

-- Update existing rows to have default value (optional, as default handles new rows)
UPDATE offers SET distance = 0 WHERE distance IS NULL;
