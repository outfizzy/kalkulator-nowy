-- Add new columns to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Update existing rows to have defaults if needed
UPDATE teams SET is_active = true WHERE is_active IS NULL;
UPDATE teams SET tags = '{}' WHERE tags IS NULL;
