-- Create Pricing Surcharges Table for Global Model Add-ons (e.g. Free-standing)
create table if not exists pricing_surcharges (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  model_family text not null, -- 'Trendstyle', 'Topstyle', etc.
  surcharge_type text not null, -- 'freestanding', etc.
  
  -- Dimensions (Width-based usually)
  width_mm integer not null,
  
  -- Price
  price_eur numeric not null default 0,
  currency text not null default 'EUR',
  
  -- Constraints
  unique(model_family, surcharge_type, width_mm)
);

-- Enable RLS
alter table pricing_surcharges enable row level security;

-- Policies (same as pricing_base)
create policy "Enable read access for all users" on pricing_surcharges
  for select using (true);

create policy "Enable write access for authenticated users" on pricing_surcharges
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on pricing_surcharges
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on pricing_surcharges
  for delete using (auth.role() = 'authenticated');

-- Indexes
create index idx_pricing_surcharges_lookup 
  on pricing_surcharges(model_family, surcharge_type, width_mm);
