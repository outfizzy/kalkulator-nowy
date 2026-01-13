-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    category text DEFAULT 'general',
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. View: Everyone can view active templates (for usage). Admins/Managers can view all (for management).
CREATE POLICY "View Templates"
    ON public.email_templates
    FOR SELECT
    USING (
        is_active = true 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- 2. Manage: Only Admins and Managers can Insert/Update/Delete
CREATE POLICY "Manage Templates"
    ON public.email_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
