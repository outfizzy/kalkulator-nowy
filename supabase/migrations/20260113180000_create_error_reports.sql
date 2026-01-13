-- Create error_reports table
CREATE TABLE IF NOT EXISTS public.error_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    error_message text NOT NULL,
    error_stack text,
    component_stack text,
    url text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'resolved', 'ignored')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. All authenticated users can CREATE reports (INSERT)
CREATE POLICY "Users can create error reports"
    ON public.error_reports
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Admins and Managers can VIEW ALL reports (SELECT)
CREATE POLICY "Admins and Managers can view all error reports"
    ON public.error_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- 3. Users can VIEW THEIR OWN reports (SELECT)
CREATE POLICY "Users can view own error reports"
    ON public.error_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Admins and Managers can UPDATE reports (e.g. status)
CREATE POLICY "Admins and Managers can update error reports"
    ON public.error_reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_error_reports_modtime
    BEFORE UPDATE ON public.error_reports
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
