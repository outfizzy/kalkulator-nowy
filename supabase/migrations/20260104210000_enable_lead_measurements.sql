-- Migration: Add lead_id to measurements table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 'lead_id') THEN
        ALTER TABLE measurements ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
END $$;
