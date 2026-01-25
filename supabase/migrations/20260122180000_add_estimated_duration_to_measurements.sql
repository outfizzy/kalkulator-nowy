-- Migration: Add estimated_duration to measurements table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 'estimated_duration') THEN
        ALTER TABLE measurements ADD COLUMN estimated_duration INTEGER DEFAULT 60;
    END IF;
END $$;
