-- MASTER SETUP SCRIPT FOR VOICE AI & INSTALLATIONS
-- Run this to fix all "Object" errors and "RLS" permissions issues.

-- 1. Create 'customer_communications' table (if not exists)
CREATE TABLE IF NOT EXISTS public.customer_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'sms', 'note')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT,
    content TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    external_id TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_lead_id ON public.customer_communications(lead_id);

-- 3. Fix RLS for 'customer_communications'
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all communications" ON public.customer_communications;
CREATE POLICY "Users can view all communications" ON public.customer_communications FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert communications" ON public.customer_communications;
CREATE POLICY "Users can insert communications" ON public.customer_communications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Fix RLS for 'installations' (Repeat of previous fix to be sure)
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert installations" ON installations;
CREATE POLICY "Users can insert installations" ON installations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Installations visibility policy" ON installations;
CREATE POLICY "Installations visibility policy" ON installations FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')) OR
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM installation_assignments ia WHERE ia.installation_id = id AND ia.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own installations" ON installations;
CREATE POLICY "Users can update own installations" ON installations FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 5. Fix RLS for 'installation_assignments' (Repeat of previous fix)
ALTER TABLE installation_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create assignments" ON installation_assignments;
CREATE POLICY "Users can create assignments" ON installation_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON installation_assignments;
CREATE POLICY "Authenticated users can view assignments" ON installation_assignments FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete assignments" ON installation_assignments;
CREATE POLICY "Users can delete assignments" ON installation_assignments FOR DELETE USING (auth.role() = 'authenticated');

-- Notify reload
NOTIFY pgrst, 'reload config';
