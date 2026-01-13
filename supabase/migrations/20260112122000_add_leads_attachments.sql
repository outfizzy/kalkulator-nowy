-- Add attachments column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Comment
COMMENT ON COLUMN leads.attachments IS 'List of parsed attachments from source (e.g. Email)';
