-- Fix: Add 'website_pl' to leads_source_check constraint
-- This was blocking leads from zadaszto.pl contact forms

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN ('email', 'phone', 'website', 'website_pl', 'targi', 'manual', 'other', 'fair', 'b2b', 'calculator_v2'));
