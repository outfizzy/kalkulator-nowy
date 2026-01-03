-- Add currency to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate_currency TEXT DEFAULT 'PLN';

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
-- Everyone can read settings (needed for calculations)
DROP POLICY IF EXISTS "Everyone can read system settings" ON system_settings;
CREATE POLICY "Everyone can read system settings" ON system_settings
    FOR SELECT USING (true);

-- Only admins and managers can update settings
DROP POLICY IF EXISTS "Admins and Managers can update system settings" ON system_settings;
CREATE POLICY "Admins and Managers can update system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Insert default EUR rate if not exists
INSERT INTO system_settings (key, value)
VALUES ('eur_rate', '4.30'::jsonb)
ON CONFLICT (key) DO NOTHING;
