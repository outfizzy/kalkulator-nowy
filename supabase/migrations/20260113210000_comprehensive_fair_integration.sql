-- ===================================================================
-- COMPREHENSIVE TRADE FAIR & LEAD-TO-CUSTOMER INTEGRATION
-- Date: 2026-01-13
-- Purpose: 
-- 1. Ensure all fair-related columns exist on leads table
-- 2. Fix lead → customer automatic sync (for manual AND fair leads)
-- 3. Verify RLS policies for lead insertion
-- ===================================================================

-- PART 1: SCHEMA VERIFICATION
-- Ensure fair columns exist (idempotent - safe to run multiple times)

DO $$ 
BEGIN
    -- fair_id already added in 20260106000001_fair_module.sql
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fair_id') THEN
        ALTER TABLE public.leads ADD COLUMN fair_id UUID REFERENCES public.fairs(id);
    END IF;

    -- fair_prize already added in 20260106000001_fair_module.sql
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fair_prize') THEN
        ALTER TABLE public.leads ADD COLUMN fair_prize JSONB;
    END IF;

    -- fair_photos added in 20260106003000_fair_photos.sql
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fair_photos') THEN
        ALTER TABLE public.leads ADD COLUMN fair_photos JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.leads.fair_photos IS 'Array of {url, name} - Photos from trade fair';
    END IF;

    -- fair_products added in 20260111130000_add_fair_products.sql
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fair_products') THEN
        ALTER TABLE public.leads ADD COLUMN fair_products JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.leads.fair_products IS 'Array of FairProductConfig - Product configurations from trade fair';
    END IF;
END $$;

-- PART 2: LEAD → CUSTOMER AUTO-SYNC TRIGGER
-- This ensures EVERY lead (manual, email, fair, etc.) automatically creates a customer

CREATE OR REPLACE FUNCTION sync_lead_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    existing_customer_id UUID;
    lead_email TEXT;
    lead_phone TEXT;
    first_name TEXT;
    last_name TEXT;
    company_name TEXT;
    city_value TEXT;
    zip_value TEXT;
    address_value TEXT;
BEGIN
    -- Extract customer data from lead
    lead_email := NEW.customer_data->>'email';
    lead_phone := NEW.customer_data->>'phone';
    first_name := NEW.customer_data->>'firstName';
    last_name := NEW.customer_data->>'lastName';
    company_name := NEW.customer_data->>'companyName';
    city_value := NEW.customer_data->>'city';
    zip_value := NEW.customer_data->>'postalCode';
    address_value := NEW.customer_data->>'address';

    -- Skip if no identifiable data
    IF (lead_email IS NULL OR lead_email = '') AND (lead_phone IS NULL OR LENGTH(lead_phone) < 5) THEN
        RETURN NEW;
    END IF;

    -- Try to find existing customer by email
    IF lead_email IS NOT NULL AND lead_email != '' THEN
        SELECT id INTO existing_customer_id 
        FROM customers 
        WHERE email = lead_email 
        LIMIT 1;
    END IF;

    -- If not found, try by phone
    IF existing_customer_id IS NULL AND lead_phone IS NOT NULL AND LENGTH(lead_phone) > 5 THEN
        SELECT id INTO existing_customer_id 
        FROM customers 
        WHERE phone = lead_phone OR phone_number = lead_phone 
        LIMIT 1;
    END IF;

    -- If customer doesn't exist, create new one
    IF existing_customer_id IS NULL THEN
        -- Parse address into street and house_number
        DECLARE
            street_value TEXT;
            house_number_value TEXT;
            address_match TEXT[];
        BEGIN
            -- Try to split address into "Street" and "Number"
            -- Pattern: "Ulica Nazwa 123a" → street="Ulica Nazwa", house="123a"
            address_match := regexp_match(COALESCE(address_value, ''), '^(.+)\s+(\d+[a-zA-Z0-9/-]*)$');
            
            IF address_match IS NOT NULL THEN
                street_value := address_match[1];
                house_number_value := address_match[2];
            ELSE
                -- Fallback: Use full address as street, or defaults
                street_value := COALESCE(NULLIF(address_value, ''), '-');
                house_number_value := '0';
            END IF;

            -- Set defaults for fair leads or incomplete data
            IF NEW.source = 'targi' THEN
                city_value := COALESCE(NULLIF(city_value, ''), 'Targi (Do Uzupełnienia)');
                zip_value := COALESCE(NULLIF(zip_value, ''), '00-000');
                street_value := COALESCE(NULLIF(street_value, ''), '-');
                house_number_value := COALESCE(NULLIF(house_number_value, ''), '0');
            ELSE
                city_value := COALESCE(NULLIF(city_value, ''), 'Do uzupełnienia');
                zip_value := COALESCE(NULLIF(zip_value, ''), '00-000');
                street_value := COALESCE(NULLIF(street_value, ''), '-');
                house_number_value := COALESCE(NULLIF(house_number_value, ''), '0');
            END IF;

            -- Insert new customer
            INSERT INTO customers (
                representative_id,
                first_name,
                last_name,
                company_name,
                email,
                phone,
                phone_number,
                street,
                house_number,
                city,
                postal_code,
                country,
                source
            ) VALUES (
                NEW.assigned_to, -- Assign to same rep as lead
                COALESCE(NULLIF(first_name, ''), 'Nieznany'),
                COALESCE(NULLIF(last_name, ''), 'Lead'),
                company_name,
                lead_email,
                lead_phone,
                lead_phone,
                street_value,
                house_number_value,
                city_value,
                zip_value,
                'Deutschland',
                COALESCE(NEW.source::text, 'manual_lead')
            )
            RETURNING id INTO existing_customer_id;
        END;
    END IF;

    -- Link customer to lead
    IF existing_customer_id IS NOT NULL THEN
        NEW.customer_id := existing_customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's using latest function
DROP TRIGGER IF EXISTS on_lead_created_sync_to_customers ON leads;
CREATE TRIGGER on_lead_created_sync_to_customers
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_lead_to_customer();

-- PART 3: RLS VERIFICATION
-- Ensure authenticated users can insert leads (should already exist)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'leads_insert_policy'
    ) THEN
        CREATE POLICY "leads_insert_policy" ON "public"."leads"
        AS PERMISSIVE FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END
$$;

-- PART 4: INDEX OPTIMIZATION (for faster fair_id lookups)
CREATE INDEX IF NOT EXISTS idx_leads_fair_id ON public.leads(fair_id) WHERE fair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_fair ON public.leads(source) WHERE source = 'targi';
