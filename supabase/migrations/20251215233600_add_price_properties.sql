-- Add detailed pricing columns to price_matrix_entries
ALTER TABLE public.price_matrix_entries
ADD COLUMN IF NOT EXISTS structure_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS glass_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;

-- Update existing entries to have structure_price = price (migration fallback)
UPDATE public.price_matrix_entries
SET structure_price = price
WHERE structure_price = 0 AND price > 0;
