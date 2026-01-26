-- =====================================================
-- B2B RLS Policies Fix - Allow admins to see all partners
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, drop any existing restrictive policies on b2b_partners
DROP POLICY IF EXISTS "Partners can view own record" ON b2b_partners;
DROP POLICY IF EXISTS "Admins can view all partners" ON b2b_partners;
DROP POLICY IF EXISTS "Admins can manage all partners" ON b2b_partners;
DROP POLICY IF EXISTS "Partners can view all partners" ON b2b_partners;
DROP POLICY IF EXISTS "Authenticated users can create partner" ON b2b_partners;

-- =====================================================
-- b2b_partners - Allow admins/managers to see ALL partners
-- =====================================================

-- Policy 1: Admins/managers can view all partners
CREATE POLICY "Admins can view all partners"
ON b2b_partners FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager', 'manager')
  )
);

-- Policy 2: Partners can view their own record
CREATE POLICY "Partners can view own record"
ON b2b_partners FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM b2b_partner_users
    WHERE b2b_partner_users.partner_id = b2b_partners.id
    AND b2b_partner_users.user_id = auth.uid()
  )
);

-- Policy 3: Admins can insert/update/delete partners
CREATE POLICY "Admins can manage all partners"
ON b2b_partners FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager')
  )
);

-- Policy 4: Allow any authenticated user to insert (for auto-create partner)
CREATE POLICY "Authenticated users can create partner"
ON b2b_partners FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- b2b_partner_users - Link table between users and partners
-- =====================================================

DROP POLICY IF EXISTS "Users can view own links" ON b2b_partner_users;
DROP POLICY IF EXISTS "Admins can manage partner users" ON b2b_partner_users;
DROP POLICY IF EXISTS "Authenticated can insert link" ON b2b_partner_users;

-- Policy: Admins can view all partner-user links
CREATE POLICY "Admins can manage partner users"
ON b2b_partner_users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager')
  )
);

-- Policy: Users can view their own links
CREATE POLICY "Users can view own links"
ON b2b_partner_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Allow authenticated users to create links (for auto-link)
CREATE POLICY "Authenticated can insert link"
ON b2b_partner_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- b2b_offers - Offers created by partners
-- =====================================================

DROP POLICY IF EXISTS "Partners view own offers" ON b2b_offers;
DROP POLICY IF EXISTS "Admins view all offers" ON b2b_offers;
DROP POLICY IF EXISTS "Partners create offers" ON b2b_offers;
DROP POLICY IF EXISTS "Admins manage all offers" ON b2b_offers;

-- Policy: Admins can view all offers
CREATE POLICY "Admins view all offers"
ON b2b_offers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager', 'manager')
  )
);

-- Policy: Partners can view their own offers
CREATE POLICY "Partners view own offers"
ON b2b_offers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM b2b_partner_users
    WHERE b2b_partner_users.partner_id = b2b_offers.partner_id
    AND b2b_partner_users.user_id = auth.uid()
  )
);

-- Policy: Partners can create offers (simplified - allow any authenticated user)
CREATE POLICY "Partners create offers"
ON b2b_offers FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Admins can manage all offers
CREATE POLICY "Admins manage all offers"
ON b2b_offers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'b2b_manager')
  )
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'B2B RLS policies created successfully!' as result;
