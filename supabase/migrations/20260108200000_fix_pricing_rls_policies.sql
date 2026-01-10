
-- Fix RLS: Allow authenticated users to Manage Price Tables
-- (Previous migration only enabled SELECT)

-- 1. Price Tables
-- 1. Price Tables
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON price_tables;
create policy "Enable write access for authenticated users" on price_tables
  for insert with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON price_tables;
create policy "Enable update for authenticated users" on price_tables
  for update using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON price_tables;
create policy "Enable delete for authenticated users" on price_tables
  for delete using (auth.role() = 'authenticated');

-- 2. Price Matrix Entries (for PDF/Excel imports)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON price_matrix_entries;
create policy "Enable write access for authenticated users" on price_matrix_entries
  for insert with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON price_matrix_entries;
create policy "Enable update for authenticated users" on price_matrix_entries
  for update using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON price_matrix_entries;
create policy "Enable delete for authenticated users" on price_matrix_entries
  for delete using (auth.role() = 'authenticated');

-- 3. Additional Costs / Supplier Costs (just in case they need editing)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON additional_costs;
create policy "Enable write access for authenticated users" on additional_costs
  for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON additional_costs;
create policy "Enable update for authenticated users" on additional_costs
  for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON additional_costs;
create policy "Enable delete for authenticated users" on additional_costs
  for delete using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON supplier_costs;
create policy "Enable write access for authenticated users" on supplier_costs
  for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON supplier_costs;
create policy "Enable update for authenticated users" on supplier_costs
  for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON supplier_costs;
create policy "Enable delete for authenticated users" on supplier_costs
  for delete using (auth.role() = 'authenticated');
