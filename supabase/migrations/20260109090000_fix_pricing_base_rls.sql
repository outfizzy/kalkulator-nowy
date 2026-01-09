-- Enable RLS for pricing_base
alter table pricing_base enable row level security;

-- Drop existing policies to avoid conflicts (Idempotent)
drop policy if exists "Enable read access for authenticated users" on pricing_base;
drop policy if exists "Enable insert for authenticated users" on pricing_base;
drop policy if exists "Enable update for authenticated users" on pricing_base;
drop policy if exists "Enable delete for authenticated users" on pricing_base;

-- Re-create policies
create policy "Enable read access for authenticated users" on pricing_base
  for select using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users" on pricing_base
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on pricing_base
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on pricing_base
  for delete using (auth.role() = 'authenticated');


-- Enable RLS for pricing_surcharges
alter table pricing_surcharges enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Enable read access for authenticated users" on pricing_surcharges;
drop policy if exists "Enable insert for authenticated users" on pricing_surcharges;
drop policy if exists "Enable update for authenticated users" on pricing_surcharges;
drop policy if exists "Enable delete for authenticated users" on pricing_surcharges;

-- Re-create policies
create policy "Enable read access for authenticated users" on pricing_surcharges
  for select using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users" on pricing_surcharges
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on pricing_surcharges
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on pricing_surcharges
  for delete using (auth.role() = 'authenticated');
