-- RESTRICT DELETE ON CUSTOMERS AND OFFERS (ADMIN ONLY)

BEGIN;

-- 1. CUSTOMERS
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

-- Drop the permissive delete policy from 20251231160000
DROP POLICY IF EXISTS "Authenticated can delete customers" ON "public"."customers";

-- Create Admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete customers" ON "public"."customers";
CREATE POLICY "Admins can delete customers" 
    ON "public"."customers" 
    FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. OFFERS
ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting/permissive policies
DROP POLICY IF EXISTS "Authenticated can delete offers" ON "public"."offers";
DROP POLICY IF EXISTS "Enable delete for authenticated" ON "public"."offers";
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "public"."offers";

-- Re-assert standard permissions for non-delete actions (Safety net)
-- View: All authenticated
DROP POLICY IF EXISTS "Authenticated can view all offers" ON "public"."offers";
CREATE POLICY "Authenticated can view all offers" 
    ON "public"."offers" FOR SELECT 
    TO authenticated 
    USING (true);

-- Insert: All authenticated
DROP POLICY IF EXISTS "Authenticated can insert offers" ON "public"."offers";
CREATE POLICY "Authenticated can insert offers" 
    ON "public"."offers" FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Update: All authenticated
DROP POLICY IF EXISTS "Authenticated can update offers" ON "public"."offers";
CREATE POLICY "Authenticated can update offers" 
    ON "public"."offers" FOR UPDATE 
    TO authenticated 
    USING (true);

-- Delete: ADMIN ONLY
DROP POLICY IF EXISTS "Admins can delete offers" ON "public"."offers";
CREATE POLICY "Admins can delete offers" 
    ON "public"."offers" 
    FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

COMMIT;
