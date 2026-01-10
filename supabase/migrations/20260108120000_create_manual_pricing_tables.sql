-- Create Manual Pricing Table
create table if not exists pricing_base (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Core Match Criteria
  model_family text not null, -- 'Trendstyle', 'Topstyle', etc.
  construction_type text not null check (construction_type in ('wall', 'free')),
  cover_type text not null, -- 'glass_clear', 'poly_opal', 'vsg_8mm_matt', etc.
  zone integer not null default 1,
  
  -- Dimensions (Exact Match)
  width_mm integer not null,
  depth_mm integer not null,
  
  -- Pricing
  price_upe_net_eur numeric not null default 0,
  currency text not null default 'EUR',
  
  -- Metadata
  source_import_id text, -- optional tracking
  
  -- Constraints
  -- We want unique prices for a specific combo. 
  -- If user imports same combo, we overwrite or error? usually Update.
  unique(model_family, construction_type, cover_type, zone, width_mm, depth_mm)
);

-- Enable RLS
alter table pricing_base enable row level security;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON pricing_base;
create policy "Enable read access for all users" on pricing_base
  for select using (true);

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON pricing_base;
create policy "Enable write access for authenticated users" on pricing_base
  for insert with check (auth.role() = 'authenticated'); -- Or strictly 'service_role' / specific users

DROP POLICY IF EXISTS "Enable update for authenticated users" ON pricing_base;
create policy "Enable update for authenticated users" on pricing_base
  for update using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pricing_base;
create policy "Enable delete for authenticated users" on pricing_base
  for delete using (auth.role() = 'authenticated');

-- Indexes for Fast Lookup
-- Indexes for Fast Lookup
create index if not exists idx_pricing_base_lookup 
  on pricing_base(model_family, construction_type, cover_type, zone, width_mm, depth_mm);
