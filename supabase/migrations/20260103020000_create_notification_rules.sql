-- Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin', 'sales_rep', 'manager', 'partner', 'installer'
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_type, role) -- Prevent duplicates
);

-- RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for MVP: Authenticated users can read/modify)
-- In a stricter system, only admins should modify.
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.notification_rules;
CREATE POLICY "Enable read access for authenticated users" ON public.notification_rules
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.notification_rules;
CREATE POLICY "Enable write access for authenticated users" ON public.notification_rules
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.notification_rules;
CREATE POLICY "Enable update access for authenticated users" ON public.notification_rules
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed Data (Default Matrix)
INSERT INTO public.notification_rules (event_type, role, is_enabled)
VALUES
    -- Offer Viewed
    ('offer_viewed', 'admin', true),
    ('offer_viewed', 'sales_rep', true),
    ('offer_viewed', 'manager', false),
    ('offer_viewed', 'installer', false),
    ('offer_viewed', 'partner', false),

    -- Contract Signed
    ('contract_signed', 'admin', true),
    ('contract_signed', 'sales_rep', true),
    ('contract_signed', 'manager', true),
    ('contract_signed', 'installer', false),
    ('contract_signed', 'partner', false),

    -- Installation Issue
    ('installation_issue', 'admin', true),
    ('installation_issue', 'sales_rep', true),
    ('installation_issue', 'manager', true),
    ('installation_issue', 'installer', true),
    ('installation_issue', 'partner', false),

    -- Stock Low
    ('stock_low', 'admin', true),
    ('stock_low', 'sales_rep', false),
    ('stock_low', 'manager', true),
    ('stock_low', 'installer', false),
    ('stock_low', 'partner', false),

    -- Installation Completed
    ('installation_completed', 'admin', true),
    ('installation_completed', 'sales_rep', true), -- For commission
    ('installation_completed', 'manager', true),
    ('installation_completed', 'installer', false),
    ('installation_completed', 'partner', false)

ON CONFLICT (event_type, role) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled;
