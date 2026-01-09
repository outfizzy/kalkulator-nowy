
-- Add source_import_id to pricing_surcharges to link with price_tables
alter table pricing_surcharges
add column if not exists source_import_id uuid references price_tables(id) on delete set null;

-- Add index for lookup
create index if not exists idx_pricing_surcharges_source_id on pricing_surcharges(source_import_id);
