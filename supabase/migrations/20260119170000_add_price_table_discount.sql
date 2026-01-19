-- Add discount_percent column to price_tables for V2 global discount feature
ALTER TABLE price_tables 
ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;

-- Add comment
COMMENT ON COLUMN price_tables.discount_percent IS 'Global discount percentage applied to all prices in this table. Negative = discount, positive = markup.';
