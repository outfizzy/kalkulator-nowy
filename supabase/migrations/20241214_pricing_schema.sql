-- Pricing Module Schema

-- 1. Product Definitions (Catalog of what we sell)
CREATE TABLE public.product_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,          -- e.g. 'trendstyle', 'aufdachmarkise_zip'
    name TEXT NOT NULL,                 -- e.g. 'Trendstyle', 'Aufdachmarkise ZIP'
    category TEXT NOT NULL CHECK (category IN ('roof', 'awning', 'sliding_wall', 'accessory', 'other')),
    provider TEXT NOT NULL,             -- e.g. 'Aluxe', 'Sattler'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Price Tables (Versions of price lists)
CREATE TABLE public.price_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_definition_id UUID NOT NULL REFERENCES public.product_definitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                 -- e.g. 'Cennik 2024 - Wersja A'
    valid_from TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    valid_to TIMESTAMP WITHOUT TIME ZONE,
    currency TEXT DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,     -- Helper to quickly disable a list
    type TEXT DEFAULT 'matrix' CHECK (type IN ('matrix', 'linear', 'fixed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Price Matrix Entries (The grid values)
CREATE TABLE public.price_matrix_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
    
    -- Dimensions
    width_mm INTEGER NOT NULL,          -- X-Check (Width)
    projection_mm INTEGER NOT NULL,     -- Y-Check (Depth/Projection/Drop)
    
    -- Costs
    price DECIMAL(10, 2) NOT NULL,      -- Base price
    
    -- Specific surcharges stored right with the cell if needed (optional optimization)
    -- Usually surcharges are separate or global, but sometimes matrix specific
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_price_matrix_lookup ON public.price_matrix_entries(price_table_id, width_mm, projection_mm);

-- 4. Supplier Costs (Packaging, Transport, Surcharges)
CREATE TABLE public.supplier_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,             -- e.g. 'Aluxe'
    cost_name TEXT NOT NULL,            -- e.g. 'Koszty Pakowania', 'Transport - Strefa 1'
    cost_type TEXT NOT NULL CHECK (cost_type IN ('fixed', 'percentage', 'per_item')),
    value DECIMAL(10, 2) NOT NULL,      -- 50.00 or 0.05 (for 5%)
    currency TEXT DEFAULT 'EUR',
    conditions JSONB DEFAULT '{}'::jsonb, -- e.g. { "min_width": 5000 } or { "product_category": "roof" }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_matrix_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_costs ENABLE ROW LEVEL SECURITY;

-- Read access for everyone authenticated (Sales reps need to see prices)
CREATE POLICY "Authenticated can view products" ON public.product_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can view price tables" ON public.price_tables FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can view matrix entries" ON public.price_matrix_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can view supplier costs" ON public.supplier_costs FOR SELECT USING (auth.role() = 'authenticated');

-- Write access only for Admins/Managers
CREATE POLICY "Admins can manage products" ON public.product_definitions 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Admins can manage price tables" ON public.price_tables 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Admins can manage matrix entries" ON public.price_matrix_entries 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Admins can manage supplier costs" ON public.supplier_costs 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
