-- Track who marked a lead as lost and when
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
