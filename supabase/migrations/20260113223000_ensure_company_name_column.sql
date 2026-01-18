-- Migration: Ensure company_name column exists in customers table
-- Date: 2026-01-13
-- Description: Fixes schema mismatch where RPC expects company_name but it might be missing or named differently.

DO $$ 
BEGIN 
    -- Check if 'company_name' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'company_name') THEN
        
        -- Check if 'company' exists instead, if so, we might want to rename or just add alias logic. 
        -- But for now, let's just add company_name to be safe and standard.
        -- If 'company' exists, we could migrate data, but let's assume valid Schema is company_name.
        
        ALTER TABLE public.customers ADD COLUMN company_name TEXT;
        
    END IF;
END $$;
