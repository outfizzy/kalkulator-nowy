-- Naprawa RLS: pełne uprawnienia dla admin/manager oraz bezpieczne inserty dla użytkowników
-- Uruchom ten skrypt w Supabase SQL Editor jako osobne zapytanie.

-- 1) Funkcje pomocnicze (wykrywanie roli)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) OFFERS
DROP POLICY IF EXISTS "Admins manage offers" ON public.offers;
DROP POLICY IF EXISTS "Admins insert offers" ON public.offers;
DROP POLICY IF EXISTS "Users can insert their own offers" ON public.offers;
DROP POLICY IF EXISTS "Users can update their own offers" ON public.offers;
DROP POLICY IF EXISTS "Users can delete their own offers" ON public.offers;

CREATE POLICY "Admins manage offers"
ON public.offers FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());

CREATE POLICY "Admins insert offers"
ON public.offers FOR INSERT
WITH CHECK (is_admin() OR is_manager());

CREATE POLICY "Users can insert their own offers"
ON public.offers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers"
ON public.offers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers"
ON public.offers FOR DELETE
USING (auth.uid() = user_id);

-- 3) CONTRACTS
DROP POLICY IF EXISTS "Admins manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users manage own contracts" ON public.contracts;

CREATE POLICY "Admins manage contracts"
ON public.contracts FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());

CREATE POLICY "Users manage own contracts"
ON public.contracts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4) INSTALLATIONS
DROP POLICY IF EXISTS "Admins manage installations" ON public.installations;
DROP POLICY IF EXISTS "Users manage own installations" ON public.installations;

CREATE POLICY "Admins manage installations"
ON public.installations FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());

CREATE POLICY "Users manage own installations"
ON public.installations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) TEAMS
DROP POLICY IF EXISTS "Everyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins manage teams" ON public.teams;

CREATE POLICY "Everyone can view teams"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "Admins manage teams"
ON public.teams FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());

-- 6) TEAM MEMBERS
DROP POLICY IF EXISTS "Everyone can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins manage team members" ON public.team_members;

CREATE POLICY "Everyone can view team members"
ON public.team_members FOR SELECT
USING (true);

CREATE POLICY "Admins manage team members"
ON public.team_members FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());

-- 7) INSTALLATION ASSIGNMENTS
DROP POLICY IF EXISTS "Installers can view own assignments" ON public.installation_assignments;
DROP POLICY IF EXISTS "Admins and managers manage assignments" ON public.installation_assignments;

CREATE POLICY "Installers can view own assignments"
ON public.installation_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers manage assignments"
ON public.installation_assignments FOR ALL
USING (is_admin() OR is_manager())
WITH CHECK (is_admin() OR is_manager());
