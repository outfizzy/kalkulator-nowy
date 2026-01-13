-- Fix Contract RLS for Deletion (Admin Only)
-- Description: Ensures ONLY Admins can delete contracts.
-- Run in Supabase SQL Editor

-- 1. Update DELETE Policy for Contracts
DROP POLICY IF EXISTS "Admins can delete all contracts" ON public.contracts;
DROP POLICY IF EXISTS "contracts_delete_policy" ON public.contracts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contracts;

CREATE POLICY "contracts_delete_policy" ON public.contracts
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin' -- STRICTLY ADMIN ONLY
  )
);

-- 2. Update SELECT/UPDATE (Managers can still edit/view, usually desired)
CREATE POLICY "contracts_update_policy" ON public.contracts
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR user_id = auth.uid()
);

NOTIFY pgrst, 'reload config';
