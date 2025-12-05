-- Enable shared visibility for Contracts, Offers, and Customers
-- Roles: admin, manager, sales_rep will see ALL records

-- 1. CONTRACTS
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Shared visibility for contracts" ON public.contracts;

CREATE POLICY "Shared visibility for contracts" ON public.contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'sales_rep')
        )
    );

-- 2. OFFERS (Source of Customers in some views)
DROP POLICY IF EXISTS "Users can view their own offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
DROP POLICY IF EXISTS "Shared visibility for offers" ON public.offers;

CREATE POLICY "Shared visibility for offers" ON public.offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'sales_rep')
        )
    );

-- 3. CUSTOMERS (If separate table exists)
-- Attempt to create policy if table exists (idempotent approach not easily possible in standard SQL without dynamic SQL, 
-- but we assume table exists based on RingostatWidget usage)
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Shared visibility for customers" ON public.customers;

CREATE POLICY "Shared visibility for customers" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'sales_rep')
        )
    );
