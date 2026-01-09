
-- Fix RLS: Allow authenticated users to Manage Price Tables
-- (Previous migration only enabled SELECT)

-- 1. Price Tables
create policy "Enable write access for authenticated users" on price_tables
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on price_tables
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on price_tables
  for delete using (auth.role() = 'authenticated');

-- 2. Price Matrix Entries (for PDF/Excel imports)
create policy "Enable write access for authenticated users" on price_matrix_entries
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on price_matrix_entries
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on price_matrix_entries
  for delete using (auth.role() = 'authenticated');

-- 3. Additional Costs / Supplier Costs (just in case they need editing)
create policy "Enable write access for authenticated users" on additional_costs
  for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on additional_costs
  for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on additional_costs
  for delete using (auth.role() = 'authenticated');

create policy "Enable write access for authenticated users" on supplier_costs
  for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on supplier_costs
  for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on supplier_costs
  for delete using (auth.role() = 'authenticated');
