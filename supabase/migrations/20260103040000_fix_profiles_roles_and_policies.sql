-- FIX Profiles Role Constraint and RLS Policies

-- 1. Update Role Constraint to include 'partner' and 'installer'
-- Previously it only allowed: admin, user, sales_rep, manager
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_role_check";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_role_check"
    CHECK (role IN ('admin', 'user', 'sales_rep', 'manager', 'partner', 'installer'));

-- 2. Enable UPDATE permissions
-- Previously only SELECT was allowed by the recent fix, preventing role updates

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can update ANY profile
-- Relies on the fact that SELECT policy is "USING (true)" to avoid infinite recursion
DROP POLICY IF EXISTS "Admins can update all profiles" ON "public"."profiles";
CREATE POLICY "Admins can update all profiles"
    ON "public"."profiles" 
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can update THEIR OWN profile (e.g. changing password, name)
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
CREATE POLICY "Users can update own profile"
    ON "public"."profiles" 
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
    );

-- Policy: Admins can DELETE profiles (e.g. removing users)
DROP POLICY IF EXISTS "Admins can delete profiles" ON "public"."profiles";
CREATE POLICY "Admins can delete profiles"
    ON "public"."profiles" 
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
