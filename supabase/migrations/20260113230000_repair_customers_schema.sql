-- Migration: Repair Customers Table Schema
-- Date: 2026-01-13
-- Description: Ensures all required columns for lead creation and RPCs exist.
-- Fixes "column does not exist" errors for company_name, status, etc.

DO $$ 
BEGIN 
    -- 1. Ensure 'company_name' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'company_name') THEN
        ALTER TABLE public.customers ADD COLUMN company_name TEXT;
    END IF;

    -- 2. Ensure 'status' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
        ALTER TABLE public.customers ADD COLUMN status TEXT DEFAULT 'new';
    END IF;

    -- 3. Ensure 'source' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'source') THEN
        ALTER TABLE public.customers ADD COLUMN source TEXT DEFAULT 'manual';
    END IF;

    -- 4. Ensure 'representative_id' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'representative_id') THEN
        ALTER TABLE public.customers ADD COLUMN representative_id UUID REFERENCES public.profiles(id);
    END IF;
    
    -- 5. Ensure 'phone_number' exists (alias for phone, used by some triggers)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone_number') THEN
        ALTER TABLE public.customers ADD COLUMN phone_number TEXT;
    END IF;

END $$;
