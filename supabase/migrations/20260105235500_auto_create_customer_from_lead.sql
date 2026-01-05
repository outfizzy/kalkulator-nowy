-- Migration: Auto-create Customer from Lead
-- Timestamp: 20260105235500

-- Function to handle the trigger logic
CREATE OR REPLACE FUNCTION public.trigger_link_lead_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    found_customer_id UUID;
    c_first_name TEXT;
    c_last_name TEXT;
    c_email TEXT;
    c_phone TEXT;
    c_company TEXT;
    c_address TEXT;
    c_postal TEXT;
    c_city TEXT;
BEGIN
    -- Only proceed if customer_id is NULL and specific data exists
    -- We need at least a Name or Company to create a valid customer
    IF NEW.customer_id IS NULL AND NEW.customer_data IS NOT NULL THEN
        
        -- Extract JSON fields (handle undefined safely)
        c_first_name := NULLIF(TRIM(COALESCE(NEW.customer_data->>'firstName', '')), '');
        c_last_name  := NULLIF(TRIM(COALESCE(NEW.customer_data->>'lastName', '')), '');
        c_email      := NULLIF(TRIM(NEW.customer_data->>'email'), '');
        c_phone      := NULLIF(TRIM(NEW.customer_data->>'phone'), '');
        c_company    := NULLIF(TRIM(NEW.customer_data->>'companyName'), '');
        c_address    := NULLIF(TRIM(NEW.customer_data->>'address'), '');
        c_postal     := NULLIF(TRIM(NEW.customer_data->>'postalCode'), '');
        c_city       := NULLIF(TRIM(NEW.customer_data->>'city'), '');

        -- Ensure we have enough data to create a customer
        IF c_first_name IS NULL AND c_last_name IS NULL AND c_company IS NULL THEN
            RETURN NEW; -- Skip if no sufficient identity data
        END IF;

        -- 1. Try to find by Email (Deduplication)
        IF c_email IS NOT NULL THEN
            SELECT id INTO found_customer_id FROM customers WHERE email ILIKE c_email LIMIT 1;
        END IF;

        -- 2. Try to find by Phone (if not found yet) (Deduplication)
        IF found_customer_id IS NULL AND c_phone IS NOT NULL THEN
             SELECT id INTO found_customer_id FROM customers WHERE phone ILIKE c_phone LIMIT 1;
        END IF;

        -- 3. If found, link it
        IF found_customer_id IS NOT NULL THEN
            NEW.customer_id := found_customer_id;
        
        -- 4. If NOT found, Create New Customer
        ELSE
            INSERT INTO customers (
                first_name, last_name, email, phone, 
                company_name, street, postal_code, city,
                source
            )
            VALUES (
                COALESCE(c_first_name, ''), COALESCE(c_last_name, ''), c_email, c_phone,
                c_company, c_address, c_postal, c_city,
                'lead_automation'
            )
            RETURNING id INTO found_customer_id;
            
            NEW.customer_id := found_customer_id;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the LEAD insert
    RAISE WARNING 'Failed auto-creating customer for lead: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the Trigger
DROP TRIGGER IF EXISTS link_lead_to_customer_trigger ON public.leads;

CREATE TRIGGER link_lead_to_customer_trigger
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_link_lead_to_customer();
