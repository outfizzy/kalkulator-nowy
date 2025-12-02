-- Add commission_rate column to profiles table
-- This allows admins to set individual commission rates for each sales rep

-- Add column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,4) DEFAULT 0.05;

-- Add comment
COMMENT ON COLUMN public.profiles.commission_rate IS 
'Individual commission rate for sales reps (e.g., 0.05 = 5%, 0.10 = 10%). Calculated from net selling price (sellingPriceNet).';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'commission_rate';
