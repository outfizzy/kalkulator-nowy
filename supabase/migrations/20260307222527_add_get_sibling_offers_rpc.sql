CREATE OR REPLACE FUNCTION get_sibling_offers(token_input TEXT)
RETURNS TABLE (
    id UUID,
    offer_number TEXT,
    product_config JSONB,
    pricing JSONB,
    status TEXT,
    public_token TEXT,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Get customer_id from the offer matching this token
    SELECT o.customer_id INTO v_customer_id
    FROM offers o
    WHERE o.public_token = token_input
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;

    -- Return all offers for this customer (excluding drafts)
    RETURN QUERY
    SELECT
        o.id,
        o.offer_number,
        o.product_config,
        o.pricing,
        o.status::TEXT,
        o.public_token,
        o.created_at
    FROM offers o
    WHERE o.customer_id = v_customer_id
      AND o.status != 'draft'
    ORDER BY o.created_at DESC;
END;
$$;
