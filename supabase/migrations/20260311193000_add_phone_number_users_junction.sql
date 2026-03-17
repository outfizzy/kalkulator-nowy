-- Junction table for multi-user phone number access
CREATE TABLE IF NOT EXISTS phone_number_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number_id uuid NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_whatsapp boolean DEFAULT true,
    can_voice boolean DEFAULT true,
    can_sms boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(phone_number_id, user_id)
);

-- Migrate existing assigned_to data
INSERT INTO phone_number_users (phone_number_id, user_id, can_whatsapp, can_voice, can_sms)
SELECT id, assigned_to, true, true, true
FROM phone_numbers
WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE phone_number_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "phone_number_users_read" ON phone_number_users
    FOR SELECT TO authenticated USING (true);

-- Allow admins to manage
CREATE POLICY "phone_number_users_manage" ON phone_number_users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
