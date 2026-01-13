-- Create email_footers table
CREATE TABLE IF NOT EXISTS public.email_footers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    content text NOT NULL, -- HTML content
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for email_footers
ALTER TABLE public.email_footers ENABLE ROW LEVEL SECURITY;

-- Policies for email_footers
-- View: Everyone can view active. Admins/Managers can view all.
CREATE POLICY "View Footers"
    ON public.email_footers
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

-- Manage: Only Admins and Managers
CREATE POLICY "Manage Footers"
    ON public.email_footers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Create user_footer_assignments table
CREATE TABLE IF NOT EXISTS public.user_footer_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    footer_id uuid REFERENCES public.email_footers(id) ON DELETE CASCADE,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, footer_id)
);

-- Enable RLS for user_footer_assignments
ALTER TABLE public.user_footer_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for user_footer_assignments
-- View: Users can view their own assignments. Admins/Managers can view all.
CREATE POLICY "View Assignments"
    ON public.user_footer_assignments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Manage: Only Admins and Managers (Assigning footers to users)
CREATE POLICY "Manage Assignments"
    ON public.user_footer_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Add updated_at trigger for email_footers
CREATE TRIGGER update_email_footers_updated_at
    BEFORE UPDATE ON public.email_footers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
