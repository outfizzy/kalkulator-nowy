-- Quick fix: Alter existing wallet_transactions table to change customer_id type
-- Run this in Supabase SQL Editor if you already created the table

-- Step 1: Drop the foreign key constraint if it exists
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_customer_id_fkey;

-- Step 2: Change customer_id from uuid to text
ALTER TABLE public.wallet_transactions 
ALTER COLUMN customer_id TYPE text USING customer_id::text;

-- Note: We're removing the foreign key relationship because we're storing 
-- customer names as identifiers, not UUIDs from the offers table
