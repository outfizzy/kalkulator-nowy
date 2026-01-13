-- Fix Lead RLS for Deletion
-- Description: Ensures Admins and Managers can delete leads.
-- Run in Supabase SQL Editor

-- 1. Update DELETE Policy to include Managers and be more robust
DROP POLICY IF EXISTS "leads_delete_policy" ON "public"."leads";

CREATE POLICY "leads_delete_policy" ON "public"."leads"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 2. Verify get_my_role function (optional, but good practice)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

NOTIFY pgrst, 'reload config';
