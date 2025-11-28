-- Add distance column to offers table for mileage tracking
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS distance NUMERIC DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN public.offers.distance IS 'Distance to client in kilometers';
