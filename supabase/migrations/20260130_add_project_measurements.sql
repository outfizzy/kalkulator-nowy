-- Create project_measurements table for storing Dachrechner results
CREATE TABLE IF NOT EXISTS public.project_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'final'
    
    -- Store the calculator state
    model_id TEXT NOT NULL,
    inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    dimension_options JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    images JSONB DEFAULT '[]'::jsonb, -- Array of { url, caption }
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_measurements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON public.project_measurements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.project_measurements
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.project_measurements
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.project_measurements
    FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_project_measurements_customer_id ON public.project_measurements(customer_id);
CREATE INDEX idx_project_measurements_contract_id ON public.project_measurements(contract_id);
