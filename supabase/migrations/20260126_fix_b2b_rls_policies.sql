-- FINAL FIX: SCHEMA + RECURSION + PERMISSIONS
-- ==========================================================

BEGIN;

-- 0. FIX SCHEMA (Missing columns causing sync errors)
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS primary_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 15;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 14;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS prepayment_required BOOLEAN DEFAULT true;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS prepayment_percent NUMERIC DEFAULT 100;
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 1. Helper Function
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles 
FOR SELECT 
TO authenticated
USING (
  public.check_user_role(ARRAY['admin', 'b2b_manager', 'manager', 'superadmin'])
);

-- 3. Partners Policies
DROP POLICY IF EXISTS "Admins can manage partners" ON b2b_partners;
CREATE POLICY "Admins can manage partners" ON b2b_partners 
FOR ALL
TO authenticated
USING (
  public.check_user_role(ARRAY['admin', 'b2b_manager', 'manager', 'superadmin'])
);

DROP POLICY IF EXISTS "Admins can manage partner users" ON b2b_partner_users;
CREATE POLICY "Admins can manage partner users" ON b2b_partner_users 
FOR ALL
TO authenticated
USING (
  public.check_user_role(ARRAY['admin', 'b2b_manager', 'manager', 'superadmin'])
);

-- 4. Offers Policies
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

COMMIT;
