-- ==========================================
-- 1. REPAIR TASK RLS POLICIES (Fixing Error 42710)
-- ==========================================

-- Add created_by column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_by') THEN
        ALTER TABLE tasks ADD COLUMN created_by uuid REFERENCES public.profiles(id);
        UPDATE tasks SET created_by = user_id WHERE created_by IS NULL;
        ALTER TABLE tasks ALTER COLUMN created_by SET DEFAULT auth.uid();
    END IF;
END $$;

-- SAFELY DROP EXISTING POLICIES to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Users View Assigned" ON tasks;
DROP POLICY IF EXISTS "Users Create" ON tasks;
DROP POLICY IF EXISTS "Users Update Assigned" ON tasks;
DROP POLICY IF EXISTS "Users View Own or Created" ON tasks; 
DROP POLICY IF EXISTS "Users Create Any Assignment" ON tasks;
DROP POLICY IF EXISTS "Users Update Own or Created" ON tasks;

-- Re-create Policies
CREATE POLICY "Users View Own or Created" ON tasks FOR SELECT
USING ( auth.uid() = user_id OR auth.uid() = created_by );

CREATE POLICY "Users Create Any Assignment" ON tasks FOR INSERT
WITH CHECK ( auth.uid() = created_by );

CREATE POLICY "Users Update Own or Created" ON tasks FOR UPDATE
USING ( auth.uid() = user_id OR auth.uid() = created_by );


-- ==========================================
-- 2. CREATE ERROR REPORTS MODULE (Idempotent)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.error_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    error_message text NOT NULL,
    error_stack text,
    component_stack text,
    url text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'resolved', 'ignored')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS (Idempotent)
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Safety Drop Policies for Error Reports
DROP POLICY IF EXISTS "Users can create error reports" ON public.error_reports;
DROP POLICY IF EXISTS "Admins and Managers can view all error reports" ON public.error_reports;
DROP POLICY IF EXISTS "Users can view own error reports" ON public.error_reports;
DROP POLICY IF EXISTS "Admins and Managers can update error reports" ON public.error_reports;

-- Create Policies
CREATE POLICY "Users can create error reports" ON public.error_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins and Managers can view all error reports" ON public.error_reports FOR SELECT USING ( EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')) );
CREATE POLICY "Users can view own error reports" ON public.error_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and Managers can update error reports" ON public.error_reports FOR UPDATE USING ( EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')) );

-- ==========================================
-- 3. LEAD -> CUSTOMER SYNC TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION sync_lead_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    existing_customer_id UUID;
    lead_email TEXT;
    lead_phone TEXT;
    lead_first_name TEXT;
    lead_last_name TEXT;
    lead_company TEXT;
    lead_address TEXT;
    lead_city TEXT;
    lead_postal TEXT;
BEGIN
    -- Extract Data safely from JSONB
    lead_email := NEW.customer_data->>'email';
    lead_phone := NEW.customer_data->>'phone';
    lead_first_name := COALESCE(NULLIF(NEW.customer_data->>'firstName', ''), 'Nieznany');
    lead_last_name := COALESCE(NULLIF(NEW.customer_data->>'lastName', ''), 'Lead');
    lead_company := NEW.customer_data->>'companyName';
    
    -- Mapping: 'address' in Lead JSON -> 'street' in Customer Table
    lead_address := COALESCE(NULLIF(NEW.customer_data->>'address', ''), '-'); 
    lead_city := COALESCE(NULLIF(NEW.customer_data->>'city', ''), '-');
    lead_postal := COALESCE(NULLIF(NEW.customer_data->>'postalCode', ''), '-');

    -- 1. Try to find existing customer by Email
    IF lead_email IS NOT NULL AND lead_email != '' THEN
        SELECT id INTO existing_customer_id FROM customers WHERE email = lead_email LIMIT 1;
    END IF;

    -- 2. Try to find by Phone if not found by Email
    IF existing_customer_id IS NULL AND lead_phone IS NOT NULL AND Length(lead_phone) > 5 THEN
        SELECT id INTO existing_customer_id FROM customers WHERE phone = lead_phone OR phone_number = lead_phone LIMIT 1;
    END IF;

    -- 3. If missing, CREATE new customer
    IF existing_customer_id IS NULL THEN
        INSERT INTO customers (
            representative_id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            street,       -- Mapped from address
            city,
            postal_code,
            house_number, -- Default fallback
            source,
            created_at
        ) VALUES (
            NEW.assigned_to, -- Assign to Lead Owner
            lead_first_name,
            lead_last_name,
            lead_company,
            lead_email,
            lead_phone,
            lead_address,
            lead_city,
            lead_postal,
            '-',          -- Lead form usually doesn't have house number separate
            'manual_lead',
            NOW()
        )
        RETURNING id INTO existing_customer_id;
        
        RAISE NOTICE 'Auto-created customer % for lead %', existing_customer_id, NEW.id;
    END IF;

    -- 4. Update the Lead with the Customer ID
    -- We must be careful to avoid infinite recursion if we update the ROW we are inserting.
    -- Trigger is AFTER INSERT, so we can run an UPDATE command on the table.
    
    IF existing_customer_id IS NOT NULL THEN
        UPDATE leads SET customer_id = existing_customer_id WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to ensure clean state
DROP TRIGGER IF EXISTS on_lead_created_sync_to_customers ON leads;

-- Create Trigger
CREATE TRIGGER on_lead_created_sync_to_customers
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_lead_to_customer();


-- ==========================================
-- 4. NAPRAWA WIDOCZNOŚCI PROFILI (Dla Przypisywania)
-- ==========================================

-- Upewnij się, że każdy zalogowany użytkownik widzi listę pracowników (do przypisywania zadań)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated can view all profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');


-- ==========================================
-- 5. UPRAWNIENIA DO POMIARÓW (Manager + Rep)
-- ==========================================

-- Najpierw upewnij się, że tabela ma RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki, aby uniknąć konfliktów
DROP POLICY IF EXISTS "Admins and Managers view all" ON public.measurements;
DROP POLICY IF EXISTS "Sales Reps view own" ON public.measurements;
DROP POLICY IF EXISTS "Sales Reps create own" ON public.measurements;
DROP POLICY IF EXISTS "Managers create any" ON public.measurements;
DROP POLICY IF EXISTS "Admins create any" ON public.measurements;
DROP POLICY IF EXISTS "Users view own or assigned" ON public.measurements; -- Clean generic ones

-- 1. WIDOCZNOŚĆ (SELECT)
-- Admin/Manager: Widzi wszystko
CREATE POLICY "Admins and Managers view all measurements" ON public.measurements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Reszta (Sales Rep/Partner): Widzi swoje (przypisane lub utworzone)
CREATE POLICY "Users view own measurements" ON public.measurements
    FOR SELECT USING (
        sales_rep_id = auth.uid() OR 
        -- Opcjonalnie: created_by = auth.uid() jeśli byłaby taka kolumna, ale sales_rep_id wystarczy dla dashboardu
        auth.uid() IN (SELECT id FROM public.profiles WHERE role NOT IN ('admin', 'manager'))
    );

-- 2. TWORZENIE (INSERT)
-- Pozwól każdemu uwierzytelnionemu (Manager, Sales Rep) tworzyć pomiary
-- Dzięki temu Sales Rep może dodać pomiar 'dla siebie' lub kogoś innego (zależnie od UI)
CREATE POLICY "Authenticated users can insert measurements" ON public.measurements
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 3. EDYCJA (UPDATE)
-- Admin/Manager: Wszystko
CREATE POLICY "Admins and Managers update all measurements" ON public.measurements
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Sales Rep: Swoje
CREATE POLICY "Sales Reps update own measurements" ON public.measurements
    FOR UPDATE USING (
        sales_rep_id = auth.uid()
    );

-- 4. USUWANIE (DELETE)
-- Tylko Admin/Manager i ewentualnie właściciel (opcjonalne, ale bezpieczniej dać tylko managerom usuwanie)
CREATE POLICY "Admins and Managers delete measurements" ON public.measurements
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );



