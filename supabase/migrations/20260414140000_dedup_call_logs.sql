-- Add unique constraint on twilio_call_sid to prevent duplicate call log entries.
-- This ensures that concurrent callbacks from Twilio for the same call 
-- cannot both insert separate rows.

-- First, clean up existing duplicates (keep the one with recording or latest)
DELETE FROM call_logs a
USING call_logs b
WHERE a.id < b.id
  AND a.twilio_call_sid IS NOT NULL
  AND a.twilio_call_sid = b.twilio_call_sid
  AND (
    -- Keep the one with recording_url
    (b.recording_url IS NOT NULL AND a.recording_url IS NULL)
    OR
    -- Or keep the one with higher duration
    (COALESCE(b.duration_seconds, 0) > COALESCE(a.duration_seconds, 0))
    OR
    -- Or keep the more recent one
    (a.recording_url IS NULL AND b.recording_url IS NULL AND b.created_at > a.created_at)
  );

-- Now add the unique index (only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_logs_twilio_call_sid_unique
ON call_logs (twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
