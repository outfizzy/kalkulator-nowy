-- Fix B2B Partner RLS: Restore self-access policies for partner users
-- The fix_b2b_rls migration dropped the original self-access policies but never recreated them.
-- This caused "Nie znaleziono partnera" errors because partner users couldn't read their own records.

-- 1. Ensure helper function exists for partner lookup (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_partner_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT partner_id FROM b2b_partner_users
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Restore: Partners can view their own company record
DROP POLICY IF EXISTS "Partners can view own company" ON b2b_partners;
CREATE POLICY "Partners can view own company" ON b2b_partners
FOR SELECT
TO authenticated
USING (id = public.get_user_partner_id());

-- 3. Partners can INSERT their own partner record (auto-create flow)
DROP POLICY IF EXISTS "Partners can insert own record" ON b2b_partners;
CREATE POLICY "Partners can insert own record" ON b2b_partners
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Restore: Partners can view own team members
DROP POLICY IF EXISTS "Partners can view own team" ON b2b_partner_users;
CREATE POLICY "Partners can view own team" ON b2b_partner_users
FOR SELECT
TO authenticated
USING (partner_id = public.get_user_partner_id() OR user_id = auth.uid());

-- 5. Partners can insert their own user link (auto-create flow)
DROP POLICY IF EXISTS "Partners can insert own user link" ON b2b_partner_users;
CREATE POLICY "Partners can insert own user link" ON b2b_partner_users
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 6. Restore: Partners can manage own offers (SELECT + UPDATE + DELETE)
DROP POLICY IF EXISTS "Partners can manage own offers" ON b2b_offers;
CREATE POLICY "Partners can manage own offers" ON b2b_offers
FOR ALL
TO authenticated
USING (partner_id = public.get_user_partner_id());

-- 7. Partners can insert new offers
DROP POLICY IF EXISTS "Partners can insert offers" ON b2b_offers;
CREATE POLICY "Partners can insert offers" ON b2b_offers
FOR INSERT
TO authenticated
WITH CHECK (partner_id = public.get_user_partner_id());

-- 8. Fix margin_percent for existing partners that have 0 (set to 15% as default)
UPDATE b2b_partners
SET margin_percent = 15
WHERE margin_percent = 0 OR margin_percent IS NULL;

-- 9. Activate partners that are 'inactive' (they registered but status wasn't set)
UPDATE b2b_partners
SET status = 'active'
WHERE status = 'inactive';
