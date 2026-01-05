-- Migration: Enable Sales Reps to Import Legacy Contracts
-- Description: Explicitly grants INSERT permissions on contracts, offers, and customers tables to users with 'sales_rep' role.

-- 1. Helper function to check role (if not exists)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Contracts: Enable INSERT for sales_rep
DROP POLICY IF EXISTS "Enable insert contracts for sales_rep" ON "public"."contracts";
CREATE POLICY "Enable insert contracts for sales_rep" ON "public"."contracts"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR 
  get_my_role() IN ('admin', 'manager', 'sales_rep')
);

-- 3. Offers: Enable INSERT for sales_rep (Ensure it exists)
DROP POLICY IF EXISTS "Enable insert contracts for sales_rep" ON "public"."offers"; -- Clean up potential bad name
DROP POLICY IF EXISTS "Enable insert offers for sales_rep" ON "public"."offers";

CREATE POLICY "Enable insert offers for sales_rep" ON "public"."offers"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  get_my_role() IN ('admin', 'manager', 'sales_rep')
);

-- 4. Customers: Enable INSERT for sales_rep
DROP POLICY IF EXISTS "Enable insert customers for sales_rep" ON "public"."customers";
CREATE POLICY "Enable insert customers for sales_rep" ON "public"."customers"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  -- sales_rep can insert any customer generally, or at least assigned ones. 
  -- For legacy import, they need to create new customers.
  get_my_role() IN ('admin', 'manager', 'sales_rep') OR
  auth.uid() = id -- (Unlikely for customers table identity but keeping loose)
);
