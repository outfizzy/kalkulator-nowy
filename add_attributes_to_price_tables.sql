-- Add attributes column to price_tables if it doesn't exist
ALTER TABLE public.price_tables 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.price_tables.attributes IS 'Stores metadata like snow_zone, roof_type, mounting, etc.';

-- Force schema cache reload (sometimes needed for Supabase)
NOTIFY pgrst, 'reload schema';
