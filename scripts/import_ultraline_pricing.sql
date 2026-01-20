-- Ultraline Glass Pricing Import (Wall-Mounted)
-- Source: Aluxe Preisliste UPE 2026_DE.xlsx
-- All prices are "inkl. Dacheindeckung" (with glass 44.2/55.2 klar)

BEGIN;

-- ============================
-- ZONE 1
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        -- 4000mm width
        (v_table_id, 4000, 3000, 4124.26),
        (v_table_id, 4000, 3500, 4449.95),
        (v_table_id, 4000, 4000, 4775.65),
        (v_table_id, 4000, 4500, 5101.34),
        (v_table_id, 4000, 5000, 5427.04),
        (v_table_id, 4000, 6000, 6078.43),
        -- 5000mm width
        (v_table_id, 5000, 3000, 4915.68),
        (v_table_id, 5000, 3500, 5314.08),
        (v_table_id, 5000, 4000, 5712.49),
        (v_table_id, 5000, 4500, 6110.89),
        (v_table_id, 5000, 5000, 6509.30),
        (v_table_id, 5000, 6000, 7306.11),
        -- 6000mm width
        (v_table_id, 6000, 3000, 5707.10),
        (v_table_id, 6000, 3500, 6178.21),
        (v_table_id, 6000, 4000, 6649.33),
        (v_table_id, 6000, 4500, 7120.44),
        (v_table_id, 6000, 5000, 7591.56),
        (v_table_id, 6000, 6000, 8879.38),
        -- 7000mm width
        (v_table_id, 7000, 3000, 6498.52),
        (v_table_id, 7000, 3500, 7042.34),
        (v_table_id, 7000, 4000, 7989.37),
        (v_table_id, 7000, 4500, 8533.19),
        (v_table_id, 7000, 5000, 9077.02);
END $$;

-- ============================
-- ZONE 2 (1a & 2)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 2)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        -- 4000mm width
        (v_table_id, 4000, 3000, 4124.26),
        (v_table_id, 4000, 3500, 4449.95),
        (v_table_id, 4000, 4000, 4775.65),
        (v_table_id, 4000, 4500, 5101.34),
        (v_table_id, 4000, 5000, 5427.04),
        (v_table_id, 4000, 6000, 6078.43),
        -- 5000mm width
        (v_table_id, 5000, 3000, 4915.68),
        (v_table_id, 5000, 3500, 5314.08),
        (v_table_id, 5000, 4000, 5712.49),
        (v_table_id, 5000, 4500, 6110.89),
        (v_table_id, 5000, 5000, 6509.30),
        (v_table_id, 5000, 6000, 7306.11),
        -- 6000mm width
        (v_table_id, 6000, 3000, 5707.10),
        (v_table_id, 6000, 3500, 6178.21),
        (v_table_id, 6000, 4000, 6649.33),
        (v_table_id, 6000, 4500, 7120.44),
        (v_table_id, 6000, 5000, 7591.56),
        (v_table_id, 6000, 6000, 8879.38),
        -- 7000mm width
        (v_table_id, 7000, 3000, 6498.52),
        (v_table_id, 7000, 3500, 7042.34),
        (v_table_id, 7000, 4000, 7989.37),
        (v_table_id, 7000, 4500, 8533.19),
        (v_table_id, 7000, 5000, 9077.02),
        (v_table_id, 7000, 6000, 10014.40);
END $$;

-- ============================
-- ZONE 3 (2a & 3)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 3)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        -- 4000mm width
        (v_table_id, 4000, 3000, 4186.36),
        (v_table_id, 4000, 3500, 4522.40),
        (v_table_id, 4000, 4000, 4858.45),
        (v_table_id, 4000, 4500, 5194.49),
        (v_table_id, 4000, 5000, 5530.54),
        (v_table_id, 4000, 6000, 6202.63),
        -- 5000mm width
        (v_table_id, 5000, 3000, 4993.30),
        (v_table_id, 5000, 3500, 5404.65),
        (v_table_id, 5000, 4000, 5815.99),
        (v_table_id, 5000, 4500, 6227.33),
        (v_table_id, 5000, 5000, 6638.67),
        (v_table_id, 5000, 6000, 7461.36),
        -- 6000mm width
        (v_table_id, 6000, 3000, 5800.25),
        (v_table_id, 6000, 3500, 6286.89),
        (v_table_id, 6000, 4000, 6773.53),
        (v_table_id, 6000, 4500, 7260.17),
        (v_table_id, 6000, 5000, 8092.41),
        (v_table_id, 6000, 6000, 9065.68),
        -- 7000mm width
        (v_table_id, 7000, 3000, 7010.40),
        (v_table_id, 7000, 3500, 7572.33),
        (v_table_id, 7000, 4000, 8134.27),
        (v_table_id, 7000, 4500, 8545.95),
        (v_table_id, 7000, 5000, 9107.88),
        (v_table_id, 7000, 6000, 10231.75);
END $$;

-- ============================
-- FREESTANDING TABLES (Copy from Wall with same prices - Ultraline is the same for freestanding)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Freestanding Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Freestanding Glass (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":1,"construction_type":"freestanding","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 4000, 3000, 4124.26),
        (v_table_id, 4000, 3500, 4449.95),
        (v_table_id, 4000, 4000, 4775.65),
        (v_table_id, 4000, 4500, 5101.34),
        (v_table_id, 4000, 5000, 5427.04),
        (v_table_id, 4000, 6000, 6078.43),
        (v_table_id, 5000, 3000, 4915.68),
        (v_table_id, 5000, 3500, 5314.08),
        (v_table_id, 5000, 4000, 5712.49),
        (v_table_id, 5000, 4500, 6110.89),
        (v_table_id, 5000, 5000, 6509.30),
        (v_table_id, 5000, 6000, 7306.11),
        (v_table_id, 6000, 3000, 5707.10),
        (v_table_id, 6000, 3500, 6178.21),
        (v_table_id, 6000, 4000, 6649.33),
        (v_table_id, 6000, 4500, 7120.44),
        (v_table_id, 6000, 5000, 7591.56),
        (v_table_id, 6000, 6000, 8879.38),
        (v_table_id, 7000, 3000, 6498.52),
        (v_table_id, 7000, 3500, 7042.34),
        (v_table_id, 7000, 4000, 7989.37),
        (v_table_id, 7000, 4500, 8533.19),
        (v_table_id, 7000, 5000, 9077.02);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Freestanding Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Freestanding Glass (Zone 2)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":2,"construction_type":"freestanding","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 4000, 3000, 4124.26),
        (v_table_id, 4000, 3500, 4449.95),
        (v_table_id, 4000, 4000, 4775.65),
        (v_table_id, 4000, 4500, 5101.34),
        (v_table_id, 4000, 5000, 5427.04),
        (v_table_id, 4000, 6000, 6078.43),
        (v_table_id, 5000, 3000, 4915.68),
        (v_table_id, 5000, 3500, 5314.08),
        (v_table_id, 5000, 4000, 5712.49),
        (v_table_id, 5000, 4500, 6110.89),
        (v_table_id, 5000, 5000, 6509.30),
        (v_table_id, 5000, 6000, 7306.11),
        (v_table_id, 6000, 3000, 5707.10),
        (v_table_id, 6000, 3500, 6178.21),
        (v_table_id, 6000, 4000, 6649.33),
        (v_table_id, 6000, 4500, 7120.44),
        (v_table_id, 6000, 5000, 7591.56),
        (v_table_id, 6000, 6000, 8879.38),
        (v_table_id, 7000, 3000, 6498.52),
        (v_table_id, 7000, 3500, 7042.34),
        (v_table_id, 7000, 4000, 7989.37),
        (v_table_id, 7000, 4500, 8533.19),
        (v_table_id, 7000, 5000, 9077.02),
        (v_table_id, 7000, 6000, 10014.40);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Freestanding Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Freestanding Glass (Zone 3)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":3,"construction_type":"freestanding","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 4000, 3000, 4186.36),
        (v_table_id, 4000, 3500, 4522.40),
        (v_table_id, 4000, 4000, 4858.45),
        (v_table_id, 4000, 4500, 5194.49),
        (v_table_id, 4000, 5000, 5530.54),
        (v_table_id, 4000, 6000, 6202.63),
        (v_table_id, 5000, 3000, 4993.30),
        (v_table_id, 5000, 3500, 5404.65),
        (v_table_id, 5000, 4000, 5815.99),
        (v_table_id, 5000, 4500, 6227.33),
        (v_table_id, 5000, 5000, 6638.67),
        (v_table_id, 5000, 6000, 7461.36),
        (v_table_id, 6000, 3000, 5800.25),
        (v_table_id, 6000, 3500, 6286.89),
        (v_table_id, 6000, 4000, 6773.53),
        (v_table_id, 6000, 4500, 7260.17),
        (v_table_id, 6000, 5000, 8092.41),
        (v_table_id, 6000, 6000, 9065.68),
        (v_table_id, 7000, 3000, 7010.40),
        (v_table_id, 7000, 3500, 7572.33),
        (v_table_id, 7000, 4000, 8134.27),
        (v_table_id, 7000, 4500, 8545.95),
        (v_table_id, 7000, 5000, 9107.88),
        (v_table_id, 7000, 6000, 10231.75);
END $$;

-- Verification
SELECT 'Created Ultraline Tables:' as status;
SELECT name, 
       (SELECT COUNT(*) FROM price_matrix_entries WHERE price_table_id = pt.id) as entries
FROM price_tables pt 
WHERE name LIKE 'Aluxe V2 - Ultraline%Glass%'
ORDER BY name;

COMMIT;
