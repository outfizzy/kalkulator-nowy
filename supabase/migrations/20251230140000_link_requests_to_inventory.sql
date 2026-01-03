-- Add inventory_item_id to order_requests table
alter table public.order_requests
add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null;

-- Add index for performance
create index if not exists idx_order_requests_inventory_item on public.order_requests(inventory_item_id);

-- Update view_procurement_items to include inventory_item_id?
-- The view definition might need to be created again with CREATE OR REPLACE VIEW if we want to expose this column in the unified view,
-- but for the automation logic (which happens on UPDATE of the base table), we might not strictly need it in the view *yet* for display,
-- but good to have.

-- Let's update the view just in case to be future proof.
-- Drop view first to allow column type changes
drop view if exists public.view_procurement_items;

create or replace view public.view_procurement_items as
select
    'contract' as source_type,
    c.id as source_id,
    ioi.id as item_id,
    (c.contract_data->>'contractNumber') as reference_number,
    (c.contract_data->'client'->>'lastName') || ' ' || (c.contract_data->'client'->>'firstName') as client_name,
    (c.contract_data->'client'->>'city') as client_city,
    ioi.name as item_name,
    ioi.category as category,
    ioi.status as status,
    ioi.planned_delivery_date as planned_delivery_date,
    (ioi.purchase_cost)::numeric as purchase_cost,
    c.created_at as created_at,
    c.sales_rep_id as owner_id
from contracts c
cross join lateral jsonb_to_recordset(c.contract_data->'orderedItems') as ioi(id text, name text, category text, status text, planned_delivery_date text, purchase_cost numeric)

union all

select
    'installation' as source_type,
    i.id as source_id,
    ioi.id::text as item_id,
    coalesce(c.contract_data->>'contractNumber', 'WARSZTAT') as reference_number,
    (i.installation_data->'client'->>'lastName') || ' ' || (i.installation_data->'client'->>'firstName') as client_name,
    (i.installation_data->'client'->>'city') as client_city,
    ioi.name as item_name,
    ioi.type as category,
    ioi.status::text as status,
    ioi.planned_delivery_date::text as planned_delivery_date,
    0 as purchase_cost,
    ioi.created_at as created_at,
    null as owner_id
from installations i
join installation_order_items ioi on ioi.installation_id = i.id
left join contracts c on c.offer_id = i.offer_id

union all

select
    'inventory' as source_type,
    r.id as source_id,
    r.id::text as item_id,
    'ZAPOTRZEBOWANIE' as reference_number,
    u.full_name as client_name,
    'Magazyn' as client_city,
    r.item_name,
    'Inventory' as category,
    r.status::text,
    null as planned_delivery_date,
    0 as purchase_cost,
    r.created_at,
    r.user_id as owner_id
from order_requests r
left join profiles u on r.user_id = u.id;
