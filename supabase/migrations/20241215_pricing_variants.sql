-- Add attributes to price_tables for tagging variants (e.g. {"snow_zone": "3", "roof_type": "glass"})
ALTER TABLE public.price_tables 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Create additional_costs table for catalog surcharges (e.g. "Surcharge Post 3000mm")
CREATE TABLE IF NOT EXISTS public.additional_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_definition_id UUID REFERENCES public.product_definitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_type TEXT CHECK (cost_type IN ('fixed', 'per_m', 'per_item', 'percentage')),
    value DECIMAL(10, 2) NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb, -- Context: e.g. {"post_height": "3000"}
    currency TEXT DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies for additional_costs

ALTER TABLE public.additional_costs ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Authenticated can view additional costs" 
ON public.additional_costs FOR SELECT 
USING (auth.role() = 'authenticated');

-- Write access for Admins/Managers
CREATE POLICY "Admins can manage additional costs" 
ON public.additional_costs FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
