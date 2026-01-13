-- Migration: Sync Legacy Leads to Customers (v2 - Corrected Schema)
-- Description: Iterates over leads without customer_id and tries to link them using customer_data
-- Run this in Supabase SQL Editor

DO $$ 
DECLARE
    r RECORD;
    new_customer_id UUID;
    c_email TEXT;
    c_phone TEXT;
    c_first TEXT;
    c_last TEXT;
    c_company TEXT;
    c_street TEXT;
    c_house TEXT;
    c_zip TEXT;
    c_city TEXT;
    c_data JSONB;
BEGIN
    FOR r IN 
        SELECT id, customer_data FROM leads 
        WHERE customer_id IS NULL AND customer_data IS NOT NULL
    LOOP
        c_data := r.customer_data;
        
        -- Extract fields safely
        c_email := NULLIF(TRIM(c_data->>'email'), '');
        c_phone := NULLIF(TRIM(c_data->>'phone'), '');
        c_first := COALESCE(c_data->>'firstName', '');
        c_last := COALESCE(c_data->>'lastName', '');
        c_street := NULLIF(c_data->>'street', ''); 
        -- Fallback for legacy "address" field if "street" is missing? 
        -- Usually address was just one string. Let's try to extract if street is empty.
        IF c_street IS NULL THEN
             c_street := NULLIF(c_data->>'address', '');
        END IF;

        c_house := NULLIF(c_data->>'houseNumber', '');
        c_zip := COALESCE(c_data->>'postalCode', '00-000');
        c_city := COALESCE(c_data->>'city', 'Unknown');
        
        -- Skip if insufficient data
        IF c_email IS NULL AND c_phone IS NULL AND (c_last = '' OR c_last IS NULL) THEN
            CONTINUE;
        END IF;

        -- Try to find existing customer
        new_customer_id := NULL;
        
        IF c_email IS NOT NULL THEN
            SELECT id INTO new_customer_id FROM customers WHERE email = c_email LIMIT 1;
        END IF;

        IF new_customer_id IS NULL AND c_phone IS NOT NULL THEN
            SELECT id INTO new_customer_id FROM customers WHERE phone = c_phone LIMIT 1;
        END IF;

        -- Create if not found
        IF new_customer_id IS NULL THEN
            INSERT INTO customers (
                first_name, 
                last_name, 
                email, 
                phone, 
                street, -- Corrected col
                house_number, -- Corrected col
                postal_code, -- Corrected col
                city, -- Corrected col
                country, -- Added default
                created_by, -- Corrected col name (from user_id to created_by)
                created_at,
                updated_at
            ) VALUES (
                c_first,
                c_last,
                c_email,
                c_phone,
                c_street,
                c_house,
                c_zip,
                c_city,
                'Deutschland',
                (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1), -- Fallback to Admin
                NOW(),
                NOW()
            ) RETURNING id INTO new_customer_id;
        END IF;

        -- Update Lead
        IF new_customer_id IS NOT NULL THEN
            UPDATE leads SET customer_id = new_customer_id WHERE id = r.id;
            RAISE NOTICE 'Lead % linked to Customer %', r.id, new_customer_id;
        END IF;
        
    END LOOP;
END $$;
