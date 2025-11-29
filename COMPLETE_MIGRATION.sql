-- COMPLETE MIGRATION SCRIPT
-- Run this script in the Supabase SQL Editor to apply all necessary database changes.

-- 1. Add 'distance' column to 'offers' table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS distance INTEGER DEFAULT 0;
UPDATE public.offers SET distance = 0 WHERE distance IS NULL;

-- 2. Fix 'profiles' table and registration trigger
-- Ensure all necessary columns exist in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS nip TEXT;

-- Update handle_new_user function to use correct columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, company_name, nip, status)
  VALUES (
    new.id,
    -- Use full_name from metadata, or construct it from firstName/lastName, or fallback to empty string
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      TRIM(CONCAT(new.raw_user_meta_data->>'firstName', ' ', new.raw_user_meta_data->>'lastName')),
      ''
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'sales_rep'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'companyName',
    new.raw_user_meta_data->>'nip',
    'pending' -- Always pending by default
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reports Access Control (RLS)

-- Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is manager
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

-- Drop ALL existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Sales reps can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins and managers can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Managers can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.reports;

-- Create SELECT policies
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

-- Create INSERT policy
-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create DELETE policies
-- Users can delete only their own reports
CREATE POLICY "Users can delete own reports"
ON public.reports FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete any report
CREATE POLICY "Admins can delete any report"
ON public.reports FOR DELETE
USING (is_admin());
