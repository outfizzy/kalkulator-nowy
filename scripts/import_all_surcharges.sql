-- Complete Variant Surcharge Tables Import for ALL Models & Zones
-- Generated: 2026-01-19T20:17:20.730Z
-- Total models: 6, Zones: 3, Variants: Matt, Stopsol, IR Gold

-- 1. Create product definition for surcharges
INSERT INTO product_definitions (code, name, category, provider, description)
VALUES ('aluxe_v2_surcharge', 'Aluxe V2 - Variant Surcharges', 'other', 'Aluxe', 'Surcharges for glass/poly variants')
ON CONFLICT (code) DO NOTHING;

-- ============= ORANGELINE =============
-- Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 5000, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 5000, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 5000, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4900, 105.71),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4900, 140.94),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4900, 176.18),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 211.42)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 4700, 116.75),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 4700, 155.66),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 4700, 194.58),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 4700, 233.50)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 4700, 448.08),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 4700, 597.45),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 4700, 746.81),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4600, 99.24),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4600, 132.31),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4600, 165.39),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 198.47)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- ============= ORANGELINE+ =============
-- Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 49.68),
  (4000, 2500, 62.10),
  (4000, 3000, 74.52),
  (4000, 3500, 86.94),
  (4000, 4000, 74.52),
  (4000, 4500, 86.94),
  (4000, 5000, 124.20),
  (5000, 2000, 66.24),
  (5000, 2500, 82.80),
  (5000, 3000, 99.36),
  (5000, 3500, 115.92),
  (5000, 4000, 99.36),
  (5000, 4500, 115.92),
  (5000, 5000, 165.60),
  (6000, 2000, 82.80),
  (6000, 2500, 103.50),
  (6000, 3000, 124.20),
  (6000, 3500, 144.90),
  (6000, 4000, 124.20),
  (6000, 4500, 144.90),
  (6000, 5000, 207.00),
  (7000, 2000, 99.36),
  (7000, 2500, 124.20),
  (7000, 3000, 149.04),
  (7000, 3500, 173.88),
  (7000, 4000, 216.00),
  (7000, 4500, 216.00),
  (7000, 5000, 248.40)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 5000, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 5000, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 5000, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 49.68),
  (4000, 2500, 62.10),
  (4000, 3000, 74.52),
  (4000, 3500, 86.94),
  (4000, 4000, 99.36),
  (4000, 4500, 111.78),
  (4000, 5000, 124.20),
  (5000, 2000, 66.24),
  (5000, 2500, 82.80),
  (5000, 3000, 99.36),
  (5000, 3500, 115.92),
  (5000, 4000, 132.48),
  (5000, 4500, 149.04),
  (5000, 5000, 165.60),
  (6000, 2000, 82.80),
  (6000, 2500, 103.50),
  (6000, 3000, 124.20),
  (6000, 3500, 144.90),
  (6000, 4000, 165.60),
  (6000, 4500, 186.30),
  (6000, 5000, 207.00),
  (7000, 2000, 99.36),
  (7000, 2500, 124.20),
  (7000, 3000, 149.04),
  (7000, 3500, 173.88),
  (7000, 4000, 198.72),
  (7000, 4500, 223.56),
  (7000, 5000, 248.40)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4900, 140.94),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4900, 176.18),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 211.42),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4900, 246.65)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 49.68),
  (4000, 2500, 62.10),
  (4000, 3000, 74.52),
  (4000, 3500, 86.94),
  (4000, 4000, 99.36),
  (4000, 4500, 111.78),
  (4000, 4700, 116.75),
  (5000, 2000, 66.24),
  (5000, 2500, 82.80),
  (5000, 3000, 99.36),
  (5000, 3500, 115.92),
  (5000, 4000, 132.48),
  (5000, 4500, 149.04),
  (5000, 4700, 155.66),
  (6000, 2000, 82.80),
  (6000, 2500, 103.50),
  (6000, 3000, 124.20),
  (6000, 3500, 144.90),
  (6000, 4000, 165.60),
  (6000, 4500, 186.30),
  (6000, 4700, 194.58),
  (7000, 2000, 99.36),
  (7000, 2500, 124.20),
  (7000, 3000, 149.04),
  (7000, 3500, 173.88),
  (7000, 4000, 198.72),
  (7000, 4500, 223.56),
  (7000, 4700, 233.50)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 4700, 597.45),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 4700, 746.81),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 4700, 1045.53)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4600, 132.31),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4600, 165.39),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 198.47),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4600, 231.55)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline+ Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- ============= TRENDLINE =============
-- Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80),
  (7950, 2000, 131.65),
  (7950, 2500, 164.77),
  (7950, 3000, 197.06),
  (7950, 3500, 230.18),
  (7950, 4000, 263.30),
  (7950, 4500, 296.42),
  (7950, 5000, 329.54)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26),
  (7950, 2000, 505.29),
  (7950, 2500, 632.40),
  (7950, 3000, 756.34),
  (7950, 3500, 883.46),
  (7950, 4000, 1010.57),
  (7950, 4500, 1137.69),
  (7950, 5000, 1264.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 5000, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 5000, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 5000, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 5000, 251.68),
  (7950, 2000, 114.34),
  (7950, 2500, 143.10),
  (7950, 3000, 171.15),
  (7950, 3500, 199.91),
  (7950, 4000, 228.67),
  (7950, 4500, 257.44),
  (7950, 5000, 286.20)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline Glass Matt Surcharge (Zone 2) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80),
  (7950, 2000, 131.65),
  (7950, 2500, 164.77),
  (7950, 3000, 197.06),
  (7950, 3500, 230.18),
  (7950, 4000, 263.30),
  (7950, 4500, 296.42),
  (7950, 5000, 329.54)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 2) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26),
  (7950, 2000, 505.29),
  (7950, 2500, 632.40),
  (7950, 3000, 756.34),
  (7950, 3500, 883.46),
  (7950, 4000, 1010.57),
  (7950, 4500, 1137.69),
  (7950, 5000, 1264.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 2) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4900, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4900, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4900, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4900, 251.68),
  (7950, 2000, 114.34),
  (7950, 2500, 143.10),
  (7950, 3000, 171.15),
  (7950, 3500, 199.91),
  (7950, 4000, 228.67),
  (7950, 4500, 257.44),
  (7950, 4900, 286.20)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline Glass Matt Surcharge (Zone 3) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 4700, 116.75),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 4700, 155.66),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 4700, 194.58),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 4700, 233.50),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 4700, 272.41),
  (7950, 2000, 131.65),
  (7950, 2500, 164.77),
  (7950, 3000, 197.06),
  (7950, 3500, 230.18),
  (7950, 4000, 263.30),
  (7950, 4500, 296.42),
  (7950, 4700, 309.67)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 3) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 4700, 448.08),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 4700, 597.45),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 4700, 746.81),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 4700, 1045.53),
  (7950, 2000, 505.29),
  (7950, 2500, 632.40),
  (7950, 3000, 756.34),
  (7950, 3500, 883.46),
  (7950, 4000, 1010.57),
  (7950, 4500, 1137.69),
  (7950, 4700, 1188.53)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 3) (42 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4600, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4600, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4600, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4600, 251.68),
  (7950, 2000, 114.34),
  (7950, 2500, 143.10),
  (7950, 3000, 171.15),
  (7950, 3500, 199.91),
  (7950, 4000, 228.67),
  (7950, 4500, 257.44),
  (7950, 4600, 286.20)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- ============= TRENDLINE+ =============
-- Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 5000, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 5000, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 5000, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 2) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4900, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4900, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4900, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 4700, 155.66),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 4700, 194.58),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 4700, 233.50),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 4700, 272.41)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 4700, 597.45),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 4700, 746.81),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 4700, 1045.53)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 3) (28 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4600, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4600, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4600, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- ============= TOPLINE =============
-- Aluxe V2 - Topline Glass Matt Surcharge (Zone 1) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 1) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 1) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 5000, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 5000, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 5000, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 5000, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline Glass Matt Surcharge (Zone 2) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 5000, 124.20),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 5000, 165.60),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 5000, 207.00),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 2) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 5000, 476.68),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 5000, 635.58),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 5000, 794.47),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 2) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4900, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4900, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4900, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4900, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline Glass Matt Surcharge (Zone 3) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 49.68),
  (3000, 2500, 62.10),
  (3000, 3000, 74.52),
  (3000, 3500, 86.94),
  (3000, 4000, 99.36),
  (3000, 4500, 111.78),
  (3000, 4700, 116.75),
  (4000, 2000, 66.24),
  (4000, 2500, 82.80),
  (4000, 3000, 99.36),
  (4000, 3500, 115.92),
  (4000, 4000, 132.48),
  (4000, 4500, 149.04),
  (4000, 4700, 155.66),
  (5000, 2000, 82.80),
  (5000, 2500, 103.50),
  (5000, 3000, 124.20),
  (5000, 3500, 144.90),
  (5000, 4000, 165.60),
  (5000, 4500, 186.30),
  (5000, 4700, 194.58),
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 4700, 233.50),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 4700, 272.41)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 3) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 190.67),
  (3000, 2500, 238.34),
  (3000, 3000, 286.01),
  (3000, 3500, 333.68),
  (3000, 4000, 381.35),
  (3000, 4500, 429.02),
  (3000, 4700, 448.08),
  (4000, 2000, 254.23),
  (4000, 2500, 317.79),
  (4000, 3000, 381.35),
  (4000, 3500, 444.91),
  (4000, 4000, 508.46),
  (4000, 4500, 572.02),
  (4000, 4700, 597.45),
  (5000, 2000, 317.79),
  (5000, 2500, 397.24),
  (5000, 3000, 476.68),
  (5000, 3500, 556.13),
  (5000, 4000, 635.58),
  (5000, 4500, 715.03),
  (5000, 4700, 746.81),
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 4700, 1045.53)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 3) (35 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (3000, 2000, 43.15),
  (3000, 2500, 53.93),
  (3000, 3000, 64.72),
  (3000, 3500, 75.51),
  (3000, 4000, 86.29),
  (3000, 4500, 97.08),
  (3000, 4600, 107.86),
  (4000, 2000, 57.53),
  (4000, 2500, 71.91),
  (4000, 3000, 86.29),
  (4000, 3500, 100.67),
  (4000, 4000, 115.06),
  (4000, 4500, 129.44),
  (4000, 4600, 143.82),
  (5000, 2000, 71.91),
  (5000, 2500, 89.89),
  (5000, 3000, 107.86),
  (5000, 3500, 125.84),
  (5000, 4000, 143.82),
  (5000, 4500, 161.80),
  (5000, 4600, 179.77),
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4600, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- ============= TOPLINE XL =============
-- Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 1) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 1) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 1) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 1)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 1)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 5000, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 5000, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 1)' LIMIT 1
);

-- Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 2) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 5000, 248.40),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 5000, 289.80)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 2) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 5000, 953.37),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 5000, 1112.26)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 2) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 2)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 2)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 2)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4900, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4900, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 2)' LIMIT 1
);

-- Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 3) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 99.36),
  (6000, 2500, 124.20),
  (6000, 3000, 149.04),
  (6000, 3500, 173.88),
  (6000, 4000, 198.72),
  (6000, 4500, 223.56),
  (6000, 4700, 233.50),
  (7000, 2000, 115.92),
  (7000, 2500, 144.90),
  (7000, 3000, 173.88),
  (7000, 3500, 202.86),
  (7000, 4000, 231.84),
  (7000, 4500, 260.82),
  (7000, 4700, 272.41)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Matt Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 3) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 381.35),
  (6000, 2500, 476.68),
  (6000, 3000, 572.02),
  (6000, 3500, 667.36),
  (6000, 4000, 762.70),
  (6000, 4500, 858.03),
  (6000, 4700, 896.17),
  (7000, 2000, 444.91),
  (7000, 2500, 556.13),
  (7000, 3000, 667.36),
  (7000, 3500, 778.59),
  (7000, 4000, 889.81),
  (7000, 4500, 1001.04),
  (7000, 4700, 1045.53)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone 3)' LIMIT 1
);

-- Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 3) (14 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 3)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 3)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 3)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (6000, 2000, 86.29),
  (6000, 2500, 107.86),
  (6000, 3000, 129.44),
  (6000, 3500, 151.01),
  (6000, 4000, 172.58),
  (6000, 4500, 194.16),
  (6000, 4600, 215.73),
  (7000, 2000, 100.67),
  (7000, 2500, 125.84),
  (7000, 3000, 151.01),
  (7000, 3500, 176.18),
  (7000, 4000, 201.35),
  (7000, 4500, 226.52),
  (7000, 4600, 251.68)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone 3)' LIMIT 1
);


-- Verification
SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - %Surcharge%' ORDER BY name;