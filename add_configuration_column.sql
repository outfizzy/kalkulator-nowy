-- Add configuration column to price_tables if it doesn't exist
ALTER TABLE public.price_tables 
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.price_tables.configuration IS 'Stores UI configuration and rules like free_standing_surcharge';

-- Force schema cache reload (critical for Supabase/PostgREST to see the new column)
NOTIFY pgrst, 'reload schema';
