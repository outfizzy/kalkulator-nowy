-- Freestanding Construction Surcharge Tables Import
-- Based on Excel sheet: "Freistehende TerrassendächerR"
-- For models: Orangeline, Trendline, Topline, Designline

-- 1. Create product definition for freestanding surcharges
INSERT INTO product_definitions (code, name, category, provider, description)
VALUES ('aluxe_v2_freestanding', 'Aluxe V2 - Freestanding Surcharges', 'other', 'Aluxe', 'Surcharges for freestanding construction')
ON CONFLICT (code) DO NOTHING;

-- 2. Create "No Foundation" surcharge table
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Freestanding Surcharge (No Foundation)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_freestanding'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (No Foundation)');

-- 3. Insert "No Foundation" entries (width-based, projection=0)
WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (No Foundation)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 0, 382.68),
  (4000, 0, 450.34),
  (5000, 0, 518.00),
  (6000, 0, 658.55),
  (7000, 0, 726.20)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Freestanding Surcharge (No Foundation)' LIMIT 1
);

-- 4. Create "With Foundation" surcharge table
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Freestanding Surcharge (With Foundation)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_freestanding'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (With Foundation)');

-- 5. Insert "With Foundation" entries (width-based, projection=0)
WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (With Foundation)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 0, 459.78),
  (4000, 0, 527.45),
  (5000, 0, 595.11),
  (6000, 0, 774.20),
  (7000, 0, 841.86)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Freestanding Surcharge (With Foundation)' LIMIT 1
);

-- Verification
SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Freestanding%';
