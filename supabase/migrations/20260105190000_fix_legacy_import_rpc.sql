-- Migration: Secure Customer Lookup/Creation for Legacy Import
-- Description: Adds a SECURITY DEFINER function to allow sales reps to check for existing customers by email/phone without exposing the entire database (bypassing RLS for the lookup).

CREATE OR REPLACE FUNCTION public.get_or_create_customer_v2(
    p_email text,
    p_phone text,
    p_first_name text,
    p_last_name text,
    p_company_name text,
    p_street text,
    p_house_number text,
    p_postal_code text,
    p_city text,
    p_country text DEFAULT 'Deutschland'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public
AS $$
DECLARE
    v_customer_id uuid;
    v_customer_data jsonb;
BEGIN
    -- 1. Try to find by Email (Case insensitive)
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT id, to_jsonb(c.*) INTO v_customer_id, v_customer_data
        FROM customers c
        WHERE LOWER(c.email) = LOWER(p_email)
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
            RETURN v_customer_data;
        END IF;
    END IF;

    -- 2. Try to find by Phone (Simplified check)
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        SELECT id, to_jsonb(c.*) INTO v_customer_id, v_customer_data
        FROM customers c
        WHERE c.phone = p_phone
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
            RETURN v_customer_data;
        END IF;
    END IF;

    -- 3. Create if not found
    INSERT INTO customers (
        email, phone, first_name, last_name, company_name, 
        street, house_number, postal_code, city, country,
        -- Set created_by implicitly or let default handle it? 
        -- If security definer, auth.uid() is still the caller's ID in Postgres 10+ if not changed, 
        -- but usually good to rely on defaults.
        status
    )
    VALUES (
        p_email, p_phone, p_first_name, p_last_name, p_company_name,
        p_street, p_house_number, p_postal_code, p_city, p_country,
        'new'
    )
    RETURNING to_jsonb(customers.*) INTO v_customer_data;

    RETURN v_customer_data;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_customer_v2 TO authenticated;
