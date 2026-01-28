-- Migration: Add contract_number field to customers table
-- Date: 2026-01-28
-- Description: Adds optional contract_number field to customers table for linking to contracts

BEGIN;

-- Add contract_number column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'contract_number'
    ) THEN
        ALTER TABLE public.customers 
        ADD COLUMN contract_number TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.customers.contract_number IS 'Optional contract number that can be pre-filled when creating customer';
    END IF;
END $$;

COMMIT;
