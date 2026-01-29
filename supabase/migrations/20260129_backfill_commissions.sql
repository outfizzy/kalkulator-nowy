-- Migration: Backfill Commissions for existing Sales Rep Offers breakdown
-- 1. Identify Sales Reps
-- 2. Calculate Commission (Net Price * Rate)
-- 3. Update 'offers' table
-- 4. Update 'contracts' table (sync from offers)
-- 5. Insert missing 'customer_costs' for SOLD offers

-- 1 & 2 & 3. Update Offers
-- Only targets users with role 'sales_rep' and valid commission_rate
UPDATE offers
SET commission = ROUND(
  COALESCE(
    (pricing->>'sellingPriceNet')::numeric,
    (pricing->>'totalCost')::numeric / 1.23
  ) * profiles.commission_rate, 
  2
)
FROM profiles
WHERE offers.user_id = profiles.id
  AND profiles.role = 'sales_rep'
  AND profiles.commission_rate > 0
  AND (offers.commission IS NULL OR offers.commission = 0);

-- 4. Sync Contracts from Offers
-- Contracts store commission in 'contract_data' JSONB column
UPDATE contracts
SET contract_data = jsonb_set(
  contract_data,
  '{commission}',
  to_jsonb(offers.commission)
)
FROM offers
WHERE contracts.offer_id = offers.id
  AND offers.commission > 0
  AND (
    (contract_data->>'commission') IS NULL 
    OR (contract_data->>'commission')::numeric = 0
  );

-- 5. Insert Cost Entries for SOLD offers
-- Only if not exists
INSERT INTO customer_costs (
    id,
    customer_id,
    type,
    amount,
    currency,
    description,
    date,
    source_ref,
    created_at
)
SELECT
    gen_random_uuid(),
    offers.customer_id,
    'commission',
    offers.commission,
    'EUR', -- Assuming EUR based on ContractsList display
    'Prowizja od oferty ' || COALESCE(offers.offer_number, 'Unknown'),
    CURRENT_DATE,
    'offer:' || offers.id,
    NOW()
FROM offers
WHERE offers.status = 'sold'
  AND offers.commission > 0
  AND NOT EXISTS (
      SELECT 1 FROM customer_costs 
      WHERE source_ref = 'offer:' || offers.id 
      AND type = 'commission'
  );
