-- Add configuration column to price_tables to store rules like Free Standing surcharges
ALTER TABLE public.price_tables
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;
