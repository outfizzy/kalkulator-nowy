-- RPC: notify_offer_action
-- Called from the public offer page when a customer accepts or requests a measurement.
-- Updates offer status, lead status, creates notification for sales rep, and logs interaction.
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
    v_customer_name text;
    v_notif_title text;
    v_notif_message text;
    v_notif_type text;
    v_notif_link text;
    v_new_offer_status text;
    v_new_lead_status text;
BEGIN
    -- 1. Find the offer by public token
    SELECT id, offer_number, lead_id, customer_id, user_id,
           COALESCE(customer_data->>'lastName', customer_data->>'firstName', 'Kunde')
    INTO v_offer_id, v_offer_number, v_lead_id, v_customer_id, v_owner_id, v_customer_name
    FROM offers
    WHERE public_token = token_input
    LIMIT 1;

    IF v_offer_id IS NULL THEN
        RETURN false;
    END IF;

    -- 2. Determine status changes and notification content based on action type
    IF action_type = 'offer_accepted' THEN
        v_new_offer_status := 'accepted';
        v_new_lead_status := 'won';
        v_notif_type := 'success';
        v_notif_title := '✅ Angebot angenommen!';
        v_notif_message := v_customer_name || ' hat Angebot ' || v_offer_number || ' angenommen. Bitte kontaktieren Sie den Kunden zeitnah.';
    ELSIF action_type = 'measurement_requested' THEN
        v_new_offer_status := NULL;
        v_new_lead_status := 'measurement';
        v_notif_type := 'info';
        v_notif_title := '📐 Aufmaß angefragt';
        v_notif_message := v_customer_name || ' möchte einen Aufmaßtermin für Angebot ' || v_offer_number || '. '
            || COALESCE(action_data->>'preferredDays', '') || ' '
            || COALESCE(action_data->>'preferredTimes', '');
    ELSIF action_type = 'message_sent' THEN
        v_new_offer_status := NULL;
        v_new_lead_status := NULL;
        v_notif_type := 'info';
        v_notif_title := '💬 Neue Kundennachricht';
        v_notif_message := v_customer_name || ' hat eine Nachricht zu Angebot ' || v_offer_number || ' gesendet.';
    ELSE
        v_new_offer_status := NULL;
        v_new_lead_status := NULL;
        v_notif_type := 'info';
        v_notif_title := '📋 Kundenaktivität';
        v_notif_message := v_customer_name || ' hat mit Angebot ' || v_offer_number || ' interagiert.';
    END IF;

    -- 3. Update offer status (if applicable)
    IF v_new_offer_status IS NOT NULL THEN
        UPDATE offers
        SET status = v_new_offer_status,
            updated_at = now()
        WHERE id = v_offer_id;
    END IF;

    -- 4. Update lead status (if applicable and lead exists)
    IF v_new_lead_status IS NOT NULL AND v_lead_id IS NOT NULL THEN
        UPDATE leads
        SET status = v_new_lead_status,
            updated_at = now()
        WHERE id = v_lead_id;
    END IF;

    -- 5. Create notification for the offer owner (sales rep)
    IF v_owner_id IS NOT NULL THEN
        IF v_lead_id IS NOT NULL THEN
            v_notif_link := '/leads/' || v_lead_id::text;
        ELSE
            v_notif_link := '/offers';
        END IF;

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
                'timestamp', now()::text
            ) || COALESCE(action_data, '{}'::jsonb)
        );
    END IF;

    -- 6. Log interaction in offer_interactions
    INSERT INTO offer_interactions (offer_id, lead_id, customer_id, event_type, event_data)
    VALUES (
        v_offer_id,
        v_lead_id,
        v_customer_id,
        action_type,
        action_data
    );

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_offer_action(text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.notify_offer_action(text, text, jsonb) TO authenticated;
