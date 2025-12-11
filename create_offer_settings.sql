-- Create Offer Settings table for global configuration
CREATE TABLE IF NOT EXISTS public.offer_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdf_footer_content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.offer_settings ENABLE ROW LEVEL SECURITY;

-- 1. VIEW: Allow all authenticated users to read settings (needed for generating PDF)
CREATE POLICY "All users can view offer settings" 
ON public.offer_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. UPDATE: Only Admins can update settings
CREATE POLICY "Admins can update offer settings" 
ON public.offer_settings 
FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. INSERT: Only Admins can insert (though usually we'll have just one row)
CREATE POLICY "Admins can insert offer settings" 
ON public.offer_settings 
FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notify PostgREST
NOTIFY pgrst, 'reload config';
