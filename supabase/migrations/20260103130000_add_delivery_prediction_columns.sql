-- Migration: Add Delivery Prediction Columns (Week/Exact Date) to Logistics
-- 1. Add columns to installation_order_items
-- 2. Add columns to order_requests
-- 3. Update view_procurement_items to expose these fields

BEGIN;

-- 1. Installation Order Items
ALTER TABLE "public"."installation_order_items" 
    ADD COLUMN IF NOT EXISTS "delivery_week" TEXT,           -- e.g. '2026-W01'
    ADD COLUMN IF NOT EXISTS "confirmed_delivery_date" DATE; -- Exact date if known

-- 2. Order Requests (Inventory)
ALTER TABLE "public"."order_requests"
    ADD COLUMN IF NOT EXISTS "delivery_week" TEXT,
    ADD COLUMN IF NOT EXISTS "confirmed_delivery_date" DATE;

-- 3. Update Unified Procurement View
DROP VIEW IF EXISTS "public"."view_procurement_items";

CREATE OR REPLACE VIEW "public"."view_procurement_items" AS
-- A. CONTRACT ITEMS (JSONB)
SELECT
    'contract' AS source_type,
    c.id::text AS source_id,
    ioi.id AS item_id,
    -- Construct ID for frontend keys
    'contract_' || ioi.id AS unique_id,
    
    COALESCE(c.contract_data->>'contractNumber', 'Nowy') as reference_number,
    COALESCE(c.contract_data->'client'->>'lastName', '') || ' ' || COALESCE(c.contract_data->'client'->>'firstName', '') as client_name,
    COALESCE(c.contract_data->'client'->>'city', '') as client_city,
    
    ioi.name as item_name,
    ioi.category as category,
    ioi.status as status,
    ioi.planned_delivery_date as planned_delivery_date, -- Original text field
    
    -- New Fields (Extracted from JSONB)
    NULLIF(ioi.delivery_week, '') as delivery_week,
    (NULLIF(ioi.confirmed_delivery_date, ''))::date as confirmed_delivery_date,
    
    (ioi.purchase_cost)::numeric as purchase_cost,
    c.created_at as created_at,
    c.sales_rep_id as owner_id
FROM contracts c
CROSS JOIN LATERAL jsonb_to_recordset(c.contract_data->'orderedItems') AS ioi(
    id text, 
    name text, 
    category text, 
    status text, 
    planned_delivery_date text, 
    purchase_cost numeric,
    delivery_week text,           -- New JSON field
    confirmed_delivery_date text  -- New JSON field
)

UNION ALL

-- B. INSTALLATION ITEMS (Table)
SELECT
    'installation' AS source_type,
    i.id::text AS source_id,
    ioi.id::text AS item_id,
    'install_' || ioi.id::text AS unique_id,
    
    COALESCE(c.contract_data->>'contractNumber', 'Montaż') as reference_number,
    COALESCE(i.installation_data->'client'->>'lastName', '') || ' ' || COALESCE(i.installation_data->'client'->>'firstName', '') as client_name,
    COALESCE(i.installation_data->'client'->>'city', '') as client_city,
    
    ioi.name as item_name,
    ioi.type as category,
    ioi.status::text as status,
    ioi.planned_delivery_date::text as planned_delivery_date,
    
    -- New Fields (Direct Columns)
    ioi.delivery_week,
    ioi.confirmed_delivery_date,
    
    0 as purchase_cost,
    ioi.created_at as created_at,
    i.user_id as owner_id
FROM installations i
JOIN installation_order_items ioi ON ioi.installation_id = i.id
LEFT JOIN contracts c ON c.offer_id = i.offer_id
WHERE ioi.is_manager_responsible = true

UNION ALL

-- C. INVENTORY REQUESTS (Table)
SELECT
    'inventory' AS source_type,
    r.id::text AS source_id,
    r.id::text AS item_id,
    'inventory_' || r.id::text AS unique_id,
    
    'ZAPOTRZEBOWANIE' as reference_number,
    u.full_name as client_name,
    'Magazyn' as client_city,
    
    r.item_name,
    'Inventory' as category,
    r.status::text as status,
    NULL as planned_delivery_date,
    
    -- New Fields (Direct Columns)
    r.delivery_week,
    r.confirmed_delivery_date,
    
    0 as purchase_cost,
    r.created_at,
    r.user_id as owner_id
FROM order_requests r
LEFT JOIN profiles u ON r.user_id = u.id;

-- Grant Permissions
GRANT SELECT ON "public"."view_procurement_items" TO authenticated;

COMMIT;
