
-- Insert Freestanding Surcharges for Trendstyle, Trendstyle+, Orangestyle, Topstyle, Topstyle XL
-- Values taken from "ohne Fundamente" (Without Foundation) column
-- 3000 mm: 382.68
-- 4000 mm: 450.34
-- 5000 mm: 518.00
-- 6000 mm: 658.55
-- 7000 mm: 726.20

with surcharge_values (width_mm, price_eur) as (
  values 
    (3000, 382.68),
    (4000, 450.34),
    (5000, 518.00),
    (6000, 658.55),
    (7000, 726.20)
),
target_models (family) as (
  values 
    ('Trendstyle'),
    ('Trendstyle+'),
    ('Orangestyle'),
    ('Topstyle'),
    ('Topstyle XL')
)
insert into pricing_surcharges (model_family, surcharge_type, width_mm, price_eur)
select 
  m.family,
  'freestanding',
  v.width_mm,
  v.price_eur
from surcharge_values v, target_models m
on conflict (model_family, surcharge_type, width_mm) 
do update set price_eur = excluded.price_eur;
