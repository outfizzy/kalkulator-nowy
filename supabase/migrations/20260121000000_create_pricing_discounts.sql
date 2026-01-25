create table if not exists pricing_discounts (
  id uuid primary key default gen_random_uuid(),
  model_family text not null unique, -- e.g. 'Orangeline', 'Trendline', 'GLOBAL'
  discount_percent numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table pricing_discounts enable row level security;

create policy "Admins can manage discounts"
  on pricing_discounts
  for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'manager')
    )
  );

-- Insert defaults
insert into pricing_discounts (model_family, discount_percent) values
  ('GLOBAL', 0),
  ('Orangeline', 0),
  ('Orangeline+', 0),
  ('Trendline', 0),
  ('Trendline+', 0),
  ('Topline', 0),
  ('Topline XL', 0),
  ('Ultraline', 0),
  ('Designline', 0)
on conflict (model_family) do nothing;
