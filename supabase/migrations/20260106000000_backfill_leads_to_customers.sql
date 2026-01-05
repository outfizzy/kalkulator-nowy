-- Migration to backfill missing customers from leads (Corrected V5 - Repair & Backfill)
-- FIXES: Previous version used incorrect JSON key 'street' instead of 'address'.
-- This script does 2 things:
-- 1. REPAIRS customers created by the flawed V4 script (where street is '-')
-- 2. INSERTS any remaining missing customers using the correct mapping.

DO $$
DECLARE
    r RECORD;
    new_customer_id UUID;
    customer_exists BOOLEAN;
    c_address TEXT;
BEGIN
    ---------- PART 1: REPAIR ----------------
    -- Fix customers that were just created with source 'lead_import' but have missing valid data because of the wrong key
    RAISE NOTICE 'Starting Repair of lead_import customers...';
    
    FOR r IN 
        SELECT l.id as lead_id, l.customer_data, c.id as cust_id, c.street
        FROM leads l
        JOIN customers c ON l.customer_data->>'email' = c.email
        WHERE c.source = 'lead_import' 
        AND c.street = '-' -- Target the ones we likely broke or filled with defaults
        AND l.customer_data->>'address' IS NOT NULL 
        AND l.customer_data->>'address' != ''
    LOOP
        c_address := r.customer_data->>'address';
        
        UPDATE customers
        SET street = c_address,
            city = COALESCE(NULLIF(r.customer_data->>'city', ''), city) -- Try to repair city if we have it now (though city key was likely correct)
        WHERE id = r.cust_id;
        
        RAISE NOTICE 'Repaired Customer % (Lead %) with Address: %', r.cust_id, r.lead_id, c_address;
    END LOOP;

    ---------- PART 2: BACKFILL (Corrected) ----------------
    RAISE NOTICE 'Starting Backfill of missing customers...';
    
    FOR r IN SELECT * FROM leads WHERE customer_data IS NOT NULL LOOP
        
        -- Check if customer with this email already exists
        SELECT EXISTS (
            SELECT 1 FROM customers 
            WHERE email = (r.customer_data->>'email') 
            AND (r.customer_data->>'email') IS NOT NULL 
            AND (r.customer_data->>'email') != ''
        ) INTO customer_exists;

        -- If not exists, create customer
        IF NOT customer_exists THEN
            
            -- CORRECT MAPPING: use 'address' from lead JSON for 'street' column
            INSERT INTO customers (
                representative_id, 
                first_name,
                last_name,
                email,
                phone,
                city,
                street, -- Map 'address' to 'street'
                house_number, 
                postal_code,
                source, 
                created_at,
                updated_at
            )
            VALUES (
                r.assigned_to, 
                COALESCE(NULLIF(r.customer_data->>'firstName', ''), 'Unknown'),
                COALESCE(NULLIF(r.customer_data->>'lastName', ''), 'Lead'),
                r.customer_data->>'email',
                r.customer_data->>'phone',
                COALESCE(NULLIF(r.customer_data->>'city', ''), '-'), 
                COALESCE(NULLIF(r.customer_data->>'address', ''), '-'), -- CORRECTED: use address, fallback to dash
                '-', -- Lead data usually doesn't separate house number, put result in street or leave dash
                COALESCE(NULLIF(r.customer_data->>'postalCode', ''), '-'), 
                'lead_import',
                r.created_at,
                NOW()
            )
            RETURNING id INTO new_customer_id;
            
            -- Optionally update the lead with the new customer_id
            UPDATE leads SET customer_id = new_customer_id WHERE id = r.id;
            
            RAISE NOTICE 'Created customer for lead %: % %', r.id, r.customer_data->>'firstName', r.customer_data->>'lastName';
        ELSE
            -- Link if missing
            IF r.customer_id IS NULL THEN
                 UPDATE leads 
                 SET customer_id = (SELECT id FROM customers WHERE email = (r.customer_data->>'email') LIMIT 1)
                 WHERE id = r.id;
            END IF;
        END IF;

    END LOOP;
END $$;
