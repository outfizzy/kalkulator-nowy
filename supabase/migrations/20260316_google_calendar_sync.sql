-- Add google_event_id to installations for bidirectional sync
ALTER TABLE installations ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Index for fast lookup when syncing from Google
CREATE INDEX IF NOT EXISTS idx_installations_google_event_id 
    ON installations(google_event_id) 
    WHERE google_event_id IS NOT NULL;
