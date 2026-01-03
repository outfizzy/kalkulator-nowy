-- Ensure Customers table has RLS policies
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."customers";
CREATE POLICY "Enable read access for authenticated users" 
ON "public"."customers" FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert access to authenticated users
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON "public"."customers";
CREATE POLICY "Enable insert access for authenticated users" 
ON "public"."customers" FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow update access for authenticated users
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON "public"."customers";
CREATE POLICY "Enable update access for authenticated users" 
ON "public"."customers" FOR UPDATE 
TO authenticated 
USING (true);

-- Allow delete access for authenticated users (or limit to admin)
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON "public"."customers";
CREATE POLICY "Enable delete access for authenticated users" 
ON "public"."customers" FOR DELETE 
TO authenticated 
USING (true);

-- Also ensure Profiles table has read access (needed for our manual join)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "public"."profiles";
CREATE POLICY "Public profiles are viewable by everyone" 
ON "public"."profiles" FOR SELECT 
TO authenticated 
USING (true);
