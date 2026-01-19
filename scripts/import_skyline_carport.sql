-- Skyline & Carport Freestanding Tables Import
-- Generated: 2026-01-19T20:41:06.137Z

-- 1. Create product definition
INSERT INTO product_definitions (code, name, category, provider, description)
VALUES ('aluxe_v2_skyline_carport', 'Aluxe V2 - Skyline & Carport', 'roof', 'Aluxe', 'Skyline and Carport roof systems')
ON CONFLICT (code) DO NOTHING;

-- ============= SKYLINE =============
-- Aluxe V2 - Skyline (Zone 1) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 4746.04),
  (5000, 3000, 4079.56),
  (5000, 3500, 4445.49),
  (5000, 4000, 4811.42),
  (5000, 4500, 5177.36),
  (5000, 5000, 5543.29),
  (6000, 3000, 4656.09),
  (6000, 3500, 5077.20),
  (6000, 4000, 5498.31),
  (6000, 4500, 5919.42),
  (6000, 5000, 6340.53),
  (7000, 3000, 5232.62),
  (7000, 3500, 5708.91),
  (7000, 4000, 6406.27),
  (7000, 4500, 6882.56),
  (7000, 5000, 7358.85)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Skyline Freestanding (Zone 1) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline Freestanding (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 5366.92),
  (5000, 3000, 4753.22),
  (5000, 3500, 5119.15),
  (5000, 4000, 5485.08),
  (5000, 4500, 5851.01),
  (5000, 5000, 6216.95),
  (6000, 3000, 5382.53),
  (6000, 3500, 5803.64),
  (6000, 4000, 6224.75),
  (6000, 4500, 6645.86),
  (6000, 5000, 7066.98),
  (7000, 3000, 6011.84),
  (7000, 3500, 6488.13),
  (7000, 4000, 7406.57),
  (7000, 4500, 7882.86),
  (7000, 5000, 8359.15)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline Freestanding (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Skyline (Zone 2) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 4746.04),
  (5000, 3000, 4079.56),
  (5000, 3500, 4445.49),
  (5000, 4000, 4811.42),
  (5000, 4500, 5177.36),
  (5000, 5000, 5543.29),
  (6000, 3000, 4656.09),
  (6000, 3500, 5077.20),
  (6000, 4000, 5498.31),
  (6000, 4500, 5919.42),
  (6000, 5000, 6340.53),
  (7000, 3000, 5232.62),
  (7000, 3500, 5929.98),
  (7000, 4000, 6406.27),
  (7000, 4500, 6882.56),
  (7000, 5000, 7303.78)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Skyline Freestanding (Zone 2) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline Freestanding (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 5366.92),
  (5000, 3000, 4753.22),
  (5000, 3500, 5119.15),
  (5000, 4000, 5485.08),
  (5000, 4500, 5851.01),
  (5000, 5000, 6216.95),
  (6000, 3000, 5382.53),
  (6000, 3500, 5803.64),
  (6000, 4000, 6224.75),
  (6000, 4500, 6645.86),
  (6000, 5000, 7066.98),
  (7000, 3000, 6011.84),
  (7000, 3500, 6930.28),
  (7000, 4000, 7406.57),
  (7000, 4500, 7882.86),
  (7000, 5000, 8249.01)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline Freestanding (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Skyline (Zone 3) (17 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 4500, 4435.29),
  (4000, 5000, 5215.51),
  (5000, 3000, 4079.56),
  (5000, 3500, 4445.49),
  (5000, 4000, 4811.42),
  (5000, 4500, 5177.36),
  (5000, 5000, 6130.13),
  (6000, 3000, 4656.09),
  (6000, 3500, 5077.20),
  (6000, 4000, 5498.31),
  (6000, 4500, 6108.91),
  (6000, 5000, 7234.23),
  (7000, 3000, 5453.69),
  (7000, 3500, 5929.98),
  (7000, 4000, 6406.27),
  (7000, 4500, 6827.49),
  (7000, 5000, 8125.35)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Skyline Freestanding (Zone 3) (17 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Skyline Freestanding (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 4500, 5149.31),
  (4000, 5000, 5938.36),
  (5000, 3000, 4830.84),
  (5000, 3500, 5209.71),
  (5000, 4000, 5588.58),
  (5000, 4500, 5967.45),
  (5000, 5000, 6931.25),
  (6000, 3000, 5475.68),
  (6000, 3500, 5912.32),
  (6000, 4000, 6348.95),
  (6000, 4500, 7164.57),
  (6000, 5000, 8303.12),
  (7000, 3000, 6562.66),
  (7000, 3500, 7057.07),
  (7000, 4000, 7551.47),
  (7000, 4500, 7935.73),
  (7000, 5000, 9249.03)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Skyline Freestanding (Zone 3)' LIMIT 1
);


-- ============= CARPORT =============
-- Aluxe V2 - Carport (Zone 1) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 2514.68),
  (5000, 3000, 2364.75),
  (5000, 3500, 2460.88),
  (5000, 4000, 2557.01),
  (5000, 4500, 2653.14),
  (5000, 5000, 2749.27),
  (6000, 3000, 2592.70),
  (6000, 3500, 2688.83),
  (6000, 4000, 2784.96),
  (6000, 4500, 2881.09),
  (6000, 5000, 2977.22),
  (7000, 3000, 2797.13),
  (7000, 3500, 2893.26),
  (7000, 4000, 2989.39),
  (7000, 4500, 3306.59),
  (7000, 5000, 3402.72)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Carport Freestanding (Zone 1) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport Freestanding (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 3115.11),
  (5000, 3000, 3022.94),
  (5000, 3500, 3119.07),
  (5000, 4000, 3215.20),
  (5000, 4500, 3311.32),
  (5000, 5000, 3407.45),
  (6000, 3000, 3315.28),
  (6000, 3500, 3411.41),
  (6000, 4000, 3507.54),
  (6000, 4500, 3603.67),
  (6000, 5000, 3699.80),
  (7000, 3000, 3577.19),
  (7000, 3500, 3673.32),
  (7000, 4000, 3769.45),
  (7000, 4500, 4749.87),
  (7000, 5000, 4846.00)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport Freestanding (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Carport (Zone 2) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 2514.68),
  (5000, 3000, 2364.75),
  (5000, 3500, 2460.88),
  (5000, 4000, 2557.01),
  (5000, 4500, 2653.14),
  (5000, 5000, 2749.27),
  (6000, 3000, 2592.70),
  (6000, 3500, 2688.83),
  (6000, 4000, 2784.96),
  (6000, 4500, 2881.09),
  (6000, 5000, 2977.22),
  (7000, 3000, 2797.13),
  (7000, 3500, 2893.26),
  (7000, 4000, 3210.46),
  (7000, 4500, 3306.59),
  (7000, 5000, 3402.72)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Carport Freestanding (Zone 2) (16 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport Freestanding (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 5000, 3115.11),
  (5000, 3000, 3022.94),
  (5000, 3500, 3119.07),
  (5000, 4000, 3215.20),
  (5000, 4500, 3311.32),
  (5000, 5000, 3407.45),
  (6000, 3000, 3315.28),
  (6000, 3500, 3411.41),
  (6000, 4000, 3507.54),
  (6000, 4500, 3603.67),
  (6000, 5000, 3699.80),
  (7000, 3000, 3577.19),
  (7000, 3500, 3673.32),
  (7000, 4000, 4653.74),
  (7000, 4500, 4749.87),
  (7000, 5000, 4846.00)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport Freestanding (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Carport (Zone 3) (12 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (5000, 3000, 2364.75),
  (5000, 3500, 2460.88),
  (5000, 4000, 2557.01),
  (5000, 4500, 2653.14),
  (6000, 3000, 2592.70),
  (6000, 3500, 2688.83),
  (6000, 4000, 2784.96),
  (6000, 4500, 2881.09),
  (7000, 3000, 3018.20),
  (7000, 3500, 3114.33),
  (7000, 4000, 3210.46),
  (7000, 4500, 3306.59)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Carport Freestanding (Zone 3) (12 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Carport Freestanding (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (5000, 3000, 3022.94),
  (5000, 3500, 3119.07),
  (5000, 4000, 3215.20),
  (5000, 4500, 3311.32),
  (6000, 3000, 3315.28),
  (6000, 3500, 3411.41),
  (6000, 4000, 3507.54),
  (6000, 4500, 3603.67),
  (7000, 3000, 4461.49),
  (7000, 3500, 4557.61),
  (7000, 4000, 4653.74),
  (7000, 4500, 4749.87)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Carport Freestanding (Zone 3)' LIMIT 1
);


-- Verification
SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Skyline%' OR name LIKE 'Aluxe V2 - Carport%' ORDER BY name;