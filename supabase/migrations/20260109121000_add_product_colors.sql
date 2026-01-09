-- Add standard configuration columns to product_definitions
alter table public.product_definitions
add column if not exists standard_colors text[] default ARRAY['RAL 7016', 'RAL 9005', 'RAL 9016', 'RAL 9001', 'RAL 9007'], -- Common defaults
add column if not exists custom_color_surcharge_percentage numeric default 0, -- Example: 30 for 30%
add column if not exists properties jsonb default '{}'::jsonb; -- Flexible storage for other metadata

-- Update existing definitions if needed (optional)
