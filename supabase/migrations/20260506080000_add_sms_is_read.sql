-- Add is_read field to sms_logs for tracking unread inbound messages
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT true;

-- Mark all existing inbound messages as read (historical data)
UPDATE sms_logs SET is_read = true WHERE direction = 'inbound';

-- New inbound messages should default to unread
-- We set default = true but the webhook will explicitly set is_read = false for inbound
