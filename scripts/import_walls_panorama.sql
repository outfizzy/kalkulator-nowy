-- Walls & Panorama V2 Import (FIXED)
-- Generated: 2026-01-19T21:12:46.591Z

-- 1. Product definitions
INSERT INTO product_definitions (code, name, category, provider, description) VALUES
  ('aluxe_v2_walls', 'Aluxe V2 - Walls', 'sliding_wall', 'Aluxe', 'Wall enclosures and doors')
ON CONFLICT (code) DO NOTHING;

-- ============= SIDE WALL (SEITENWAND) =============
-- Aluxe V2 - Side Wall (Glass) (5 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Side Wall (Glass)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Side Wall (Glass)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Side Wall (Glass)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (0, 3000, 1163.37),
  (0, 3500, 1371.79),
  (0, 4000, 1466.52),
  (0, 4500, 1672.10),
  (0, 5000, 1768.73)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Side Wall (Glass)' LIMIT 1
);

-- ============= FRONT WALL (FRONTWAND) =============
-- Aluxe V2 - Front Wall (Glass) (3 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Front Wall (Glass)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Front Wall (Glass)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Front Wall (Glass)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (5000, 0, 1514.84),
  (6000, 0, 1653.16),
  (7000, 0, 1861.58)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Front Wall (Glass)' LIMIT 1
);

-- ============= WEDGE WINDOW (KEILFENSTER) =============
-- Aluxe V2 - Wedge (Glass) (3 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Wedge (Glass)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (0, 4000, 678.31),
  (0, 4500, 720.94),
  (0, 5000, 765.48)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Wedge (Glass)' LIMIT 1
);

-- ============= SLIDING DOOR (SCHIEBETÜR) =============
-- Aluxe V2 - Schiebetür (VSG klar) (9 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Schiebetür (VSG klar)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (VSG klar)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (VSG klar)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (2000, 0, 1198.42),
  (2500, 0, 1286.52),
  (3000, 0, 1817.05),
  (3500, 0, 1932.63),
  (4000, 0, 2053.90),
  (4500, 0, 2174.21),
  (5000, 0, 2376.00),
  (5500, 0, 2922.63),
  (6000, 0, 3107.37)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Schiebetür (VSG klar)' LIMIT 1
);

-- Aluxe V2 - Schiebetür (VSG matt) (9 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Schiebetür (VSG matt)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (VSG matt)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (VSG matt)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (2000, 0, 1217.80),
  (2500, 0, 1310.74),
  (3000, 0, 1846.12),
  (3500, 0, 1966.54),
  (4000, 0, 2092.65),
  (4500, 0, 2217.81),
  (5000, 0, 2424.44),
  (5500, 0, 2975.91),
  (6000, 0, 3165.49)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Schiebetür (VSG matt)' LIMIT 1
);

-- Aluxe V2 - Schiebetür (Isolierglas) (9 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Schiebetür (Isolierglas)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (Isolierglas)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Schiebetür (Isolierglas)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (2000, 0, 1391.88),
  (2500, 0, 1528.34),
  (3000, 0, 2107.24),
  (3500, 0, 2271.18),
  (4000, 0, 2440.81),
  (4500, 0, 2609.49),
  (5000, 0, 2859.64),
  (5500, 0, 3454.64),
  (6000, 0, 3687.74)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Schiebetür (Isolierglas)' LIMIT 1
);

-- ============= PANORAMA SLIDING WALLS =============
-- Aluxe V2 - Panorama AL22 (3-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL22 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (3-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (3-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 241.58)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL22 (3-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL22 (5-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL22 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (5-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (5-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 251.05)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL22 (5-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL23 (3-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL23 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (3-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (3-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 260.52)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL23 (3-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL23 (5-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL23 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (5-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (5-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 265.27)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL23 (5-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL23 (7-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL23 (7-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (7-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (7-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 270.00)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL23 (7-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL24 (3-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL24 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (3-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (3-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 241.58)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL24 (3-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL24 (5-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL24 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (5-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (5-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 246.31)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL24 (5-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL25 (3-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL25 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (3-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (3-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 279.48)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL25 (3-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL25 (5-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL25 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (5-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (5-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 288.95)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL25 (5-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL26 (3-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL26 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (3-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (3-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 260.52)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL26 (3-Tor)' LIMIT 1
);

-- Aluxe V2 - Panorama AL26 (5-Tor) (1 entries)
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Panorama AL26 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (5-Tor)');

WITH table_id AS (SELECT id FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (5-Tor)')
INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES
  (850, 0, 265.27)
) AS t(width_mm, projection_mm, price)
WHERE NOT EXISTS (
    SELECT 1 FROM price_matrix_entries pme
    JOIN price_tables pt ON pme.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Panorama AL26 (5-Tor)' LIMIT 1
);

-- Verification
SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Side Wall%' OR name LIKE 'Aluxe V2 - Front Wall%' OR name LIKE 'Aluxe V2 - Wedge%' OR name LIKE 'Aluxe V2 - Schiebetür%' OR name LIKE 'Aluxe V2 - Panorama%' ORDER BY name;