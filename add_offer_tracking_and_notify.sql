-- 1. Add Tracking Columns to Offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- 2. Ensure Notifications Table Exists
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

-- Enable RLS on notifications (standard practice)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Create RPC Function to Mark Viewed & Notify
CREATE OR REPLACE FUNCTION mark_offer_viewed(token_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update tables
AS $$
DECLARE
    target_offer_id UUID;
    target_lead_id UUID;
    target_user_id UUID;
    v_offer_number TEXT;
    v_view_count INTEGER;
BEGIN
    -- Find offer details
    SELECT id, lead_id, user_id, offer_number, view_count
    INTO target_offer_id, target_lead_id, target_user_id, v_offer_number, v_view_count
    FROM offers
    WHERE public_token = token_input;

    IF target_offer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update stats
    UPDATE offers
    SET
        view_count = COALESCE(view_count, 0) + 1,
        last_viewed_at = NOW()
    WHERE id = target_offer_id;

    -- 1. Add to Lead History (if lead exists)
    -- We use 'client' sender type to indicate client action
    IF target_lead_id IS NOT NULL THEN
        INSERT INTO lead_messages (lead_id, offer_id, sender_type, content, is_read)
        VALUES (
            target_lead_id, 
            target_offer_id, 
            'client', 
            '👀 Klient wyświetlił ofertę (Wyświetlenie nr ' || (COALESCE(v_view_count, 0) + 1) || ')', 
            FALSE
        );
    END IF;

    -- 2. Add System Notification for the User (Sales Rep)
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
        target_user_id,
        'info',
        'Otwarcie Oferty',
        'Klient otworzył ofertę ' || v_offer_number,
        CASE WHEN target_lead_id IS NOT NULL THEN '/leads/' || target_lead_id ELSE '/offers' END,
        FALSE
    );

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction (so the page still loads)
    RAISE WARNING 'Error in mark_offer_viewed: %', SQLERRM;
    RETURN FALSE;
END;
$$;
