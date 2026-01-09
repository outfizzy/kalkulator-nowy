
-- Add structural attributes to pricing_base
alter table pricing_base 
add column if not exists posts_count integer,
add column if not exists fields_count integer,
add column if not exists area_m2 numeric;

-- Comment on columns
comment on column pricing_base.posts_count is 'Number of posts (Pfosten)';
comment on column pricing_base.fields_count is 'Number of roof fields (Felder)';
comment on column pricing_base.area_m2 is 'Surface area in m2';
