-- EMERGENCY FIX: Restore Profiles RLS
-- Cause of error: The previous script dropped ALL policies but did not recreate 'profiles' policies.
-- Result: Users cannot fetch their own profile, causing the app to force logout.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Allow authenticated users to view all profiles 
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. UPDATE: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. UPDATE: Admins can update any profile (e.g. changing roles)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- 4. INSERT: Usually handled by triggers, but allow just in case for admins
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

NOTIFY pgrst, 'reload config';
