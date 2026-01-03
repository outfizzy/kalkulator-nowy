-- Migration to fix potential missing columns in installations table
-- This serves as a safety net for "Error loading installations" issues

DO $$
BEGIN
    -- 1. Ensure 'parts_ready' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'parts_ready') THEN
        ALTER TABLE public.installations ADD COLUMN parts_ready BOOLEAN DEFAULT false;
    END IF;

    -- 2. Ensure 'expected_duration' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'expected_duration') THEN
        ALTER TABLE public.installations ADD COLUMN expected_duration INTEGER DEFAULT 1;
    END IF;

    -- 3. Ensure 'delivery_date' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'delivery_date') THEN
        ALTER TABLE public.installations ADD COLUMN delivery_date DATE;
    END IF;

    -- 4. Ensure 'team_id' column exists (even if we use installation_data, the service might query it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'team_id') THEN
        ALTER TABLE public.installations ADD COLUMN team_id UUID REFERENCES public.installation_teams(id);
    END IF;

    -- 5. Ensure 'notes' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'notes') THEN
        ALTER TABLE public.installations ADD COLUMN notes TEXT;
    END IF;

    -- 6. Ensure 'status' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'status') THEN
        ALTER TABLE public.installations ADD COLUMN status TEXT DEFAULT 'planned';
    END IF;

  -- 7. Ensure 'scheduled_date' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'scheduled_date') THEN
        ALTER TABLE public.installations ADD COLUMN scheduled_date DATE;
    END IF;

END $$;
