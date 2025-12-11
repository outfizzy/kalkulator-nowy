-- COMPREHENSIVE RLS FIX SCRIPT (v3)
-- Covers: Leads, Offers, Contracts, Customers, Measurement Reports, Communications
-- Logic: 
-- 1. Admins/Managers see/edit everything.
-- 2. Owners see/edit their own data.
-- 3. Substitutes (Delegates) see/edit data of the person they substitute for (for Leads, Offers, Contracts, Measurement Reports).
-- 4. Shared Data (Customers, Communications): Accessible to all authenticated users (per current business logic).

-- === 0. HELPER: Ensure columns exist (Idempotent) ===
DO $$
BEGIN
    BEGIN ALTER TABLE public.profiles ADD COLUMN substitute_user_id UUID REFERENCES auth.users(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.profiles ADD COLUMN substitute_until TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- === 1. ENABLE RLS ===
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

-- === 2. DROP ALL EXISTING POLICIES (Clean Slate) ===
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- === 3. CREATE POLICIES ===

-- --- LEADS (Delegation Support) ---
CREATE POLICY "Leads_SELECT" ON public.leads FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (assigned_to = auth.uid()) 
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = leads.assigned_to AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW())
);
CREATE POLICY "Leads_INSERT" ON public.leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Leads_UPDATE" ON public.leads FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (assigned_to = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = leads.assigned_to AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW())
);
CREATE POLICY "Leads_DELETE" ON public.leads FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) 
  OR (assigned_to = auth.uid())
);

-- --- OFFERS (Delegation Support) ---
CREATE POLICY "Offers_SELECT" ON public.offers FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = offers.user_id AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW())
);
CREATE POLICY "Offers_INSERT" ON public.offers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Offers_UPDATE" ON public.offers FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = offers.user_id AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW())
);
CREATE POLICY "Offers_DELETE" ON public.offers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) 
  OR (user_id = auth.uid())
);

-- --- CONTRACTS (Delegation Support via Offer) ---
CREATE POLICY "Contracts_SELECT" ON public.contracts FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR EXISTS (
    SELECT 1 FROM public.offers
    WHERE offers.id = contracts.offer_id
    AND (offers.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = offers.user_id AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW()))
  )
);
CREATE POLICY "Contracts_INSERT" ON public.contracts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Contracts_UPDATE" ON public.contracts FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR EXISTS (
    SELECT 1 FROM public.offers
    WHERE offers.id = contracts.offer_id
    AND (offers.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = offers.user_id AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW()))
  )
);

-- --- CUSTOMERS (Global Access for Authenticated) ---
CREATE POLICY "Customers_SELECT" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Customers_INSERT" ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Customers_UPDATE" ON public.customers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Customers_DELETE" ON public.customers FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- --- MEASUREMENT REPORTS (Delegation Support) ---
CREATE POLICY "Reports_SELECT" ON public.measurement_reports FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = measurement_reports.user_id AND p.substitute_user_id = auth.uid() AND p.substitute_until >= NOW())
);
CREATE POLICY "Reports_INSERT" ON public.measurement_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Reports_UPDATE" ON public.measurement_reports FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  OR (user_id = auth.uid())
);
CREATE POLICY "Reports_DELETE" ON public.measurement_reports FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) 
  OR (user_id = auth.uid())
);

-- --- COMMUNICATIONS (Global Access for Authenticated) ---
CREATE POLICY "Comms_SELECT" ON public.customer_communications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Comms_INSERT" ON public.customer_communications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Comms_UPDATE" ON public.customer_communications FOR UPDATE USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'manager'));
CREATE POLICY "Comms_DELETE" ON public.customer_communications FOR DELETE USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'manager'));


NOTIFY pgrst, 'reload config';
