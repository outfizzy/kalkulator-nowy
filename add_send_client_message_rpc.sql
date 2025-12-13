-- Function to allow public page to send messages to the system
CREATE OR REPLACE FUNCTION send_client_message(token_input TEXT, message_content TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
    target_offer_id UUID;
    target_lead_id UUID;
    target_user_id UUID;
    v_offer_number TEXT;
BEGIN
    -- 1. Verify Token and get Context
    SELECT id, lead_id, user_id, offer_number
    INTO target_offer_id, target_lead_id, target_user_id, v_offer_number
    FROM offers
    WHERE public_token = token_input;

    IF target_offer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Insert Message into Lead History (if lead exists)
    IF target_lead_id IS NOT NULL THEN
        INSERT INTO lead_messages (lead_id, offer_id, sender_type, content, is_read)
        VALUES (
            target_lead_id,
            target_offer_id, 
            'client', 
            message_content, 
            FALSE
        );
    END IF;

    -- 3. Notify the Sales Rep
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
        target_user_id,
        'info',
        'Wiadomość od Klienta',
        'Klient wysłał wiadomość do oferty ' || v_offer_number,
        CASE WHEN target_lead_id IS NOT NULL THEN '/leads/' || target_lead_id ELSE '/offers' END,
        FALSE
    );

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in send_client_message: %', SQLERRM;
    RETURN FALSE;
END;
$$;
