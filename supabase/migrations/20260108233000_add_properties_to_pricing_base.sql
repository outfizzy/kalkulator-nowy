-- Add properties jsonb column to pricing_base to store extra import data
alter table pricing_base 
add column if not exists properties jsonb default '{}'::jsonb;
