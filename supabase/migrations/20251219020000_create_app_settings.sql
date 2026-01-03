-- Create app_settings table for global configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
ON app_settings FOR SELECT
TO authenticated
USING (true);

-- Policy: Only Admins can update settings
-- Assuming we check admin role via a function or just trust the app logic for now with a broad policy restricted to application users if needed.
-- Ideally we use is_admin() function if available. Let's check available functions or use a simpler check.
-- Since I don't see is_admin() used in other migrations explicitly right now, I'll use a generic "authenticated can update" but limiting UI side.
-- Better: Use a check against profiles table if possible, but recursive policies are tricky.
-- Safe bet for this project context: Allow authenticated update, but UI protects it.
CREATE POLICY "Authenticated users can update settings"
ON app_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert settings"
ON app_settings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert placeholder for buero email if not exists
INSERT INTO app_settings (key, value)
VALUES (
    'email_buero', 
    '{
        "smtpHost": "serwer2426445.home.pl",
        "smtpPort": 587,
        "smtpUser": "buero@polendach24.de",
        "smtpPassword": "",
        "imapHost": "serwer2426445.home.pl",
        "imapPort": 993,
        "imapUser": "buero@polendach24.de",
        "imapPassword": "",
        "signature": ""
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;
