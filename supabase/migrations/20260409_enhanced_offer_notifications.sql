-- Enhanced notify_offer_action RPC
-- Now also notifies the assigned sales rep (if different from offer creator)
-- and properly handles offer_viewed events with 24h dedup
CREATE OR REPLACE FUNCTION public.notify_offer_action(
    token_input text,
    action_type text,
    action_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer_id uuid;
    v_offer_number text;
    v_lead_id uuid;
    v_customer_id uuid;
    v_owner_id uuid;
    v_assigned_to uuid;
    v_customer_name text;
    v_notif_title text;
    v_notif_message text;
    v_notif_type text;
    v_notif_link text;
    v_new_offer_status text;
    v_new_lead_status text;
    v_recent_view_exists boolean;
BEGIN
    -- 1. Find the offer by public token
    SELECT o.id, o.offer_number, o.lead_id, o.customer_id, o.user_id,
           COALESCE(o.customer_data->>'lastName', o.customer_data->>'firstName', 'Kunde')
    INTO v_offer_id, v_offer_number, v_lead_id, v_customer_id, v_owner_id, v_customer_name
    FROM offers o
    WHERE o.public_token = token_input
    LIMIT 1;

    IF v_offer_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1b. Get assigned sales rep from lead (may differ from offer creator)
    IF v_lead_id IS NOT NULL THEN
        SELECT l.assigned_to INTO v_assigned_to
        FROM leads l WHERE l.id = v_lead_id;
    END IF;

    -- 2. For offer_viewed: dedup within 24h to avoid spam
    IF action_type = 'offer_viewed' THEN
        SELECT EXISTS(
            SELECT 1 FROM notifications
            WHERE user_id = COALESCE(v_assigned_to, v_owner_id)
              AND metadata->>'action_type' = 'offer_viewed'
              AND metadata->>'offer_id' = v_offer_id::text
              AND created_at > now() - interval '24 hours'
        ) INTO v_recent_view_exists;

        IF v_recent_view_exists THEN
            -- Still log interaction, but skip notification
            INSERT INTO offer_interactions (offer_id, lead_id, customer_id, event_type, event_data)
            VALUES (v_offer_id, v_lead_id, v_customer_id, action_type, action_data);
            RETURN true;
        END IF;
    END IF;

    -- 3. Determine status changes and notification content
    IF action_type = 'offer_accepted' THEN
        v_new_offer_status := 'accepted';
        v_new_lead_status := 'won';
        v_notif_type := 'success';
        v_notif_title := 'Oferta zaakceptowana!';
        v_notif_message := v_customer_name || ' zaakceptował ofertę ' || v_offer_number || '. Skontaktuj się z klientem jak najszybciej!';
    ELSIF action_type = 'measurement_requested' THEN
        v_new_offer_status := NULL;
        v_new_lead_status := 'measurement';
        v_notif_type := 'info';
        v_notif_title := 'Klient chce pomiar';
        v_notif_message := v_customer_name || ' prosi o termin pomiaru (oferta ' || v_offer_number || '). '
            || COALESCE(action_data->>'preferredDays', '') || ' '
            || COALESCE(action_data->>'preferredTimes', '');
    ELSIF action_type = 'message_sent' THEN
        v_new_offer_status := NULL;
        v_new_lead_status := NULL;
        v_notif_type := 'info';
        v_notif_title := 'Nowa wiadomość od klienta';
        v_notif_message := v_customer_name || ' napisał wiadomość do oferty ' || v_offer_number || '.';
    ELSIF action_type = 'offer_viewed' THEN
        v_new_offer_status := NULL;
        v_new_lead_status := NULL;
        v_notif_type := 'info';
        v_notif_title := 'Klient otworzył ofertę';
        v_notif_message := v_customer_name || ' właśnie przeglądą ofertę ' || v_offer_number || '. To dobry moment na kontakt!';
    ELSE
        v_new_offer_status := NULL;
        v_new_lead_status := NULL;
        v_notif_type := 'info';
        v_notif_title := 'Aktywność klienta';
        v_notif_message := v_customer_name || ' wykonał akcję na ofercie ' || v_offer_number || '.';
    END IF;

    -- 4. Update offer status (if applicable)
    IF v_new_offer_status IS NOT NULL THEN
        UPDATE offers SET status = v_new_offer_status, updated_at = now()
        WHERE id = v_offer_id;
    END IF;

    -- 5. Update lead status (if applicable and lead exists)
    IF v_new_lead_status IS NOT NULL AND v_lead_id IS NOT NULL THEN
        UPDATE leads SET status = v_new_lead_status, updated_at = now()
        WHERE id = v_lead_id;
    END IF;

    -- 6. Build notification link
    IF v_lead_id IS NOT NULL THEN
        v_notif_link := '/leads/' || v_lead_id::text;
    ELSE
        v_notif_link := '/offers';
    END IF;

    -- 7. Create notification for the PRIMARY recipient (assigned rep or offer owner)
    IF COALESCE(v_assigned_to, v_owner_id) IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, link, is_read, metadata)
        VALUES (
            COALESCE(v_assigned_to, v_owner_id),
            v_notif_type,
            v_notif_title,
            v_notif_message,
            v_notif_link,
            false,
            jsonb_build_object(
                'action_type', action_type,
                'offer_id', v_offer_id,
                'offer_number', v_offer_number,
                'lead_id', v_lead_id,
                'customer_name', v_customer_name,
                'timestamp', now()::text
            ) || COALESCE(action_data, '{}'::jsonb)
        );
    END IF;

    -- 8. Also notify the offer creator if they differ from the assigned rep
    --    (only for high-priority actions: accepted, measurement, message)
    IF v_assigned_to IS NOT NULL
       AND v_owner_id IS NOT NULL
       AND v_assigned_to != v_owner_id
       AND action_type IN ('offer_accepted', 'measurement_requested', 'message_sent')
    THEN
        INSERT INTO notifications (user_id, type, title, message, link, is_read, metadata)
        VALUES (
            v_owner_id,
            v_notif_type,
            v_notif_title,
            v_notif_message,
            v_notif_link,
            false,
            jsonb_build_object(
                'action_type', action_type,
                'offer_id', v_offer_id,
                'offer_number', v_offer_number,
                'lead_id', v_lead_id,
                'customer_name', v_customer_name,
                'timestamp', now()::text,
                'secondary_notification', true
            ) || COALESCE(action_data, '{}'::jsonb)
        );
    END IF;

    -- 9. Log interaction
    INSERT INTO offer_interactions (offer_id, lead_id, customer_id, event_type, event_data)
    VALUES (v_offer_id, v_lead_id, v_customer_id, action_type, action_data);

    RETURN true;
END;
$$;

-- Ensure Realtime is enabled for notifications table
ALTER TABLE IF EXISTS notifications REPLICA IDENTITY FULL;

-- Add notifications to Supabase Realtime publication
-- (safe to run multiple times — DROP first to avoid duplicate errors)
DO $$
BEGIN
    -- Check if the publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Try to add the table; ignore if already added
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        EXCEPTION WHEN duplicate_object THEN
            -- Already added, ignore
            NULL;
        END;
    END IF;
END;
$$;

-- Make sure anon/authenticated can call this function
GRANT EXECUTE ON FUNCTION public.notify_offer_action(text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.notify_offer_action(text, text, jsonb) TO authenticated;
