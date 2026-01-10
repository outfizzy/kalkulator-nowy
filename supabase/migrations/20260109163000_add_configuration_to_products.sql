-- Add configuration column to product_definitions
ALTER TABLE product_definitions 
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;
