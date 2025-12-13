-- Function to get offer AND creator details by public token
-- Returns a JSON object to allow flexible schema without strictly adhering to 'offers' table structure
-- SECURITY DEFINER allows it to read public.profiles even if the user is anonymous

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
    -- 1. Fetch the offer
    SELECT * INTO offer_record
    FROM offers
    WHERE public_token = token_input
    LIMIT 1;

    IF offer_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Fetch the creator profile (Owner of the offer)
    SELECT first_name, last_name, email, phone, role
    INTO creator_record
    FROM profiles
    WHERE id = offer_record.user_id;

    -- 3. Construct the JSON result
    -- We convert the offer row to JSON, and append the creator details
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
