-- Allow 'addon_matrix' in price_tables type check
ALTER TABLE public.price_tables DROP CONSTRAINT IF EXISTS price_tables_type_check;
ALTER TABLE public.price_tables ADD CONSTRAINT price_tables_type_check CHECK (type IN ('matrix', 'linear', 'fixed', 'addon_matrix'));
