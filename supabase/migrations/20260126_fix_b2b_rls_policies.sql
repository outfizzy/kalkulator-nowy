-- EMERGENCY FIX SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX LOGIN AND PERMISSIONS
-- ==========================================================

-- 1. Allows users to log in (read their own profile)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Allows Admins to see all users (needed for Partner Sync)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'b2b_manager', 'manager', 'superadmin')
  )
);

-- 3. Allows Admins to create missing Company records (fixes "Partner not found")
DROP POLICY IF EXISTS "Admins can manage partners" ON b2b_partners;
CREATE POLICY "Admins can manage partners" ON b2b_partners 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'b2b_manager', 'manager', 'superadmin')
  )
);

DROP POLICY IF EXISTS "Admins can manage partner users" ON b2b_partner_users;
CREATE POLICY "Admins can manage partner users" ON b2b_partner_users 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'b2b_manager', 'manager', 'superadmin')
  )
);

-- 4. Fixes "Error saving offer" for Partners
DROP POLICY IF EXISTS "Partners can insert offers" ON offers;
CREATE POLICY "Partners can insert offers" ON offers 
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Partners can update own offers" ON offers;
CREATE POLICY "Partners can update own offers" ON offers 
FOR UPDATE
USING (
  auth.uid() = user_id
);

-- 5. Grant access to schema (just in case)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
