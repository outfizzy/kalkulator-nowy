-- Migration: Fix RLS Policies for Measurements and Installers (Comprehensive Overhaul)
-- Description: Replaces legacy/recursive policies with safe, unified policies using SECURITY DEFINER role check.

-- 1. Helper Function to safely get role (Bypasses RLS to avoid infinite recursion)
-- This is critical for all subsequent policies.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Clean up OLD recursive/restrictive policies (from previous migrations)
-- We drop them IF EXISTS to be safe.
DROP POLICY IF EXISTS "Admins can update all profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Admins can delete profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read all profiles for management" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."profiles"; 

-- 3. PROFILES Policies (The Core Fix)
-- A. SELECT: Allow if Admin/Manager/SalesRep OR viewing self OR viewing specific roles might be needed (but Admin/Manager covers all)
-- We allow 'sales_rep' to view profiles too (e.g. to see other team members or leads) to be safe.
CREATE POLICY "Enable read profiles" ON "public"."profiles"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  get_my_role() IN ('admin', 'manager', 'sales_rep')
);

-- B. UPDATE: Allow Admin/Manager to update ANY profile. Allow Users to update SELF.
CREATE POLICY "Enable update profiles" ON "public"."profiles"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR
  get_my_role() IN ('admin', 'manager')
);

-- C. DELETE: Only Admin can delete profiles.
CREATE POLICY "Enable delete profiles" ON "public"."profiles"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  get_my_role() = 'admin'
);

-- D. INSERT: Allow authenticated to insert (usually handled by auth triggers, but safe to allow if ID matches)
CREATE POLICY "Enable insert profiles" ON "public"."profiles"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR get_my_role() = 'admin'
);

-- 4. MEASUREMENTS Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."measurements";
CREATE POLICY "Enable insert for authenticated users" ON "public"."measurements"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for sales reps and managers" ON "public"."measurements";
CREATE POLICY "Enable read for sales reps and managers" ON "public"."measurements"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = sales_rep_id OR
  get_my_role() IN ('admin', 'manager') OR
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = measurements.lead_id
    AND leads.assigned_to = auth.uid()
  )
);

-- 5. INSTALLATIONS & ASSIGNMENTS Policies (Visibility)
-- Ensure full visibility for management
DROP POLICY IF EXISTS "Enable read all installations for management" ON "public"."installations";
CREATE POLICY "Enable read all installations for management" ON "public"."installations"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('admin', 'manager', 'sales_rep') -- Sales reps might need to see installations too
);

DROP POLICY IF EXISTS "Enable read assignments for management" ON "public"."installation_assignments";
CREATE POLICY "Enable read assignments for management" ON "public"."installation_assignments"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  get_my_role() IN ('admin', 'manager', 'sales_rep')
);
