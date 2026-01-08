-- Migration: Fix Fair Leads Source Constraint
-- Description: Updates the check constraint on leads.source to include 'targi'

-- 1. Drop existing constraint (name might vary, so we try standard names or just replace if possible)
-- Note: Supabase/Postgres usually names it {table}_{column}_check
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

-- 2. Read constraint with new values
ALTER TABLE public.leads 
ADD CONSTRAINT leads_source_check 
CHECK (source IN ('email', 'phone', 'manual', 'website', 'targi', 'other'));

-- 3. Verify RLS for insert is open (Redundant safety check)
-- "leads_insert_policy" should already exist from 20260105140000_update_leads_rls.sql
-- If not, we ensure authenticated users can insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'leads_insert_policy'
    ) THEN
        CREATE POLICY "leads_insert_policy" ON "public"."leads"
        AS PERMISSIVE FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END
$$;
