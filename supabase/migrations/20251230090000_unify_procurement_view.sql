-- Drop existing view
DROP VIEW IF EXISTS view_procurement_items;

-- Create unified view
CREATE OR REPLACE VIEW view_procurement_items AS

-- 1. CONTRACTgetItems (Existing)
SELECT
    -- Unique Key Construction: prefix + ID to ensure uniqueness across sources
    'contract_' || (item->>'id') AS id,
    'contract' AS source_type,
    c.id::text AS source_id,
    item->>'id' AS item_id, -- Original Item ID
    
    -- Display Fields
    c.contract_data->>'contractNumber' as reference_number,
    COALESCE(c.contract_data->'client'->>'firstName', '') || ' ' || COALESCE(c.contract_data->'client'->>'lastName', '') as client_name,
    c.contract_data->'client'->>'city' as client_city,
    
    item->>'name' as item_name,
    item->>'category' as category,
    item->>'status' as status,
    item->>'plannedDeliveryDate' as planned_delivery_date,
    COALESCE((item->>'purchaseCost')::numeric, 0) as purchase_cost,
    c.created_at as created_at,
    c.sales_rep_id as owner_id
FROM
    contracts c,
    jsonb_array_elements(COALESCE(c.contract_data->'orderedItems', '[]'::jsonb)) as item
WHERE
    c.status = 'signed'

UNION ALL

-- 2. INSTALLATION ITEMS (Manager Responsible)
SELECT
    'install_' || ioi.id::text AS id,
    'installation' AS source_type,
    ioi.installation_id::text AS source_id,
    ioi.id::text AS item_id,
    
    -- Reference: Contract Number (from Contract) or "Montaż: [Product Summary]"
    COALESCE(c.contract_data->>'contractNumber', 'Montaż: ' || COALESCE(i.installation_data->>'productSummary', '')) as reference_number,
    -- Client Name from Installation Data
    COALESCE(i.installation_data->'client'->>'firstName', '') || ' ' || COALESCE(i.installation_data->'client'->>'lastName', '') as client_name,
    i.installation_data->'client'->>'city' as client_city,
    
    ioi.name as item_name,
    ioi.type as category, -- e.g. 'flooring', 'addon'
    ioi.status::text as status,
    ioi.planned_delivery_date::text as planned_delivery_date,
    0 as purchase_cost, -- Not tracked in this table currently
    ioi.created_at as created_at,
    i.user_id as owner_id -- Installer or Creator
FROM
    installation_order_items ioi
JOIN
    installations i ON ioi.installation_id = i.id
LEFT JOIN
    contracts c ON i.offer_id = c.offer_id
WHERE
    ioi.is_manager_responsible = true

UNION ALL

-- 3. INVENTORY REQUESTS
SELECT
    'inventory_' || orq.id::text AS id,
    'inventory' AS source_type,
    orq.user_id::text AS source_id, -- User who requested
    orq.id::text AS item_id,
    
    'Wewn. Zapotrzebowanie' as reference_number,
    -- Client Name -> Requester Name
    p.full_name as client_name,
    'Magazyn' as client_city,
    
    orq.item_name as item_name,
    'Inventory' as category,
    orq.status::text as status,
    NULL as planned_delivery_date,
    0 as purchase_cost,
    orq.created_at as created_at,
    orq.user_id as owner_id
FROM
    order_requests orq
LEFT JOIN
    profiles p ON orq.user_id = p.id;

-- Grant access
GRANT SELECT ON view_procurement_items TO authenticated;
