-- Promote manual models from pricing_base to product_definitions
-- This ensures that models like 'Trendstyle' are visible without scanning the entire large pricing_base table
-- and allows adding images/metadata to them.

INSERT INTO public.product_definitions (name, code, description, category, provider)
SELECT DISTINCT 
    model_family as name,
    model_family as code, -- Use family name as code
    'Imported from Pricing Matrix' as description,
    'roof' as category,
    'Manual' as provider
FROM public.pricing_base
WHERE model_family IS NOT NULL
ON CONFLICT (code) DO UPDATE 
SET 
  -- Optionally update timestamp or ensure visibility
  updated_at = now();
