-- MASTER SCRIPT TO FIX PUBLIC INTERACTIONS
-- Run this entire script in Supabase SQL Editor

-- 1. Ensure 'notifications' table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);


-- 2. Ensure 'lead_messages' table exists
-- This table stores chat history and system events for leads
CREATE TABLE IF NOT EXISTS lead_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL, -- soft link to leads or foreign key if leads table allows
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    sender_type TEXT CHECK (sender_type IN ('user', 'client', 'system')),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lead_messages (Optional, but good practice)
ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON lead_messages;
CREATE POLICY "Enable read access for all users" ON lead_messages FOR ALL USING (true);


-- 3. Add Tracking Columns to Offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE;


-- 4. FUNCTION: Get Offer Details + Creator Profile
-- Fixes 'created_by' vs 'user_id' bug and handles missing profile
DROP FUNCTION IF EXISTS get_offer_details_by_token(UUID);
CREATE OR REPLACE FUNCTION get_offer_details_by_token(token_input UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    offer_record RECORD;
    creator_record RECORD;
    result JSON;
BEGIN
    SELECT * INTO offer_record FROM offers WHERE public_token = token_input LIMIT 1;
    
    IF offer_record IS NULL THEN RETURN NULL; END IF;

    -- Fetch creator (handle case where user_id might count as created_by depending on schema, usually user_id in offers)
    SELECT first_name, last_name, email, phone, role
    INTO creator_record
    FROM profiles
    WHERE id = offer_record.user_id; -- FIXED: was created_by

    result := json_build_object(
        'offer', row_to_json(offer_record),
        'creator', json_build_object(
            'firstName', creator_record.first_name,
            'lastName', creator_record.last_name,
            'email', creator_record.email,
            'phone', creator_record.phone
        )
    );
    RETURN result;
END;
$$;


-- 5. FUNCTION: Mark Offer Viewed
DROP FUNCTION IF EXISTS mark_offer_viewed(TEXT);
CREATE OR REPLACE FUNCTION mark_offer_viewed(token_input UUID) -- Changed to UUID for consistency
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_offer_id UUID;
    target_lead_id UUID;
    target_user_id UUID;
    v_offer_number TEXT;
    v_view_count INTEGER;
BEGIN
    SELECT id, lead_id, user_id, offer_number, view_count
    INTO target_offer_id, target_lead_id, target_user_id, v_offer_number, v_view_count
    FROM offers
    WHERE public_token = token_input;

    IF target_offer_id IS NULL THEN RETURN FALSE; END IF;

    UPDATE offers
    SET view_count = COALESCE(view_count, 0) + 1, last_viewed_at = NOW()
    WHERE id = target_offer_id;

    IF target_lead_id IS NOT NULL THEN
        INSERT INTO lead_messages (lead_id, offer_id, sender_type, content, is_read)
        VALUES (target_lead_id, target_offer_id, 'client', '👀 Klient wyświetlił ofertę (Wyświetlenie nr ' || (COALESCE(v_view_count, 0) + 1) || ')', FALSE);
    END IF;

    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (target_user_id, 'info', 'Otwarcie Oferty', 'Klient otworzył ofertę ' || v_offer_number, 
            CASE WHEN target_lead_id IS NOT NULL THEN '/leads/' || target_lead_id ELSE '/offers' END, FALSE);

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in mark_offer_viewed: %', SQLERRM;
    RETURN FALSE;
END;
$$;


-- 6. FUNCTION: Send Client Message
DROP FUNCTION IF EXISTS send_client_message(TEXT, TEXT);
CREATE OR REPLACE FUNCTION send_client_message(token_input UUID, message_content TEXT) -- Changed to UUID
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_offer_id UUID;
    target_lead_id UUID;
    target_user_id UUID;
    v_offer_number TEXT;
BEGIN
    SELECT id, lead_id, user_id, offer_number
    INTO target_offer_id, target_lead_id, target_user_id, v_offer_number
    FROM offers
    WHERE public_token = token_input;

    IF target_offer_id IS NULL THEN RETURN FALSE; END IF;

    IF target_lead_id IS NOT NULL THEN
        INSERT INTO lead_messages (lead_id, offer_id, sender_type, content, is_read)
        VALUES (target_lead_id, target_offer_id, 'client', message_content, FALSE);
    END IF;

    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (target_user_id, 'info', 'Wiadomość od Klienta', 'Klient wysłał wiadomość do oferty ' || v_offer_number,
            CASE WHEN target_lead_id IS NOT NULL THEN '/leads/' || target_lead_id ELSE '/offers' END, FALSE);

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in send_client_message: %', SQLERRM;
    RETURN FALSE;
END;
$$;
