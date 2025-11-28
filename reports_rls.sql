-- Add RLS policies for reports table

-- 1. Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function to check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop ALL existing policies (to avoid conflicts)
-- Try different possible names
DROP POLICY IF EXISTS "Sales reps can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins and managers can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Managers can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.reports;

-- 4. Create SELECT policies
-- Sales reps can view only their own reports  
CREATE POLICY "Sales reps can view own reports"
ON public.reports FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
USING (is_admin());

-- Managers can view all reports
CREATE POLICY "Managers can view all reports"
ON public.reports FOR SELECT
USING (is_manager());

-- 5. Create INSERT policy
-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Create DELETE policies
-- Users can delete only their own reports
CREATE POLICY "Users can delete own reports"
ON public.reports FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete any report
CREATE POLICY "Admins can delete any report"
ON public.reports FOR DELETE
USING (is_admin());
