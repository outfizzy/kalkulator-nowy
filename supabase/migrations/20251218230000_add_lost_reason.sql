-- Add lost_reason column to leads table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lost_reason') THEN
        ALTER TABLE public.leads ADD COLUMN lost_reason TEXT;
    END IF;
END $$;
