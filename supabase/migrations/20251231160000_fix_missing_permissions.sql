-- DATA RECOVERY MIGRATION: Fix RLS permissions
-- Force permissive policies for authenticated users to resolve "data not loading" issues

-- 1. CUSTOMERS TABLE
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all customers" ON "public"."customers";
CREATE POLICY "Authenticated can view all customers" 
ON "public"."customers" FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert customers" ON "public"."customers";
CREATE POLICY "Authenticated can insert customers" 
ON "public"."customers" FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update customers" ON "public"."customers";
CREATE POLICY "Authenticated can update customers" 
ON "public"."customers" FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can delete customers" ON "public"."customers";
CREATE POLICY "Authenticated can delete customers" 
ON "public"."customers" FOR DELETE 
TO authenticated 
USING (true);


-- 2. INSTALLATIONS TABLE
ALTER TABLE "public"."installations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all installations" ON "public"."installations";
CREATE POLICY "Authenticated can view all installations" 
ON "public"."installations" FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert installations" ON "public"."installations";
CREATE POLICY "Authenticated can insert installations" 
ON "public"."installations" FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update installations" ON "public"."installations";
CREATE POLICY "Authenticated can update installations" 
ON "public"."installations" FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can delete installations" ON "public"."installations";
CREATE POLICY "Authenticated can delete installations" 
ON "public"."installations" FOR DELETE 
TO authenticated 
USING (true);


-- 3. PROFILES TABLE (Crucial for CustomerService joins)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all profiles" ON "public"."profiles";
CREATE POLICY "Authenticated can view all profiles" 
ON "public"."profiles" FOR SELECT 
TO authenticated 
USING (true);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'installations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE installations;
    END IF;
END $$;

-- 4. TEAMS & MEMBERS (Fix for "missing teams")
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all teams" ON "public"."teams";
CREATE POLICY "Authenticated can view all teams" 
ON "public"."teams" FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can manage teams" ON "public"."teams";
CREATE POLICY "Authenticated can manage teams" 
ON "public"."teams" FOR ALL
TO authenticated 
USING (true);

ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view all team members" ON "public"."team_members";
CREATE POLICY "Authenticated can view all team members" 
ON "public"."team_members" FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated can manage team members" ON "public"."team_members";
CREATE POLICY "Authenticated can manage team members" 
ON "public"."team_members" FOR ALL
TO authenticated 
USING (true);
