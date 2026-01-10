-- Migration: Update Leads RLS for Shared Inbox Access
-- Description:
-- 1. Enables strict RLS on 'leads'.
-- 2. "read_leads": Admins/Managers see ALL. Sales Reps see OWN + UNASSIGNED.
-- 3. "update_leads": Admins/Managers update ALL. Sales Reps update OWN + UNASSIGNED (to claim).
-- 4. "insert_leads": Authenticated can insert.

-- 1. Helper function for role (reused from previous, ensure existence)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop existing policies to be clean (updated to include ALL policies defined below)
DROP POLICY IF EXISTS "Enable read access for all leads" ON "public"."leads";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."leads";
DROP POLICY IF EXISTS "Enable update for users based on email" ON "public"."leads";
DROP POLICY IF EXISTS "Sales Reps can view own leads" ON "public"."leads";
DROP POLICY IF EXISTS "Management can view all leads" ON "public"."leads";
DROP POLICY IF EXISTS "leads_select_policy" ON "public"."leads";
DROP POLICY IF EXISTS "leads_insert_policy" ON "public"."leads";
DROP POLICY IF EXISTS "leads_update_policy" ON "public"."leads";
DROP POLICY IF EXISTS "leads_delete_policy" ON "public"."leads";

-- 3. SELECT Policy
CREATE POLICY "leads_select_policy" ON "public"."leads"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('admin', 'manager') OR
  assigned_to = auth.uid() OR
  assigned_to IS NULL -- Shared Inbox Visibility
);

-- 4. INSERT Policy (Anyone can insert, e.g. Edge Function via Service Role bypasses this, but good for potential manual inputs)
CREATE POLICY "leads_insert_policy" ON "public"."leads"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  true -- Or restrict if needed, but 'true' is safe for now as we want flexibility
);

-- 5. UPDATE Policy
CREATE POLICY "leads_update_policy" ON "public"."leads"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  get_my_role() IN ('admin', 'manager') OR
  assigned_to = auth.uid() OR
  assigned_to IS NULL -- Allow taking ownership of unassigned leads
);

-- 6. DELETE Policy (Admins only)
CREATE POLICY "leads_delete_policy" ON "public"."leads"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  get_my_role() = 'admin'
);

-- 7. Ensure RLS is ON
ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;
