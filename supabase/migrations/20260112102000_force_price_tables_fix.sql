-- Force update price_tables constraint
-- Use DO block for safety if possible, or just raw commands

-- 1. Drop existing check (if any)
ALTER TABLE public.price_tables DROP CONSTRAINT IF EXISTS price_tables_type_check;

-- 2. Add correct check
ALTER TABLE public.price_tables ADD CONSTRAINT price_tables_type_check 
CHECK (type IN ('matrix', 'linear', 'fixed', 'addon_matrix'));

-- 3. Verify (Optional, just ensuring standard constraints aren't messed up)
