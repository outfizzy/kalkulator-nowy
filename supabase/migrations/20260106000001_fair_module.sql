-- Create fairs table
CREATE TABLE IF NOT EXISTS public.fairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    prizes_config JSONB DEFAULT '[]'::jsonb, -- Array of { label, type, value, probability }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Add fair tracking to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS fair_id UUID REFERENCES public.fairs(id),
ADD COLUMN IF NOT EXISTS fair_prize JSONB; -- { type: 'discount', value: 5, label: '5% rabatu' }

-- RLS Policies for Fairs
-- RLS Policies for Fairs
ALTER TABLE public.fairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage fairs" ON public.fairs;
DROP POLICY IF EXISTS "Users can view active fairs" ON public.fairs;

-- Admins can do everything
CREATE POLICY "Admins can manage fairs" ON public.fairs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Everyone can view active fairs (for selection)
CREATE POLICY "Users can view active fairs" ON public.fairs
    FOR SELECT
    USING ( true );
