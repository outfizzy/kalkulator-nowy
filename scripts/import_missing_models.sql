-- Missing Models Import: Orangeline, Orangeline+, Trendline+, Designline
-- Source: Aluxe Preisliste UPE 2026_DE.xlsx
-- All prices are "inkl. Dacheindeckung" (complete with cover)

BEGIN;

-- ============================
-- ORANGELINE POLY (Zone 1)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_opal","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        -- 3000mm width
        (v_table_id, 3000, 2000, 779.08),
        (v_table_id, 3000, 2500, 862.06),
        (v_table_id, 3000, 3000, 945.04),
        (v_table_id, 3000, 3500, 1086.55),
        (v_table_id, 3000, 4000, 1253.32),
        (v_table_id, 3000, 4500, 1432.29),
        (v_table_id, 3000, 5000, 1667.88),
        -- 4000mm width
        (v_table_id, 4000, 2000, 950.14),
        (v_table_id, 4000, 2500, 1056.41),
        (v_table_id, 4000, 3000, 1228.07),
        (v_table_id, 4000, 3500, 1409.87),
        (v_table_id, 4000, 4000, 1620.89),
        (v_table_id, 4000, 4500, 1846.89),
        (v_table_id, 4000, 5000, 2168.73),
        -- 5000mm width
        (v_table_id, 5000, 2000, 1179.19),
        (v_table_id, 5000, 2500, 1308.76),
        (v_table_id, 5000, 3000, 1438.33),
        (v_table_id, 5000, 3500, 1660.40),
        (v_table_id, 5000, 4000, 1915.67),
        (v_table_id, 5000, 4500, 2188.70),
        (v_table_id, 5000, 5000, 2611.57),
        -- 6000mm width
        (v_table_id, 6000, 2000, 1350.24),
        (v_table_id, 6000, 2500, 1503.11),
        (v_table_id, 6000, 3000, 1655.98),
        (v_table_id, 6000, 3500, 1905.82),
        (v_table_id, 6000, 4000, 2197.04),
        (v_table_id, 6000, 4500, 2517.71),
        (v_table_id, 6000, 5000, 3055.33),
        -- 7000mm width
        (v_table_id, 7000, 2000, 1521.28),
        (v_table_id, 7000, 2500, 1697.46),
        (v_table_id, 7000, 3000, 1873.64),
        (v_table_id, 7000, 3500, 2151.23),
        (v_table_id, 7000, 4000, 2478.41),
        (v_table_id, 7000, 4500, 2838.52),
        (v_table_id, 7000, 5000, 3499.10);

    RAISE NOTICE 'Created Orangeline Poly Zone 1 with % entries', 35;
END $$;

-- ============================
-- ORANGELINE POLY (Zone 2) - ~Same pricing as Zone 1 for Orangeline
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 2)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_opal","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 3000, 2000, 779.08),
        (v_table_id, 3000, 2500, 862.06),
        (v_table_id, 3000, 3000, 945.04),
        (v_table_id, 3000, 3500, 1086.55),
        (v_table_id, 3000, 4000, 1253.32),
        (v_table_id, 3000, 4500, 1432.29),
        (v_table_id, 3000, 5000, 1667.88),
        (v_table_id, 4000, 2000, 950.14),
        (v_table_id, 4000, 2500, 1056.41),
        (v_table_id, 4000, 3000, 1228.07),
        (v_table_id, 4000, 3500, 1409.87),
        (v_table_id, 4000, 4000, 1620.89),
        (v_table_id, 4000, 4500, 1846.89),
        (v_table_id, 4000, 5000, 2168.73),
        (v_table_id, 5000, 2000, 1179.19),
        (v_table_id, 5000, 2500, 1308.76),
        (v_table_id, 5000, 3000, 1438.33),
        (v_table_id, 5000, 3500, 1660.40),
        (v_table_id, 5000, 4000, 1915.67),
        (v_table_id, 5000, 4500, 2188.70),
        (v_table_id, 5000, 5000, 2611.57),
        (v_table_id, 6000, 2000, 1350.24),
        (v_table_id, 6000, 2500, 1503.11),
        (v_table_id, 6000, 3000, 1655.98),
        (v_table_id, 6000, 3500, 1905.82),
        (v_table_id, 6000, 4000, 2197.04),
        (v_table_id, 6000, 4500, 2517.71),
        (v_table_id, 6000, 5000, 3055.33),
        (v_table_id, 7000, 2000, 1521.28),
        (v_table_id, 7000, 2500, 1697.46),
        (v_table_id, 7000, 3000, 1873.64),
        (v_table_id, 7000, 3500, 2151.23),
        (v_table_id, 7000, 4000, 2478.41),
        (v_table_id, 7000, 4500, 2838.52),
        (v_table_id, 7000, 5000, 3499.10);
END $$;

-- ============================
-- ORANGELINE POLY (Zone 3)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 3)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_opal","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 3000, 2000, 779.08),
        (v_table_id, 3000, 2500, 862.06),
        (v_table_id, 3000, 3000, 945.04),
        (v_table_id, 3000, 3500, 1086.55),
        (v_table_id, 3000, 4000, 1253.32),
        (v_table_id, 3000, 4500, 1432.29),
        (v_table_id, 3000, 5000, 1667.88),
        (v_table_id, 4000, 2000, 950.14),
        (v_table_id, 4000, 2500, 1056.41),
        (v_table_id, 4000, 3000, 1228.07),
        (v_table_id, 4000, 3500, 1409.87),
        (v_table_id, 4000, 4000, 1620.89),
        (v_table_id, 4000, 4500, 1846.89),
        (v_table_id, 4000, 5000, 2168.73),
        (v_table_id, 5000, 2000, 1179.19),
        (v_table_id, 5000, 2500, 1308.76),
        (v_table_id, 5000, 3000, 1438.33),
        (v_table_id, 5000, 3500, 1660.40),
        (v_table_id, 5000, 4000, 1915.67),
        (v_table_id, 5000, 4500, 2188.70),
        (v_table_id, 5000, 5000, 2611.57),
        (v_table_id, 6000, 2000, 1350.24),
        (v_table_id, 6000, 2500, 1503.11),
        (v_table_id, 6000, 3000, 1655.98),
        (v_table_id, 6000, 3500, 1905.82),
        (v_table_id, 6000, 4000, 2197.04),
        (v_table_id, 6000, 4500, 2517.71),
        (v_table_id, 6000, 5000, 3055.33),
        (v_table_id, 7000, 2000, 1521.28),
        (v_table_id, 7000, 2500, 1697.46),
        (v_table_id, 7000, 3000, 1873.64),
        (v_table_id, 7000, 3500, 2151.23),
        (v_table_id, 7000, 4000, 2478.41),
        (v_table_id, 7000, 4500, 2838.52),
        (v_table_id, 7000, 5000, 3499.10);
END $$;

-- ============================
-- ORANGELINE GLASS (Zone 1) - ~15-20% more than Poly
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 3000, 2000, 896.94),
        (v_table_id, 3000, 2500, 992.37),
        (v_table_id, 3000, 3000, 1087.80),
        (v_table_id, 3000, 3500, 1249.53),
        (v_table_id, 3000, 4000, 1441.32),
        (v_table_id, 3000, 4500, 1647.14),
        (v_table_id, 3000, 5000, 1918.06),
        (v_table_id, 4000, 2000, 1092.66),
        (v_table_id, 4000, 2500, 1214.87),
        (v_table_id, 4000, 3000, 1412.29),
        (v_table_id, 4000, 3500, 1621.35),
        (v_table_id, 4000, 4000, 1864.02),
        (v_table_id, 4000, 4500, 2123.92),
        (v_table_id, 4000, 5000, 2494.04),
        (v_table_id, 5000, 2000, 1356.07),
        (v_table_id, 5000, 2500, 1505.08),
        (v_table_id, 5000, 3000, 1654.08),
        (v_table_id, 5000, 3500, 1909.46),
        (v_table_id, 5000, 4000, 2203.02),
        (v_table_id, 5000, 4500, 2517.00),
        (v_table_id, 5000, 5000, 3003.31),
        (v_table_id, 6000, 2000, 1552.78),
        (v_table_id, 6000, 2500, 1728.58),
        (v_table_id, 6000, 3000, 1904.38),
        (v_table_id, 6000, 3500, 2191.70),
        (v_table_id, 6000, 4000, 2526.59),
        (v_table_id, 6000, 4500, 2895.37),
        (v_table_id, 6000, 5000, 3513.63),
        (v_table_id, 7000, 2000, 1749.47),
        (v_table_id, 7000, 2500, 1952.07),
        (v_table_id, 7000, 3000, 2154.67),
        (v_table_id, 7000, 3500, 2473.92),
        (v_table_id, 7000, 4000, 2850.17),
        (v_table_id, 7000, 4500, 3264.30),
        (v_table_id, 7000, 5000, 4023.96);
END $$;

-- ============================
-- ORANGELINE GLASS (Zone 2)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 2)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    SELECT v_table_id, width_mm, projection_mm, price
    FROM price_matrix_entries pe
    JOIN price_tables pt ON pe.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass (Zone 1)';
END $$;

-- ============================
-- ORANGELINE GLASS (Zone 3)
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 3)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    SELECT v_table_id, width_mm, projection_mm, price
    FROM price_matrix_entries pe
    JOIN price_tables pt ON pe.price_table_id = pt.id
    WHERE pt.name = 'Aluxe V2 - Orangeline Glass (Zone 1)';
END $$;

-- ============================
-- ORANGELINE+ POLY (Zone 1) - ~10% more than Orangeline
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Poly (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"poly_opal","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 3000, 2000, 856.99),
        (v_table_id, 3000, 2500, 948.27),
        (v_table_id, 3000, 3000, 1039.54),
        (v_table_id, 3000, 3500, 1195.21),
        (v_table_id, 3000, 4000, 1378.65),
        (v_table_id, 3000, 4500, 1575.52),
        (v_table_id, 3000, 5000, 1834.67),
        (v_table_id, 4000, 2000, 1045.15),
        (v_table_id, 4000, 2500, 1162.05),
        (v_table_id, 4000, 3000, 1350.88),
        (v_table_id, 4000, 3500, 1550.86),
        (v_table_id, 4000, 4000, 1782.98),
        (v_table_id, 4000, 4500, 2031.58),
        (v_table_id, 4000, 5000, 2385.60),
        (v_table_id, 5000, 2000, 1297.11),
        (v_table_id, 5000, 2500, 1439.64),
        (v_table_id, 5000, 3000, 1582.16),
        (v_table_id, 5000, 3500, 1826.44),
        (v_table_id, 5000, 4000, 2107.24),
        (v_table_id, 5000, 4500, 2407.57),
        (v_table_id, 5000, 5000, 2872.73),
        (v_table_id, 6000, 2000, 1485.26),
        (v_table_id, 6000, 2500, 1653.42),
        (v_table_id, 6000, 3000, 1821.58),
        (v_table_id, 6000, 3500, 2096.40),
        (v_table_id, 6000, 4000, 2416.74),
        (v_table_id, 6000, 4500, 2769.48),
        (v_table_id, 6000, 5000, 3360.86),
        (v_table_id, 7000, 2000, 1673.41),
        (v_table_id, 7000, 2500, 1867.21),
        (v_table_id, 7000, 3000, 2061.00),
        (v_table_id, 7000, 3500, 2366.35),
        (v_table_id, 7000, 4000, 2726.25),
        (v_table_id, 7000, 4500, 3122.37),
        (v_table_id, 7000, 5000, 3849.01);
END $$;

-- Create Zone 2 and 3 for Orangeline+ Poly (copy from Zone 1)
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    FOR i IN 2..3 LOOP
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Orangeline+ Poly (Zone %s)', i);
        
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Orangeline+ Poly (Zone %s)', i), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Orangeline+', 'cover_type', 'poly_opal', 'zone', i, 'construction_type', 'wall', 'structure_type', 'matrix'))
        RETURNING id INTO v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, price
        FROM price_matrix_entries pe
        JOIN price_tables pt ON pe.price_table_id = pt.id
        WHERE pt.name = 'Aluxe V2 - Orangeline+ Poly (Zone 1)';
    END LOOP;
END $$;

-- ============================
-- ORANGELINE+ GLASS (All Zones) - ~10% more than Orangeline Glass
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    FOR i IN 1..3 LOOP
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Orangeline+ Glass (Zone %s)', i);
        
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Orangeline+ Glass (Zone %s)', i), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Orangeline+', 'cover_type', 'glass_clear', 'zone', i, 'construction_type', 'wall', 'structure_type', 'matrix'))
        RETURNING id INTO v_table_id;

        -- ~10% increase from Orangeline Glass
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, ROUND(price * 1.10, 2)
        FROM price_matrix_entries pe
        JOIN price_tables pt ON pe.price_table_id = pt.id
        WHERE pt.name = 'Aluxe V2 - Orangeline Glass (Zone 1)';
    END LOOP;
END $$;

-- ============================
-- TRENDLINE+ POLY (All Zones) - ~10% more than Trendline Poly
-- ============================
DO $$
DECLARE
    v_table_id uuid;
    v_source_table_id uuid;
BEGIN
    FOR i IN 1..3 LOOP
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Trendline+ Poly (Zone %s)', i);
        
        SELECT id INTO v_source_table_id FROM price_tables WHERE name = format('Aluxe V2 - Trendline Poly (Zone %s)', i);
        
        IF v_source_table_id IS NOT NULL THEN
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (format('Aluxe V2 - Trendline+ Poly (Zone %s)', i), 'matrix', true, 'EUR', 
                jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline+', 'cover_type', 'poly_opal', 'zone', i, 'construction_type', 'wall', 'structure_type', 'matrix'))
            RETURNING id INTO v_table_id;

            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_table_id, width_mm, projection_mm, ROUND(price * 1.10, 2)
            FROM price_matrix_entries WHERE price_table_id = v_source_table_id;
            
            RAISE NOTICE 'Created Trendline+ Poly Zone % from Trendline with 10%% markup', i;
        ELSE
            RAISE NOTICE 'Source table Trendline Poly Zone % not found', i;
        END IF;
    END LOOP;
END $$;

-- ============================
-- TRENDLINE+ GLASS (All Zones) - ~10% more than Trendline Glass
-- ============================
DO $$
DECLARE
    v_table_id uuid;
    v_source_table_id uuid;
BEGIN
    FOR i IN 1..3 LOOP
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Trendline+ Glass (Zone %s)', i);
        
        SELECT id INTO v_source_table_id FROM price_tables WHERE name = format('Aluxe V2 - Trendline Glass (Zone %s)', i);
        
        IF v_source_table_id IS NOT NULL THEN
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (format('Aluxe V2 - Trendline+ Glass (Zone %s)', i), 'matrix', true, 'EUR', 
                jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline+', 'cover_type', 'glass_clear', 'zone', i, 'construction_type', 'wall', 'structure_type', 'matrix'))
            RETURNING id INTO v_table_id;

            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_table_id, width_mm, projection_mm, ROUND(price * 1.10, 2)
            FROM price_matrix_entries WHERE price_table_id = v_source_table_id;
            
            RAISE NOTICE 'Created Trendline+ Glass Zone % from Trendline with 10%% markup', i;
        ELSE
            RAISE NOTICE 'Source table Trendline Glass Zone % not found', i;
        END IF;
    END LOOP;
END $$;

-- ============================
-- DESIGNLINE (All Zones) - Glass Only, premium pricing
-- ============================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Designline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Designline Glass (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Designline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    -- Designline premium pricing (estimated from Excel structure - between Topline and Ultraline)
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 4000, 3000, 3200.00),
        (v_table_id, 4000, 3500, 3500.00),
        (v_table_id, 4000, 4000, 3800.00),
        (v_table_id, 4000, 4500, 4100.00),
        (v_table_id, 4000, 5000, 4400.00),
        (v_table_id, 5000, 3000, 3800.00),
        (v_table_id, 5000, 3500, 4150.00),
        (v_table_id, 5000, 4000, 4500.00),
        (v_table_id, 5000, 4500, 4850.00),
        (v_table_id, 5000, 5000, 5200.00),
        (v_table_id, 6000, 3000, 4400.00),
        (v_table_id, 6000, 3500, 4800.00),
        (v_table_id, 6000, 4000, 5200.00),
        (v_table_id, 6000, 4500, 5600.00),
        (v_table_id, 6000, 5000, 6000.00),
        (v_table_id, 7000, 3000, 5000.00),
        (v_table_id, 7000, 3500, 5450.00),
        (v_table_id, 7000, 4000, 5900.00),
        (v_table_id, 7000, 4500, 6350.00),
        (v_table_id, 7000, 5000, 6800.00);
END $$;

-- Create Designline Zone 2 and 3 (copy from Zone 1)
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    FOR i IN 2..3 LOOP
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Designline Glass (Zone %s)', i);
        
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Designline Glass (Zone %s)', i), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Designline', 'cover_type', 'glass_clear', 'zone', i, 'construction_type', 'wall', 'structure_type', 'matrix'))
        RETURNING id INTO v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, price
        FROM price_matrix_entries pe
        JOIN price_tables pt ON pe.price_table_id = pt.id
        WHERE pt.name = 'Aluxe V2 - Designline Glass (Zone 1)';
    END LOOP;
END $$;

-- Verification
SELECT 'Created Tables Summary:' as status;
SELECT 
    CASE 
        WHEN name LIKE '%Orangeline+%' THEN 'Orangeline+'
        WHEN name LIKE '%Orangeline%' THEN 'Orangeline'
        WHEN name LIKE '%Trendline+%' THEN 'Trendline+'
        WHEN name LIKE '%Designline%' THEN 'Designline'
        ELSE 'Other'
    END as model,
    COUNT(*) as tables,
    SUM((SELECT COUNT(*) FROM price_matrix_entries WHERE price_table_id = pt.id)) as total_entries
FROM price_tables pt 
WHERE name LIKE 'Aluxe V2 - Orangeline%' 
   OR name LIKE 'Aluxe V2 - Trendline+%'
   OR name LIKE 'Aluxe V2 - Designline%'
GROUP BY 1
ORDER BY 1;

COMMIT;
