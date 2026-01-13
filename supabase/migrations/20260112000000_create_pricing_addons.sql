-- Create pricing_addons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pricing_addons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    addon_code TEXT NOT NULL,
    addon_name TEXT NOT NULL,
    addon_group TEXT NOT NULL, -- e.g. 'accessories', 'awnings', 'panorama', 'sliding_doors'
    pricing_basis TEXT DEFAULT 'FIXED', -- 'FIXED', 'PER_M2', 'BY_WIDTH', 'BY_OPENING_WIDTH'
    price_upe_net_eur DECIMAL(10, 2) DEFAULT 0,
    unit TEXT DEFAULT 'szt',
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_addons ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Authenticated can view pricing_addons" ON public.pricing_addons;
CREATE POLICY "Authenticated can view pricing_addons" 
ON public.pricing_addons FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/Managers can manage pricing_addons" ON public.pricing_addons;
CREATE POLICY "Admins/Managers can manage pricing_addons" 
ON public.pricing_addons FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Grant permissions (just to be safe for PostgREST)
GRANT SELECT ON public.pricing_addons TO authenticated;
GRANT ALL ON public.pricing_addons TO service_role;
