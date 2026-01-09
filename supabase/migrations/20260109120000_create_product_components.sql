-- Create Product Components table for storing images and descriptions of materials/addons
create table if not exists product_components (
  id uuid default gen_random_uuid() primary key,
  
  -- Optional link to specific product. If null, it's a global component (e.g. standard glass)
  product_definition_id uuid references public.product_definitions(id) on delete set null,
  
  -- The lookup key used in pricing tables (e.g. 'glass_clear', 'poly_opal', 'freestanding')
  component_key text not null,
  
  name text not null,
  description text,
  image_url text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Unique constraint: A key can exist once globally (null product) or once per product.
  -- Actually, Postgres treats nulls as distinct, so unique(product_definition_id, component_key) allows multiple nulls?
  -- Yes. We want only ONE global entry for 'glass_clear'.
  -- So we might need a partial unique index for globals.
  constraint unique_component_per_product unique nulls not distinct (product_definition_id, component_key)
);

-- Enable RLS
alter table product_components enable row level security;

-- Policies
create policy "Enable read access for all users" on product_components
  for select using (true);

create policy "Enable write access for authenticated users" on product_components
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on product_components
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on product_components
  for delete using (auth.role() = 'authenticated');

-- Indexes
create index idx_product_components_key on product_components(component_key);
