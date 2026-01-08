-- Enable RLS and add policies for Product Definitions
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of product_definitions" ON product_definitions;

CREATE POLICY "Allow public read of product_definitions"
ON product_definitions
FOR SELECT
TO public
USING (true);

-- Enable RLS and add policies for Price Tables
ALTER TABLE price_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of price_tables" ON price_tables;

CREATE POLICY "Allow public read of price_tables"
ON price_tables
FOR SELECT
TO public
USING (true);

-- Enable RLS and add policies for Price Matrix Entries
ALTER TABLE price_matrix_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of price_matrix_entries" ON price_matrix_entries;

CREATE POLICY "Allow public read of price_matrix_entries"
ON price_matrix_entries
FOR SELECT
TO public
USING (true);

-- Additional Costs
ALTER TABLE additional_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of additional_costs" ON additional_costs;

CREATE POLICY "Allow public read of additional_costs"
ON additional_costs
FOR SELECT
TO public
USING (true);

-- Supplier Costs
ALTER TABLE supplier_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of supplier_costs" ON supplier_costs;

CREATE POLICY "Allow public read of supplier_costs"
ON supplier_costs
FOR SELECT
TO public
USING (true);
