-- Add planning fields to installations table

-- 1. Add parts_ready (boolean, default false)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'parts_ready') THEN
        ALTER TABLE installations ADD COLUMN parts_ready BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Add expected_duration (integer, default 1)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'expected_duration') THEN
        ALTER TABLE installations ADD COLUMN expected_duration INTEGER DEFAULT 1;
    END IF;
END $$;

-- 3. Update RLS (if needed, but usually existing policies cover updates)
-- Assuming existing policies allow update for authorized users.
