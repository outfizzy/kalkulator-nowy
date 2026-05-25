-- Add won_reason, won_value, won_at columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_value NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;
