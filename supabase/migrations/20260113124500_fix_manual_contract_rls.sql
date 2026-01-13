-- Fix Manual Contract Creation Permissions
-- Description: Ensures Admins and Managers can INSERT/UPDATE contracts and offers (required for Manual Contract flow).

-- 1. CONTRACTS: Allow Insert/Update for Admins/Managers
DROP POLICY IF EXISTS "contracts_insert_policy" ON public.contracts;
DROP POLICY IF EXISTS "contracts_update_policy" ON public.contracts;

CREATE POLICY "contracts_insert_policy" ON public.contracts
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR user_id = auth.uid() -- Sales reps might create their own contracts too?
);

CREATE POLICY "contracts_update_policy" ON public.contracts
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR user_id = auth.uid()
);

-- 2. OFFERS: Ensure permissive Insert/Update for creating "Dummy" offers
DROP POLICY IF EXISTS "offers_insert_policy" ON public.offers;
DROP POLICY IF EXISTS "offers_update_policy" ON public.offers;

CREATE POLICY "offers_insert_policy" ON public.offers
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true); -- Anyone authenticated can create an offer

CREATE POLICY "offers_update_policy" ON public.offers
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR user_id = auth.uid() -- Creator can update
  OR EXISTS ( -- Assignee/Lead Owner can update?
     SELECT 1 FROM public.leads 
     WHERE leads.id = offers.lead_id 
     AND leads.assigned_to = auth.uid()
  )
);

NOTIFY pgrst, 'reload config';
