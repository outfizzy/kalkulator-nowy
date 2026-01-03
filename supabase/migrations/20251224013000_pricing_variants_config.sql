-- Add variant_config to price_tables to store metadata like roof type, snow zone, etc.
-- This allows distinguishing between "Trendstyle Glass" and "Trendstyle Poly" price lists.

ALTER TABLE public.price_tables 
ADD COLUMN IF NOT EXISTS variant_config JSONB DEFAULT '{}'::jsonb;

-- Update existing tables? No, strict separation.

-- Add index for faster hookups based on variant
CREATE INDEX IF NOT EXISTS idx_price_tables_variant ON public.price_tables USING GIN (variant_config);

-- Comment
COMMENT ON COLUMN public.price_tables.variant_config IS 'Stores variant attributes like {"roofType": "glass"} or {"snowZone": "1"}';
