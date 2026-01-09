-- Migration: Fix Orphaned Customers (Offers & Leads)
-- Timestamp: 20260109104000
-- Description: Backfills missing customer records for Offers that were created without a valid customer_id link.

DO $$
DECLARE
    r RECORD;
    new_customer_id UUID;
    customer_exists BOOLEAN;
    c_first_name TEXT;
    c_last_name TEXT;
    c_email TEXT;
    c_phone TEXT;
    c_company TEXT;
    c_address TEXT;
    c_postal TEXT;
    c_city TEXT;
BEGIN
    RAISE NOTICE 'Starting Repair of Orphaned Offers...';

    -- 1. Loop through Offers with NO customer_id but WITH customer_data
    FOR r IN 
        SELECT id, offer_number, customer_data, lead_id, created_at
        FROM offers 
        WHERE customer_id IS NULL 
        AND customer_data IS NOT NULL
    LOOP
        -- Extract and Sanitize Data
        c_first_name := NULLIF(TRIM(COALESCE(r.customer_data->>'firstName', '')), '');
        c_last_name  := NULLIF(TRIM(COALESCE(r.customer_data->>'lastName', '')), '');
        c_email      := NULLIF(TRIM(r.customer_data->>'email'), '');
        c_phone      := NULLIF(TRIM(r.customer_data->>'phone'), '');
        c_company    := NULLIF(TRIM(r.customer_data->>'companyName'), '');
        c_address    := NULLIF(TRIM(COALESCE(r.customer_data->>'address', r.customer_data->>'street')), '');
        c_postal     := NULLIF(TRIM(r.customer_data->>'postalCode'), '');
        c_city       := NULLIF(TRIM(r.customer_data->>'city'), '');

        -- Skip if practically empty
        IF c_first_name IS NULL AND c_last_name IS NULL AND c_company IS NULL THEN
            CONTINUE;
        END IF;

        new_customer_id := NULL;

        -- Check duplicates (Email)
        IF c_email IS NOT NULL THEN
            SELECT id INTO new_customer_id FROM customers WHERE email ILIKE c_email LIMIT 1;
        END IF;

        -- Check duplicates (Phone)
        IF new_customer_id IS NULL AND c_phone IS NOT NULL THEN
             SELECT id INTO new_customer_id FROM customers WHERE phone ILIKE c_phone LIMIT 1;
        END IF;

        -- Create if missing
        IF new_customer_id IS NULL THEN
            INSERT INTO customers (
                first_name, last_name, email, phone, 
                company_name, street, postal_code, city,
                source, created_at, updated_at
            )
            VALUES (
                COALESCE(c_first_name, 'Unknown'), COALESCE(c_last_name, 'Customer'), c_email, c_phone,
                c_company, COALESCE(c_address, '-'), COALESCE(c_postal, '-'), COALESCE(c_city, '-'),
                'offer_repair', r.created_at, NOW()
            )
            RETURNING id INTO new_customer_id;
            
            RAISE NOTICE 'Created Customer % for Offer %', new_customer_id, r.offer_number;
        ELSE
            RAISE NOTICE 'Found existing Customer % for Offer %', new_customer_id, r.offer_number;
        END IF;

        -- Update Offer
        IF new_customer_id IS NOT NULL THEN
            UPDATE offers 
            SET customer_id = new_customer_id,
                customer_data = (customer_data || jsonb_build_object('id', new_customer_id))
            WHERE id = r.id;
            
            -- Also Sync Lead if linked
            IF r.lead_id IS NOT NULL THEN
                UPDATE leads SET customer_id = new_customer_id WHERE id = r.lead_id AND customer_id IS NULL;
                UPDATE leads SET status = 'offer_sent' WHERE id = r.lead_id AND status IN ('new', 'contacted');
            END IF;
        END IF;

    END LOOP;
    
    RAISE NOTICE 'Repair Complete.';
END $$;
