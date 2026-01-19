-- Ultraline Freestanding Surcharge Import
-- Based on user-provided table
-- Prices are width-dependent (no foundations variant only)

-- 1. Create product definition
INSERT INTO product_definitions (code, name, category, provider, description)
VALUES ('aluxe_v2_ultraline_surcharge', 'Aluxe V2 - Ultraline Surcharges', 'other', 'Aluxe', 'Surcharges for Ultraline freestanding')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Ultraline Freestanding Surcharge table (No Foundation)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_ultraline_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)');

-- 3. Insert entries (width-based, projection=0)
WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 0, 1115.10),
  (5000, 0, 1249.20),
  (6000, 0, 1384.62),
  (7000, 0, 1518.30)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)' LIMIT 1
);

-- Verification
SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Ultraline%Surcharge%';
