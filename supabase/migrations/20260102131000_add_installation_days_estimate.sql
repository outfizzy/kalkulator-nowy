DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'installation_days_estimate') THEN
        ALTER TABLE contracts ADD COLUMN installation_days_estimate INTEGER DEFAULT 1;
        COMMENT ON COLUMN contracts.installation_days_estimate IS 'Estimated number of days for installation, set by Sales Rep';
    END IF;
END $$;
