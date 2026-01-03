-- Create module_permissions table
CREATE TABLE IF NOT EXISTS public.module_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_key TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin', 'sales_rep', 'manager', 'partner', 'installer'
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(module_key, role)
);

-- RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.module_permissions;
CREATE POLICY "Enable read access for authenticated users" ON public.module_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.module_permissions;
CREATE POLICY "Enable write access for authenticated users" ON public.module_permissions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.module_permissions;
CREATE POLICY "Enable update access for authenticated users" ON public.module_permissions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed Data (Comprehensive Module List)
INSERT INTO public.module_permissions (module_key, role, is_enabled)
VALUES
    -- DASHBOARD
    ('dashboard', 'admin', true), ('dashboard', 'sales_rep', true), ('dashboard', 'manager', true), ('dashboard', 'installer', false),
    
    -- CRM (Sales)
    ('crm_clients', 'admin', true), ('crm_clients', 'sales_rep', true), ('crm_clients', 'manager', true),
    ('crm_leads', 'admin', true), ('crm_leads', 'sales_rep', true), ('crm_leads', 'manager', true),
    ('crm_tasks', 'admin', true), ('crm_tasks', 'sales_rep', true), ('crm_tasks', 'manager', true),
    ('crm_mail', 'admin', true), ('crm_mail', 'sales_rep', true), ('crm_mail', 'manager', true),
    
    -- OFFERS
    ('offers_create', 'admin', true), ('offers_create', 'sales_rep', true), ('offers_create', 'manager', true),
    ('offers_list', 'admin', true), ('offers_list', 'sales_rep', true), ('offers_list', 'manager', true),
    
    -- TOOLS
    ('ai_assistant', 'admin', true), ('ai_assistant', 'sales_rep', true), ('ai_assistant', 'manager', true),
    ('visualizer', 'admin', true), ('visualizer', 'sales_rep', true), ('visualizer', 'manager', true),
    
    -- OPERATIONS / REALIZATION
    ('installations_calendar', 'admin', true), ('installations_calendar', 'sales_rep', true), ('installations_calendar', 'manager', true),
    ('measurement_reports', 'admin', true), ('measurement_reports', 'sales_rep', true), ('measurement_reports', 'manager', true),
    ('contracts_list', 'admin', true), ('contracts_list', 'sales_rep', true), ('contracts_list', 'manager', true),
    ('logistics', 'admin', true), ('logistics', 'sales_rep', false), ('logistics', 'manager', true), -- Sales usually don't need logistics
    ('deliveries', 'admin', true), ('deliveries', 'sales_rep', false), ('deliveries', 'manager', true),
    ('service_module', 'admin', true), ('service_module', 'sales_rep', true), ('service_module', 'manager', true),
    ('portfolio_map', 'admin', true), ('portfolio_map', 'sales_rep', true), ('portfolio_map', 'manager', true),
    
    -- ADMIN / MANAGEMENT
    ('stats_dashboard', 'admin', true), ('stats_dashboard', 'sales_rep', false), ('stats_dashboard', 'manager', true),
    ('team_management', 'admin', true), ('team_management', 'sales_rep', false), ('team_management', 'manager', false),
    ('partner_management', 'admin', true), ('partner_management', 'sales_rep', false), ('partner_management', 'manager', false),
    ('pricing_management', 'admin', true), ('pricing_management', 'sales_rep', false), ('pricing_management', 'manager', false),
    ('inventory_lite', 'admin', true), ('inventory_lite', 'sales_rep', false), ('inventory_lite', 'manager', true),
    ('system_logs', 'admin', true), ('system_logs', 'sales_rep', false), ('system_logs', 'manager', false),
    ('system_notifications', 'admin', true), ('system_notifications', 'sales_rep', false), ('system_notifications', 'manager', false), -- Access to settings page
    ('settings_general', 'admin', true), ('settings_general', 'sales_rep', true), ('settings_general', 'manager', true)

ON CONFLICT (module_key, role) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled;
