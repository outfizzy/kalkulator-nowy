-- Script to safely create or update wallet_transactions table
-- Run this in Supabase SQL Editor

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount decimal(10, 2) NOT NULL,
    currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'PLN')),
    category text NOT NULL,
    description text,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Optional link to customer/contract for income
    customer_id text,  -- Changed from uuid to text to store customer identifier
    customer_name text,
    contract_number text,
    
    -- Metadata
    processed_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Add currency column if table already exists but column is missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'wallet_transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.wallet_transactions 
        ADD COLUMN currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'PLN'));
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.wallet_transactions;

-- Step 5: Create policies
CREATE POLICY "Admins can view all transactions"
    ON public.wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can insert transactions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can update transactions"
    ON public.wallet_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete transactions"
    ON public.wallet_transactions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );
