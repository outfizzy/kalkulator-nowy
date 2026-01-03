-- Create a view to flatten ordered items from contracts
-- This allows easy querying of all items that need to be ordered across all signed contracts

CREATE OR REPLACE VIEW view_procurement_items AS
SELECT
    c.id AS contract_id,
    c.contract_data->>'contractNumber' as contract_number,
    -- Extract Client Name safely
    COALESCE(c.contract_data->'client'->>'firstName', '') || ' ' || COALESCE(c.contract_data->'client'->>'lastName', '') as client_name,
    c.contract_data->'client'->>'city' as client_city,
    
    -- Extract Item Details
    item->>'id' as item_id,
    item->>'name' as item_name,
    item->>'category' as category,
    item->>'status' as status,
    item->>'plannedDeliveryDate' as planned_delivery_date,
    COALESCE((item->>'purchaseCost')::numeric, 0) as purchase_cost,
    
    -- Contract Metadata
    c.created_at as contract_date,
    c.sales_rep_id
FROM
    contracts c,
    jsonb_array_elements(COALESCE(c.contract_data->'orderedItems', '[]'::jsonb)) as item
WHERE
    c.status = 'signed';

-- Grant access to authenticated users
GRANT SELECT ON view_procurement_items TO authenticated;
