
-- Aluxe V2 Import Script
-- Generated: 2026-01-19T10:41:43.196Z

BEGIN;
    

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
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
(v_table_id, 6000, 3500, 1918.33),
(v_table_id, 6000, 4000, 2217.84),
(v_table_id, 6000, 4500, 2537.90),
(v_table_id, 6000, 5000, 3054.42)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 779.08),
(v_table_id, 3000, 2500, 862.06),
(v_table_id, 3000, 3000, 999.99),
(v_table_id, 3000, 3500, 1086.55),
(v_table_id, 3000, 4000, 1325.48),
(v_table_id, 3000, 4500, 1547.93),
(v_table_id, 3000, 4900, 1661.63),
(v_table_id, 4000, 2000, 950.14),
(v_table_id, 4000, 2500, 1121.80),
(v_table_id, 4000, 3000, 1299.11),
(v_table_id, 4000, 3500, 1409.87),
(v_table_id, 4000, 4000, 1703.42),
(v_table_id, 4000, 4500, 2012.94),
(v_table_id, 4000, 4900, 2160.39),
(v_table_id, 5000, 2000, 1179.19),
(v_table_id, 5000, 2500, 1308.76),
(v_table_id, 5000, 3000, 1525.46),
(v_table_id, 5000, 3500, 1660.40),
(v_table_id, 5000, 4000, 2023.37),
(v_table_id, 5000, 4500, 2419.96),
(v_table_id, 5000, 4900, 2601.15),
(v_table_id, 6000, 2000, 1350.24),
(v_table_id, 6000, 2500, 1503.11),
(v_table_id, 6000, 3000, 1759.19),
(v_table_id, 6000, 3500, 1918.33),
(v_table_id, 6000, 4000, 2343.31),
(v_table_id, 6000, 4500, 2826.98),
(v_table_id, 6000, 4900, 3041.91)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 779.08),
(v_table_id, 3000, 2500, 862.06),
(v_table_id, 3000, 3000, 999.99),
(v_table_id, 3000, 3500, 1156.68),
(v_table_id, 3000, 4000, 1325.48),
(v_table_id, 3000, 4500, 1613.32),
(v_table_id, 3000, 4600, 1708.26),
(v_table_id, 4000, 2000, 1015.52),
(v_table_id, 4000, 2500, 1121.80),
(v_table_id, 4000, 3000, 1299.11),
(v_table_id, 4000, 3500, 1490.13),
(v_table_id, 4000, 4000, 1703.42),
(v_table_id, 4000, 4500, 2012.94),
(v_table_id, 4000, 4600, 2135.38),
(v_table_id, 5000, 2000, 1179.19),
(v_table_id, 5000, 2500, 1308.76),
(v_table_id, 5000, 3000, 1525.46),
(v_table_id, 5000, 3500, 1765.59),
(v_table_id, 5000, 4000, 2023.37),
(v_table_id, 5000, 4500, 2419.96),
(v_table_id, 5000, 4600, 2569.89),
(v_table_id, 6000, 2000, 1350.24),
(v_table_id, 6000, 2500, 1503.11),
(v_table_id, 6000, 3000, 1759.19),
(v_table_id, 6000, 3500, 2041.05),
(v_table_id, 6000, 4000, 2343.31),
(v_table_id, 6000, 4500, 2826.98),
(v_table_id, 6000, 4600, 3004.39)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 920.02),
(v_table_id, 3000, 2500, 1037.82),
(v_table_id, 3000, 3000, 1155.62),
(v_table_id, 3000, 3500, 1339.57),
(v_table_id, 3000, 4000, 1562.12),
(v_table_id, 3000, 4500, 1801.77),
(v_table_id, 3000, 5000, 2207.92),
(v_table_id, 4000, 2000, 1119.64),
(v_table_id, 4000, 2500, 1333.16),
(v_table_id, 4000, 3000, 1481.28),
(v_table_id, 4000, 3500, 1712.53),
(v_table_id, 4000, 4000, 1978.96),
(v_table_id, 4000, 4500, 2272.66),
(v_table_id, 4000, 5000, 2714.09),
(v_table_id, 5000, 2000, 1432.47),
(v_table_id, 5000, 2500, 1624.68),
(v_table_id, 5000, 3000, 1816.89),
(v_table_id, 5000, 3500, 2116.80),
(v_table_id, 5000, 4000, 2476.60),
(v_table_id, 5000, 4500, 2863.96),
(v_table_id, 5000, 5000, 3490.16),
(v_table_id, 6000, 2000, 1632.10),
(v_table_id, 6000, 2500, 1854.63),
(v_table_id, 6000, 3000, 2077.16),
(v_table_id, 6000, 3500, 2424.37),
(v_table_id, 6000, 4000, 2835.44),
(v_table_id, 6000, 4500, 3276.85),
(v_table_id, 6000, 5000, 4003.71)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 920.02),
(v_table_id, 3000, 2500, 1037.82),
(v_table_id, 3000, 3000, 1155.62),
(v_table_id, 3000, 3500, 1339.57),
(v_table_id, 3000, 4000, 1562.12),
(v_table_id, 3000, 4500, 1801.77),
(v_table_id, 3000, 5000, 2207.92),
(v_table_id, 4000, 2000, 1185.03),
(v_table_id, 4000, 2500, 1333.16),
(v_table_id, 4000, 3000, 1481.28),
(v_table_id, 4000, 3500, 1705.14),
(v_table_id, 4000, 4000, 1978.96),
(v_table_id, 4000, 4500, 2272.66),
(v_table_id, 4000, 5000, 2714.09),
(v_table_id, 5000, 2000, 1432.47),
(v_table_id, 5000, 2500, 1624.68),
(v_table_id, 5000, 3000, 1816.89),
(v_table_id, 5000, 3500, 2116.80),
(v_table_id, 5000, 4000, 2476.60),
(v_table_id, 5000, 4500, 2863.96),
(v_table_id, 5000, 5000, 3490.16),
(v_table_id, 6000, 2000, 1632.10),
(v_table_id, 6000, 2500, 1854.63),
(v_table_id, 6000, 3000, 2077.16),
(v_table_id, 6000, 3500, 2424.37),
(v_table_id, 6000, 4000, 2835.44),
(v_table_id, 6000, 4500, 3276.85),
(v_table_id, 6000, 5000, 4003.71)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 951.07),
(v_table_id, 3000, 2500, 1076.63),
(v_table_id, 3000, 3000, 1263.86),
(v_table_id, 3000, 3500, 1481.57),
(v_table_id, 3000, 4000, 1781.65),
(v_table_id, 3000, 4500, 2110.47),
(v_table_id, 3000, 4700, 2251.08),
(v_table_id, 4000, 2000, 1226.43),
(v_table_id, 4000, 2500, 1384.91),
(v_table_id, 4000, 3000, 1613.74),
(v_table_id, 4000, 3500, 1882.78),
(v_table_id, 4000, 4000, 2171.57),
(v_table_id, 4000, 4500, 2597.07),
(v_table_id, 4000, 4700, 2771.63),
(v_table_id, 5000, 2000, 1484.22),
(v_table_id, 5000, 2500, 1689.37),
(v_table_id, 5000, 3000, 1995.05),
(v_table_id, 5000, 3500, 2347.61),
(v_table_id, 5000, 4000, 2727.57),
(v_table_id, 5000, 4500, 3327.29),
(v_table_id, 5000, 4700, 3562.09),
(v_table_id, 6000, 2000, 1694.20),
(v_table_id, 6000, 2500, 1932.26),
(v_table_id, 6000, 3000, 2286.93),
(v_table_id, 6000, 3500, 2690.82),
(v_table_id, 6000, 4000, 3124.88),
(v_table_id, 6000, 4500, 3821.28),
(v_table_id, 6000, 4700, 4090.03)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1056.30),
(v_table_id, 4000, 2500, 1162.57),
(v_table_id, 4000, 3000, 1268.85),
(v_table_id, 4000, 3500, 1450.64),
(v_table_id, 4000, 4000, 1661.66),
(v_table_id, 4000, 4500, 1887.66),
(v_table_id, 4000, 5000, 2216.89),
(v_table_id, 5000, 2000, 1254.17),
(v_table_id, 5000, 2500, 1383.75),
(v_table_id, 5000, 3000, 1513.32),
(v_table_id, 5000, 3500, 1857.05),
(v_table_id, 5000, 4000, 2112.32),
(v_table_id, 5000, 4500, 2385.35),
(v_table_id, 5000, 5000, 2744.56),
(v_table_id, 6000, 2000, 1510.05),
(v_table_id, 6000, 2500, 1662.92),
(v_table_id, 6000, 3000, 1815.79),
(v_table_id, 6000, 3500, 2078.14),
(v_table_id, 6000, 4000, 2377.65),
(v_table_id, 6000, 4500, 2697.71),
(v_table_id, 6000, 5000, 3214.23),
(v_table_id, 7000, 2000, 1707.92),
(v_table_id, 7000, 2500, 1884.09),
(v_table_id, 7000, 3000, 2060.26),
(v_table_id, 7000, 3500, 2362.89),
(v_table_id, 7000, 4000, 2706.65),
(v_table_id, 7000, 4500, 3073.74),
(v_table_id, 7000, 5000, 3683.90)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1056.30),
(v_table_id, 4000, 2500, 1162.57),
(v_table_id, 4000, 3000, 1339.89),
(v_table_id, 4000, 3500, 1450.64),
(v_table_id, 4000, 4000, 1751.59),
(v_table_id, 4000, 4500, 2061.11),
(v_table_id, 4000, 4900, 2208.55),
(v_table_id, 5000, 2000, 1254.17),
(v_table_id, 5000, 2500, 1383.75),
(v_table_id, 5000, 3000, 1722.11),
(v_table_id, 5000, 3500, 1857.05),
(v_table_id, 5000, 4000, 2220.02),
(v_table_id, 5000, 4500, 2552.95),
(v_table_id, 5000, 4900, 2734.14),
(v_table_id, 6000, 2000, 1510.05),
(v_table_id, 6000, 2500, 1662.92),
(v_table_id, 6000, 3000, 1919.00),
(v_table_id, 6000, 3500, 2078.14),
(v_table_id, 6000, 4000, 2503.12),
(v_table_id, 6000, 4500, 2986.79),
(v_table_id, 6000, 4900, 3201.72),
(v_table_id, 7000, 2000, 1707.92),
(v_table_id, 7000, 2500, 1884.09),
(v_table_id, 7000, 3000, 2179.56),
(v_table_id, 7000, 3500, 2362.89),
(v_table_id, 7000, 4000, 2849.89),
(v_table_id, 7000, 4500, 3420.63),
(v_table_id, 7000, 4900, 3669.31)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1056.30),
(v_table_id, 4000, 2500, 1162.57),
(v_table_id, 4000, 3000, 1339.89),
(v_table_id, 4000, 3500, 1538.30),
(v_table_id, 4000, 4000, 1751.59),
(v_table_id, 4000, 4500, 2158.44),
(v_table_id, 4000, 4600, 2280.87),
(v_table_id, 5000, 2000, 1254.17),
(v_table_id, 5000, 2500, 1505.41),
(v_table_id, 5000, 3000, 1722.11),
(v_table_id, 5000, 3500, 1962.24),
(v_table_id, 5000, 4000, 2156.35),
(v_table_id, 5000, 4500, 2552.95),
(v_table_id, 5000, 4600, 2702.87),
(v_table_id, 6000, 2000, 1510.05),
(v_table_id, 6000, 2500, 1662.92),
(v_table_id, 6000, 3000, 1919.00),
(v_table_id, 6000, 3500, 2200.86),
(v_table_id, 6000, 4000, 2503.12),
(v_table_id, 6000, 4500, 2986.79),
(v_table_id, 6000, 4600, 3164.20),
(v_table_id, 7000, 2000, 1707.92),
(v_table_id, 7000, 2500, 1884.09),
(v_table_id, 7000, 3000, 2179.56),
(v_table_id, 7000, 3500, 2503.14),
(v_table_id, 7000, 4000, 2849.89),
(v_table_id, 7000, 4500, 3420.63),
(v_table_id, 7000, 4600, 3625.54)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1225.81),
(v_table_id, 4000, 2500, 1373.93),
(v_table_id, 4000, 3000, 1522.06),
(v_table_id, 4000, 3500, 1753.30),
(v_table_id, 4000, 4000, 2027.12),
(v_table_id, 4000, 4500, 2320.82),
(v_table_id, 4000, 5000, 2859.58),
(v_table_id, 5000, 2000, 1507.46),
(v_table_id, 5000, 2500, 1699.67),
(v_table_id, 5000, 3000, 2013.54),
(v_table_id, 5000, 3500, 2313.45),
(v_table_id, 5000, 4000, 2673.25),
(v_table_id, 5000, 4500, 2996.94),
(v_table_id, 5000, 5000, 3623.14),
(v_table_id, 6000, 2000, 1791.91),
(v_table_id, 6000, 2500, 2014.44),
(v_table_id, 6000, 3000, 2236.97),
(v_table_id, 6000, 3500, 2584.18),
(v_table_id, 6000, 4000, 2995.25),
(v_table_id, 6000, 4500, 3436.66),
(v_table_id, 6000, 5000, 4163.52),
(v_table_id, 7000, 2000, 2018.37),
(v_table_id, 7000, 2500, 2271.21),
(v_table_id, 7000, 3000, 2524.06),
(v_table_id, 7000, 3500, 2918.57),
(v_table_id, 7000, 4000, 3342.87),
(v_table_id, 7000, 4500, 3342.87),
(v_table_id, 7000, 5000, 4703.91)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1225.81),
(v_table_id, 4000, 2500, 1373.93),
(v_table_id, 4000, 3000, 1522.06),
(v_table_id, 4000, 3500, 1753.30),
(v_table_id, 4000, 4000, 2027.12),
(v_table_id, 4000, 4500, 2418.15),
(v_table_id, 4000, 5000, 2859.58),
(v_table_id, 5000, 2000, 1507.46),
(v_table_id, 5000, 2500, 1821.33),
(v_table_id, 5000, 3000, 2013.54),
(v_table_id, 5000, 3500, 2313.45),
(v_table_id, 5000, 4000, 2609.59),
(v_table_id, 5000, 4500, 2996.94),
(v_table_id, 5000, 5000, 3623.14),
(v_table_id, 6000, 2000, 1791.91),
(v_table_id, 6000, 2500, 2014.44),
(v_table_id, 6000, 3000, 2236.97),
(v_table_id, 6000, 3500, 2584.18),
(v_table_id, 6000, 4000, 2995.25),
(v_table_id, 6000, 4500, 3436.66),
(v_table_id, 6000, 5000, 4163.52),
(v_table_id, 7000, 2000, 2018.37),
(v_table_id, 7000, 2500, 2271.21),
(v_table_id, 7000, 3000, 2524.06),
(v_table_id, 7000, 3500, 2918.57),
(v_table_id, 7000, 4000, 3380.91),
(v_table_id, 7000, 4500, 3876.37),
(v_table_id, 7000, 5000, 4703.91)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Orangeline+ Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Orangeline+ Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Orangeline+","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1267.21),
(v_table_id, 4000, 2500, 1425.68),
(v_table_id, 4000, 3000, 1661.91),
(v_table_id, 4000, 3500, 1930.94),
(v_table_id, 4000, 4000, 2317.07),
(v_table_id, 4000, 4500, 2742.57),
(v_table_id, 4000, 4700, 2917.13),
(v_table_id, 5000, 2000, 1680.88),
(v_table_id, 5000, 2500, 1886.02),
(v_table_id, 5000, 3000, 2191.70),
(v_table_id, 5000, 3500, 2480.60),
(v_table_id, 5000, 4000, 2860.56),
(v_table_id, 5000, 4500, 3460.28),
(v_table_id, 5000, 4700, 3695.08),
(v_table_id, 6000, 2000, 1854.01),
(v_table_id, 6000, 2500, 2092.07),
(v_table_id, 6000, 3000, 2446.74),
(v_table_id, 6000, 3500, 2850.63),
(v_table_id, 6000, 4000, 3284.69),
(v_table_id, 6000, 4500, 3981.09),
(v_table_id, 6000, 4700, 4249.84),
(v_table_id, 7000, 2000, 2090.82),
(v_table_id, 7000, 2500, 2361.78),
(v_table_id, 7000, 3000, 2765.44),
(v_table_id, 7000, 3500, 3220.67),
(v_table_id, 7000, 4000, 3708.83),
(v_table_id, 7000, 4500, 4501.91),
(v_table_id, 7000, 4700, 4804.61)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 953.29),
(v_table_id, 3000, 2500, 1038.99),
(v_table_id, 3000, 3000, 1124.68),
(v_table_id, 3000, 3500, 1272.00),
(v_table_id, 3000, 4000, 1445.91),
(v_table_id, 3000, 4500, 1639.47),
(v_table_id, 3000, 5000, 1879.03),
(v_table_id, 4000, 2000, 1179.79),
(v_table_id, 4000, 2500, 1289.46),
(v_table_id, 4000, 3000, 1399.13),
(v_table_id, 4000, 3500, 1685.63),
(v_table_id, 4000, 4000, 1905.56),
(v_table_id, 4000, 4500, 2148.51),
(v_table_id, 4000, 5000, 2482.71),
(v_table_id, 5000, 2000, 1527.95),
(v_table_id, 5000, 2500, 1661.60),
(v_table_id, 5000, 3000, 1795.25),
(v_table_id, 5000, 3500, 2026.26),
(v_table_id, 5000, 4000, 2231.61),
(v_table_id, 5000, 4500, 2523.95),
(v_table_id, 5000, 5000, 2952.79),
(v_table_id, 6000, 2000, 1693.83),
(v_table_id, 6000, 2500, 1851.46),
(v_table_id, 6000, 3000, 2009.08),
(v_table_id, 6000, 3500, 2281.95),
(v_table_id, 6000, 4000, 2593.94),
(v_table_id, 6000, 4500, 2935.67),
(v_table_id, 6000, 5000, 3459.14),
(v_table_id, 7000, 2000, 1920.33),
(v_table_id, 7000, 2500, 2101.93),
(v_table_id, 7000, 3000, 2283.53),
(v_table_id, 7000, 3500, 2598.24),
(v_table_id, 7000, 4000, 2956.26),
(v_table_id, 7000, 4500, 3347.39),
(v_table_id, 7000, 5000, 3965.49),
(v_table_id, 7950, 2000, 2138.19),
(v_table_id, 7950, 2500, 2343.77),
(v_table_id, 7950, 3000, 2547.27),
(v_table_id, 7950, 3500, 2903.33),
(v_table_id, 7950, 4000, 3307.38),
(v_table_id, 7950, 4500, 3747.98),
(v_table_id, 7950, 5000, 4460.72)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 953.29),
(v_table_id, 3000, 2500, 1038.99),
(v_table_id, 3000, 3000, 1182.53),
(v_table_id, 3000, 3500, 1272.00),
(v_table_id, 3000, 4000, 1528.68),
(v_table_id, 3000, 4500, 1755.10),
(v_table_id, 3000, 4900, 1872.78),
(v_table_id, 4000, 2000, 1179.79),
(v_table_id, 4000, 2500, 1289.46),
(v_table_id, 4000, 3000, 1571.24),
(v_table_id, 4000, 3500, 1685.63),
(v_table_id, 4000, 4000, 2007.47),
(v_table_id, 4000, 4500, 2321.96),
(v_table_id, 4000, 4900, 2474.38),
(v_table_id, 5000, 2000, 1527.95),
(v_table_id, 5000, 2500, 1661.60),
(v_table_id, 5000, 3000, 1886.96),
(v_table_id, 5000, 3500, 1965.65),
(v_table_id, 5000, 4000, 2352.66),
(v_table_id, 5000, 4500, 2755.22),
(v_table_id, 5000, 4900, 2942.36),
(v_table_id, 6000, 2000, 1693.83),
(v_table_id, 6000, 2500, 1851.46),
(v_table_id, 6000, 3000, 2117.72),
(v_table_id, 6000, 3500, 2281.95),
(v_table_id, 6000, 4000, 2734.13),
(v_table_id, 6000, 4500, 3224.75),
(v_table_id, 6000, 4900, 3446.63),
(v_table_id, 7000, 2000, 1920.33),
(v_table_id, 7000, 2500, 2101.93),
(v_table_id, 7000, 3000, 2409.10),
(v_table_id, 7000, 3500, 2598.24),
(v_table_id, 7000, 4000, 3115.60),
(v_table_id, 7000, 4500, 3694.28),
(v_table_id, 7000, 4900, 3950.90),
(v_table_id, 7950, 2000, 2138.19),
(v_table_id, 7950, 2500, 2343.77),
(v_table_id, 7950, 3000, 2689.27),
(v_table_id, 7950, 3500, 2903.33),
(v_table_id, 7950, 4000, 3485.95),
(v_table_id, 7950, 4500, 4152.70),
(v_table_id, 7950, 4900, 4444.05)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 953.29),
(v_table_id, 3000, 2500, 1038.99),
(v_table_id, 3000, 3000, 1182.53),
(v_table_id, 3000, 3500, 1345.82),
(v_table_id, 3000, 4000, 1528.68),
(v_table_id, 3000, 4500, 1755.10),
(v_table_id, 3000, 4600, 1854.02),
(v_table_id, 4000, 2000, 1179.79),
(v_table_id, 4000, 2500, 1386.79),
(v_table_id, 4000, 3000, 1571.24),
(v_table_id, 4000, 3500, 1777.90),
(v_table_id, 4000, 4000, 2007.47),
(v_table_id, 4000, 4500, 2321.96),
(v_table_id, 4000, 4600, 2449.36),
(v_table_id, 5000, 2000, 1527.95),
(v_table_id, 5000, 2500, 1661.60),
(v_table_id, 5000, 3000, 1826.34),
(v_table_id, 5000, 3500, 2076.37),
(v_table_id, 5000, 4000, 2352.66),
(v_table_id, 5000, 4500, 2755.22),
(v_table_id, 5000, 4600, 2911.10),
(v_table_id, 6000, 2000, 1693.83),
(v_table_id, 6000, 2500, 1851.46),
(v_table_id, 6000, 3000, 2117.72),
(v_table_id, 6000, 3500, 2411.13),
(v_table_id, 6000, 4000, 2734.13),
(v_table_id, 6000, 4500, 3224.75),
(v_table_id, 6000, 4600, 3409.11),
(v_table_id, 7000, 2000, 1920.33),
(v_table_id, 7000, 2500, 2101.93),
(v_table_id, 7000, 3000, 2409.10),
(v_table_id, 7000, 3500, 2745.88),
(v_table_id, 7000, 4000, 3115.60),
(v_table_id, 7000, 4500, 3694.28),
(v_table_id, 7000, 4600, 3907.13),
(v_table_id, 7950, 2000, 2138.19),
(v_table_id, 7950, 2500, 2343.77),
(v_table_id, 7950, 3000, 2689.27),
(v_table_id, 7950, 3500, 3069.42),
(v_table_id, 7950, 4000, 3485.95),
(v_table_id, 7950, 4500, 4152.70),
(v_table_id, 7950, 4600, 4394.02)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1097.76),
(v_table_id, 3000, 2500, 1219.15),
(v_table_id, 3000, 3000, 1340.54),
(v_table_id, 3000, 3500, 1531.55),
(v_table_id, 3000, 4000, 1763.20),
(v_table_id, 3000, 4500, 2019.66),
(v_table_id, 3000, 5000, 2365.58),
(v_table_id, 4000, 2000, 1353.05),
(v_table_id, 4000, 2500, 1505.48),
(v_table_id, 4000, 3000, 1755.25),
(v_table_id, 4000, 3500, 1995.18),
(v_table_id, 4000, 4000, 2279.93),
(v_table_id, 4000, 4500, 2592.85),
(v_table_id, 4000, 5000, 3040.46),
(v_table_id, 5000, 2000, 1788.10),
(v_table_id, 5000, 2500, 1986.07),
(v_table_id, 5000, 3000, 2184.04),
(v_table_id, 5000, 3500, 2434.76),
(v_table_id, 5000, 4000, 2809.14),
(v_table_id, 5000, 4500, 3220.21),
(v_table_id, 5000, 5000, 3854.68),
(v_table_id, 6000, 2000, 1982.78),
(v_table_id, 6000, 2500, 2211.79),
(v_table_id, 6000, 3000, 2440.80),
(v_table_id, 6000, 3500, 2801.05),
(v_table_id, 6000, 4000, 3228.53),
(v_table_id, 6000, 4500, 3696.06),
(v_table_id, 6000, 5000, 4432.24),
(v_table_id, 7000, 2000, 2238.06),
(v_table_id, 7000, 2500, 2498.12),
(v_table_id, 7000, 3000, 2758.17),
(v_table_id, 7000, 3500, 3167.34),
(v_table_id, 7000, 4000, 3647.92),
(v_table_id, 7000, 4500, 4171.91),
(v_table_id, 7000, 5000, 5009.79),
(v_table_id, 7950, 2000, 2483.49),
(v_table_id, 7950, 2500, 2774.59),
(v_table_id, 7950, 3000, 3062.38),
(v_table_id, 7950, 3500, 3519.97),
(v_table_id, 7950, 4000, 4053.64),
(v_table_id, 7950, 4500, 4634.19),
(v_table_id, 7950, 5000, 5573.77)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1097.76),
(v_table_id, 3000, 2500, 1219.15),
(v_table_id, 3000, 3000, 1340.54),
(v_table_id, 3000, 3500, 1531.55),
(v_table_id, 3000, 4000, 1763.20),
(v_table_id, 3000, 4500, 2019.66),
(v_table_id, 3000, 5000, 2365.58),
(v_table_id, 4000, 2000, 1353.05),
(v_table_id, 4000, 2500, 1602.81),
(v_table_id, 4000, 3000, 1755.25),
(v_table_id, 4000, 3500, 1995.18),
(v_table_id, 4000, 4000, 2279.93),
(v_table_id, 4000, 4500, 2592.85),
(v_table_id, 4000, 5000, 3004.18),
(v_table_id, 5000, 2000, 1788.10),
(v_table_id, 5000, 2500, 1986.07),
(v_table_id, 5000, 3000, 2123.42),
(v_table_id, 5000, 3500, 2434.76),
(v_table_id, 5000, 4000, 2809.14),
(v_table_id, 5000, 4500, 3220.21),
(v_table_id, 5000, 5000, 3854.68),
(v_table_id, 6000, 2000, 1982.78),
(v_table_id, 6000, 2500, 2211.79),
(v_table_id, 6000, 3000, 2440.80),
(v_table_id, 6000, 3500, 2801.05),
(v_table_id, 6000, 4000, 3228.53),
(v_table_id, 6000, 4500, 3696.06),
(v_table_id, 6000, 5000, 4432.24),
(v_table_id, 7000, 2000, 2238.06),
(v_table_id, 7000, 2500, 2498.12),
(v_table_id, 7000, 3000, 2758.17),
(v_table_id, 7000, 3500, 3167.34),
(v_table_id, 7000, 4000, 3647.92),
(v_table_id, 7000, 4500, 4171.91),
(v_table_id, 7000, 5000, 5009.79),
(v_table_id, 7950, 2000, 2483.49),
(v_table_id, 7950, 2500, 2774.59),
(v_table_id, 7950, 3000, 3062.38),
(v_table_id, 7950, 3500, 3519.97),
(v_table_id, 7950, 4000, 4053.64),
(v_table_id, 7950, 4500, 4634.19),
(v_table_id, 7950, 5000, 5573.77)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1128.81),
(v_table_id, 3000, 2500, 1257.96),
(v_table_id, 3000, 3000, 1452.03),
(v_table_id, 3000, 3500, 1678.16),
(v_table_id, 3000, 4000, 1929.01),
(v_table_id, 3000, 4500, 2262.97),
(v_table_id, 3000, 4700, 2506.07),
(v_table_id, 4000, 2000, 1491.78),
(v_table_id, 4000, 2500, 1654.56),
(v_table_id, 4000, 3000, 1899.19),
(v_table_id, 4000, 3500, 2178.35),
(v_table_id, 4000, 4000, 2485.57),
(v_table_id, 4000, 4500, 2880.98),
(v_table_id, 4000, 4700, 3061.73),
(v_table_id, 5000, 2000, 1839.85),
(v_table_id, 5000, 2500, 1990.15),
(v_table_id, 5000, 3000, 2306.88),
(v_table_id, 5000, 3500, 2672.95),
(v_table_id, 5000, 4000, 3075.56),
(v_table_id, 5000, 4500, 3683.55),
(v_table_id, 5000, 4700, 3926.61),
(v_table_id, 6000, 2000, 2044.88),
(v_table_id, 6000, 2500, 2289.41),
(v_table_id, 6000, 3000, 2656.71),
(v_table_id, 6000, 3500, 3075.81),
(v_table_id, 6000, 4000, 3534.79),
(v_table_id, 6000, 4500, 4240.50),
(v_table_id, 6000, 4700, 4518.55),
(v_table_id, 7000, 2000, 2310.51),
(v_table_id, 7000, 2500, 2588.68),
(v_table_id, 7000, 3000, 3006.54),
(v_table_id, 7000, 3500, 3478.67),
(v_table_id, 7000, 4000, 3994.02),
(v_table_id, 7000, 4500, 4797.45),
(v_table_id, 7000, 4700, 5110.50),
(v_table_id, 7950, 2000, 2565.77),
(v_table_id, 7950, 2500, 2877.57),
(v_table_id, 7950, 3000, 3341.67),
(v_table_id, 7950, 3500, 3866.83),
(v_table_id, 7950, 4000, 4438.65),
(v_table_id, 7950, 4500, 5339.80),
(v_table_id, 7950, 4700, 5687.83)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1230.99),
(v_table_id, 4000, 2500, 1340.66),
(v_table_id, 4000, 3000, 1450.33),
(v_table_id, 4000, 3500, 1639.50),
(v_table_id, 4000, 4000, 1859.43),
(v_table_id, 4000, 4500, 2102.38),
(v_table_id, 4000, 5000, 2436.58),
(v_table_id, 5000, 2000, 1470.28),
(v_table_id, 5000, 2500, 1603.93),
(v_table_id, 5000, 3000, 1737.58),
(v_table_id, 5000, 3500, 2087.97),
(v_table_id, 5000, 4000, 2353.93),
(v_table_id, 5000, 4500, 2646.27),
(v_table_id, 5000, 5000, 3075.11),
(v_table_id, 6000, 2000, 1852.83),
(v_table_id, 6000, 2500, 2010.45),
(v_table_id, 6000, 3000, 2168.08),
(v_table_id, 6000, 3500, 2440.94),
(v_table_id, 6000, 4000, 2670.74),
(v_table_id, 6000, 4500, 3012.47),
(v_table_id, 6000, 5000, 3535.94),
(v_table_id, 7000, 2000, 2009.93),
(v_table_id, 7000, 2500, 2191.53),
(v_table_id, 7000, 3000, 2373.13),
(v_table_id, 7000, 3500, 2687.84),
(v_table_id, 7000, 4000, 3045.86),
(v_table_id, 7000, 4500, 3436.99),
(v_table_id, 7000, 5000, 4055.09)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1230.99),
(v_table_id, 4000, 2500, 1340.66),
(v_table_id, 4000, 3000, 1525.11),
(v_table_id, 4000, 3500, 1639.50),
(v_table_id, 4000, 4000, 1961.34),
(v_table_id, 4000, 4500, 2275.83),
(v_table_id, 4000, 4900, 2428.24),
(v_table_id, 5000, 2000, 1470.28),
(v_table_id, 5000, 2500, 1603.93),
(v_table_id, 5000, 3000, 1948.67),
(v_table_id, 5000, 3500, 2087.97),
(v_table_id, 5000, 4000, 2474.98),
(v_table_id, 5000, 4500, 2877.54),
(v_table_id, 5000, 4900, 3064.69),
(v_table_id, 6000, 2000, 1852.83),
(v_table_id, 6000, 2500, 2010.45),
(v_table_id, 6000, 3000, 2276.72),
(v_table_id, 6000, 3500, 2358.75),
(v_table_id, 6000, 4000, 2810.93),
(v_table_id, 6000, 4500, 3301.55),
(v_table_id, 6000, 4900, 3523.43),
(v_table_id, 7000, 2000, 2009.93),
(v_table_id, 7000, 2500, 2191.53),
(v_table_id, 7000, 3000, 2498.70),
(v_table_id, 7000, 3500, 2687.84),
(v_table_id, 7000, 4000, 3205.20),
(v_table_id, 7000, 4500, 3783.88),
(v_table_id, 7000, 4900, 4040.50)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1230.99),
(v_table_id, 4000, 2500, 1340.66),
(v_table_id, 4000, 3000, 1525.11),
(v_table_id, 4000, 3500, 1731.77),
(v_table_id, 4000, 4000, 1961.34),
(v_table_id, 4000, 4500, 2275.83),
(v_table_id, 4000, 4600, 2403.23),
(v_table_id, 5000, 2000, 1470.28),
(v_table_id, 5000, 2500, 1723.31),
(v_table_id, 5000, 3000, 1948.67),
(v_table_id, 5000, 3500, 2198.70),
(v_table_id, 5000, 4000, 2474.98),
(v_table_id, 5000, 4500, 2819.22),
(v_table_id, 5000, 4600, 2975.10),
(v_table_id, 6000, 2000, 1709.58),
(v_table_id, 6000, 2500, 2010.45),
(v_table_id, 6000, 3000, 2194.52),
(v_table_id, 6000, 3500, 2487.93),
(v_table_id, 6000, 4000, 2810.93),
(v_table_id, 6000, 4500, 3301.55),
(v_table_id, 6000, 4600, 3485.91),
(v_table_id, 7000, 2000, 2009.93),
(v_table_id, 7000, 2500, 2191.53),
(v_table_id, 7000, 3000, 2498.70),
(v_table_id, 7000, 3500, 2835.48),
(v_table_id, 7000, 4000, 3205.20),
(v_table_id, 7000, 4500, 3783.88),
(v_table_id, 7000, 4600, 3996.73)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1404.25),
(v_table_id, 4000, 2500, 1556.68),
(v_table_id, 4000, 3000, 1709.12),
(v_table_id, 4000, 3500, 1949.05),
(v_table_id, 4000, 4000, 2233.79),
(v_table_id, 4000, 4500, 2546.71),
(v_table_id, 4000, 5000, 2994.33),
(v_table_id, 5000, 2000, 1730.44),
(v_table_id, 5000, 2500, 1928.41),
(v_table_id, 5000, 3000, 2245.74),
(v_table_id, 5000, 3500, 2557.08),
(v_table_id, 5000, 4000, 2931.46),
(v_table_id, 5000, 4500, 3342.53),
(v_table_id, 5000, 5000, 3977.00),
(v_table_id, 6000, 2000, 2141.77),
(v_table_id, 6000, 2500, 2370.78),
(v_table_id, 6000, 3000, 2599.79),
(v_table_id, 6000, 3500, 2877.85),
(v_table_id, 6000, 4000, 3305.33),
(v_table_id, 6000, 4500, 3772.86),
(v_table_id, 6000, 5000, 4509.04),
(v_table_id, 7000, 2000, 2327.66),
(v_table_id, 7000, 2500, 2587.72),
(v_table_id, 7000, 3000, 2847.77),
(v_table_id, 7000, 3500, 3256.94),
(v_table_id, 7000, 4000, 3737.52),
(v_table_id, 7000, 4500, 4261.51),
(v_table_id, 7000, 5000, 5099.39)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1404.25),
(v_table_id, 4000, 2500, 1556.68),
(v_table_id, 4000, 3000, 1709.12),
(v_table_id, 4000, 3500, 1949.05),
(v_table_id, 4000, 4000, 2233.79),
(v_table_id, 4000, 4500, 2546.71),
(v_table_id, 4000, 5000, 3113.71),
(v_table_id, 5000, 2000, 1730.44),
(v_table_id, 5000, 2500, 2047.78),
(v_table_id, 5000, 3000, 2245.74),
(v_table_id, 5000, 3500, 2557.08),
(v_table_id, 5000, 4000, 2931.46),
(v_table_id, 5000, 4500, 3342.53),
(v_table_id, 5000, 5000, 3918.68),
(v_table_id, 6000, 2000, 2141.77),
(v_table_id, 6000, 2500, 2370.78),
(v_table_id, 6000, 3000, 2517.60),
(v_table_id, 6000, 3500, 2877.85),
(v_table_id, 6000, 4000, 3305.33),
(v_table_id, 6000, 4500, 3772.86),
(v_table_id, 6000, 5000, 4509.04),
(v_table_id, 7000, 2000, 2327.66),
(v_table_id, 7000, 2500, 2587.72),
(v_table_id, 7000, 3000, 2847.77),
(v_table_id, 7000, 3500, 3256.94),
(v_table_id, 7000, 4000, 3737.52),
(v_table_id, 7000, 4500, 4261.51),
(v_table_id, 7000, 5000, 5099.39)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Trendline+","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 4000, 2000, 1445.65),
(v_table_id, 4000, 2500, 1608.43),
(v_table_id, 4000, 3000, 1853.06),
(v_table_id, 4000, 3500, 2132.22),
(v_table_id, 4000, 4000, 2439.44),
(v_table_id, 4000, 4500, 2990.50),
(v_table_id, 4000, 4700, 3171.25),
(v_table_id, 5000, 2000, 1782.19),
(v_table_id, 5000, 2500, 2112.47),
(v_table_id, 5000, 3000, 2429.20),
(v_table_id, 5000, 3500, 2795.28),
(v_table_id, 5000, 4000, 3139.56),
(v_table_id, 5000, 4500, 3747.55),
(v_table_id, 5000, 4700, 3990.61),
(v_table_id, 6000, 2000, 2203.87),
(v_table_id, 6000, 2500, 2366.21),
(v_table_id, 6000, 3000, 2733.51),
(v_table_id, 6000, 3500, 3152.61),
(v_table_id, 6000, 4000, 3611.59),
(v_table_id, 6000, 4500, 4317.30),
(v_table_id, 6000, 4700, 4595.35),
(v_table_id, 7000, 2000, 2400.11),
(v_table_id, 7000, 2500, 2678.28),
(v_table_id, 7000, 3000, 3096.14),
(v_table_id, 7000, 3500, 3568.27),
(v_table_id, 7000, 4000, 4083.62),
(v_table_id, 7000, 4500, 4887.05),
(v_table_id, 7000, 4700, 5200.10)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1237.27),
(v_table_id, 3000, 2500, 1331.17),
(v_table_id, 3000, 3000, 1425.08),
(v_table_id, 3000, 3500, 1589.88),
(v_table_id, 3000, 4000, 1785.28),
(v_table_id, 3000, 4500, 2003.30),
(v_table_id, 3000, 5000, 2254.85),
(v_table_id, 4000, 2000, 1526.35),
(v_table_id, 4000, 2500, 1646.27),
(v_table_id, 4000, 3000, 1766.19),
(v_table_id, 4000, 3500, 1977.58),
(v_table_id, 4000, 4000, 2224.38),
(v_table_id, 4000, 4500, 2497.66),
(v_table_id, 4000, 5000, 2846.83),
(v_table_id, 5000, 2000, 1815.43),
(v_table_id, 5000, 2500, 1961.37),
(v_table_id, 5000, 3000, 2107.31),
(v_table_id, 5000, 3500, 2365.28),
(v_table_id, 5000, 4000, 2663.47),
(v_table_id, 5000, 4500, 2992.02),
(v_table_id, 5000, 5000, 3438.81),
(v_table_id, 6000, 2000, 2104.51),
(v_table_id, 6000, 2500, 2276.46),
(v_table_id, 6000, 3000, 2448.42),
(v_table_id, 6000, 3500, 2752.98),
(v_table_id, 6000, 4000, 3275.37),
(v_table_id, 6000, 4500, 3659.18),
(v_table_id, 6000, 5000, 4203.59),
(v_table_id, 7000, 2000, 2688.67),
(v_table_id, 7000, 2500, 2886.64),
(v_table_id, 7000, 3000, 2883.02),
(v_table_id, 7000, 3500, 3234.17),
(v_table_id, 7000, 4000, 3635.14),
(v_table_id, 7000, 4500, 4074.22),
(v_table_id, 7000, 5000, 4716.26)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1237.27),
(v_table_id, 3000, 2500, 1331.17),
(v_table_id, 3000, 3000, 1491.64),
(v_table_id, 3000, 3500, 1589.88),
(v_table_id, 3000, 4000, 1880.53),
(v_table_id, 3000, 4500, 2118.93),
(v_table_id, 3000, 4900, 2248.60),
(v_table_id, 4000, 2000, 1526.35),
(v_table_id, 4000, 2500, 1646.27),
(v_table_id, 4000, 3000, 1852.24),
(v_table_id, 4000, 3500, 1977.58),
(v_table_id, 4000, 4000, 2341.65),
(v_table_id, 4000, 4500, 2671.11),
(v_table_id, 4000, 4900, 2838.49),
(v_table_id, 5000, 2000, 1815.43),
(v_table_id, 5000, 2500, 1961.37),
(v_table_id, 5000, 3000, 2212.84),
(v_table_id, 5000, 3500, 2365.28),
(v_table_id, 5000, 4000, 2802.77),
(v_table_id, 5000, 4500, 3223.28),
(v_table_id, 5000, 4900, 3428.39),
(v_table_id, 6000, 2000, 2104.51),
(v_table_id, 6000, 2500, 2276.46),
(v_table_id, 6000, 3000, 2573.43),
(v_table_id, 6000, 3500, 2925.78),
(v_table_id, 6000, 4000, 3436.69),
(v_table_id, 6000, 4500, 3948.26),
(v_table_id, 6000, 4900, 4191.09),
(v_table_id, 7000, 2000, 2688.67),
(v_table_id, 7000, 2500, 2886.64),
(v_table_id, 7000, 3000, 3027.51),
(v_table_id, 7000, 3500, 3234.17),
(v_table_id, 7000, 4000, 3818.49),
(v_table_id, 7000, 4500, 4421.11),
(v_table_id, 7000, 4900, 4701.67)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1237.27),
(v_table_id, 3000, 2500, 1331.17),
(v_table_id, 3000, 3000, 1491.64),
(v_table_id, 3000, 3500, 1674.82),
(v_table_id, 3000, 4000, 1880.53),
(v_table_id, 3000, 4500, 2118.93),
(v_table_id, 3000, 4600, 2229.84),
(v_table_id, 4000, 2000, 1526.35),
(v_table_id, 4000, 2500, 1646.27),
(v_table_id, 4000, 3000, 1852.24),
(v_table_id, 4000, 3500, 2083.76),
(v_table_id, 4000, 4000, 2341.65),
(v_table_id, 4000, 4500, 2671.11),
(v_table_id, 4000, 4600, 2813.48),
(v_table_id, 5000, 2000, 1815.43),
(v_table_id, 5000, 2500, 1961.37),
(v_table_id, 5000, 3000, 2212.84),
(v_table_id, 5000, 3500, 2492.69),
(v_table_id, 5000, 4000, 2802.77),
(v_table_id, 5000, 4500, 3367.28),
(v_table_id, 5000, 4600, 3541.12),
(v_table_id, 6000, 2000, 2104.51),
(v_table_id, 6000, 2500, 2276.46),
(v_table_id, 6000, 3000, 2746.23),
(v_table_id, 6000, 3500, 3074.43),
(v_table_id, 6000, 4000, 3436.69),
(v_table_id, 6000, 4500, 3868.94),
(v_table_id, 6000, 4600, 4074.25),
(v_table_id, 7000, 2000, 2688.67),
(v_table_id, 7000, 2500, 2886.64),
(v_table_id, 7000, 3000, 3027.51),
(v_table_id, 7000, 3500, 3404.05),
(v_table_id, 7000, 4000, 3818.49),
(v_table_id, 7000, 4500, 4421.11),
(v_table_id, 7000, 4600, 4657.90)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1392.42),
(v_table_id, 3000, 2500, 1524.62),
(v_table_id, 3000, 3000, 1656.81),
(v_table_id, 3000, 3500, 1869.12),
(v_table_id, 3000, 4000, 2128.20),
(v_table_id, 3000, 4500, 2415.82),
(v_table_id, 3000, 5000, 2777.27),
(v_table_id, 4000, 2000, 1710.92),
(v_table_id, 4000, 2500, 1876.35),
(v_table_id, 4000, 3000, 2041.77),
(v_table_id, 4000, 3500, 2307.88),
(v_table_id, 4000, 4000, 2625.56),
(v_table_id, 4000, 4500, 2975.65),
(v_table_id, 4000, 5000, 3441.93),
(v_table_id, 5000, 2000, 2096.29),
(v_table_id, 5000, 2500, 2311.62),
(v_table_id, 5000, 3000, 2526.94),
(v_table_id, 5000, 3500, 2872.71),
(v_table_id, 5000, 4000, 3291.04),
(v_table_id, 5000, 4500, 3751.58),
(v_table_id, 5000, 5000, 4554.97),
(v_table_id, 6000, 2000, 2414.80),
(v_table_id, 6000, 2500, 2663.35),
(v_table_id, 6000, 3000, 2911.90),
(v_table_id, 6000, 3500, 3484.27),
(v_table_id, 6000, 4000, 3961.19),
(v_table_id, 6000, 4500, 4484.21),
(v_table_id, 6000, 5000, 5248.43),
(v_table_id, 7000, 2000, 2826.79),
(v_table_id, 7000, 2500, 3108.56),
(v_table_id, 7000, 3000, 3390.34),
(v_table_id, 7000, 3500, 3843.70),
(v_table_id, 7000, 4000, 4379.23),
(v_table_id, 7000, 4500, 4964.73),
(v_table_id, 7000, 5000, 5833.78)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1392.42),
(v_table_id, 3000, 2500, 1524.62),
(v_table_id, 3000, 3000, 1656.81),
(v_table_id, 3000, 3500, 1869.12),
(v_table_id, 3000, 4000, 2128.20),
(v_table_id, 3000, 4500, 2415.82),
(v_table_id, 3000, 5000, 2777.27),
(v_table_id, 4000, 2000, 1710.92),
(v_table_id, 4000, 2500, 1876.35),
(v_table_id, 4000, 3000, 2041.77),
(v_table_id, 4000, 3500, 2307.88),
(v_table_id, 4000, 4000, 2625.56),
(v_table_id, 4000, 4500, 2975.65),
(v_table_id, 4000, 5000, 3441.93),
(v_table_id, 5000, 2000, 2096.29),
(v_table_id, 5000, 2500, 2311.62),
(v_table_id, 5000, 3000, 2526.94),
(v_table_id, 5000, 3500, 2872.71),
(v_table_id, 5000, 4000, 3291.04),
(v_table_id, 5000, 4500, 3751.58),
(v_table_id, 5000, 5000, 4554.97),
(v_table_id, 6000, 2000, 2414.80),
(v_table_id, 6000, 2500, 2663.35),
(v_table_id, 6000, 3000, 3084.70),
(v_table_id, 6000, 3500, 3484.27),
(v_table_id, 6000, 4000, 3961.19),
(v_table_id, 6000, 4500, 4484.21),
(v_table_id, 6000, 5000, 5169.12),
(v_table_id, 7000, 2000, 2826.79),
(v_table_id, 7000, 2500, 3108.56),
(v_table_id, 7000, 3000, 3390.34),
(v_table_id, 7000, 3500, 3843.70),
(v_table_id, 7000, 4000, 4379.23),
(v_table_id, 7000, 4500, 4964.73),
(v_table_id, 7000, 5000, 5833.78)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2000, 1423.47),
(v_table_id, 3000, 2500, 1563.43),
(v_table_id, 3000, 3000, 1778.08),
(v_table_id, 3000, 3500, 2029.64),
(v_table_id, 3000, 4000, 2309.63),
(v_table_id, 3000, 4500, 2659.13),
(v_table_id, 3000, 4700, 2820.43),
(v_table_id, 4000, 2000, 1752.32),
(v_table_id, 4000, 2500, 1928.10),
(v_table_id, 4000, 3000, 2198.05),
(v_table_id, 4000, 3500, 2507.74),
(v_table_id, 4000, 4000, 2849.71),
(v_table_id, 4000, 4500, 3300.07),
(v_table_id, 4000, 4700, 3499.48),
(v_table_id, 5000, 2000, 2148.04),
(v_table_id, 5000, 2500, 2376.30),
(v_table_id, 5000, 3000, 2726.34),
(v_table_id, 5000, 3500, 3133.16),
(v_table_id, 5000, 4000, 3726.01),
(v_table_id, 5000, 4500, 4358.92),
(v_table_id, 5000, 4700, 4626.90),
(v_table_id, 6000, 2000, 2476.90),
(v_table_id, 6000, 2500, 2913.77),
(v_table_id, 6000, 3000, 3319.11),
(v_table_id, 6000, 3500, 3784.06),
(v_table_id, 6000, 4000, 4215.58),
(v_table_id, 6000, 4500, 4949.33),
(v_table_id, 6000, 4700, 5255.43),
(v_table_id, 7000, 2000, 2899.24),
(v_table_id, 7000, 2500, 3199.13),
(v_table_id, 7000, 3000, 3659.76),
(v_table_id, 7000, 3500, 4182.84),
(v_table_id, 7000, 4000, 4755.66),
(v_table_id, 7000, 4500, 5590.27),
(v_table_id, 7000, 4700, 5934.49)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Poly (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"poly_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2559.81),
(v_table_id, 6000, 2500, 2734.29),
(v_table_id, 6000, 3000, 2908.77),
(v_table_id, 6000, 3500, 3218.91),
(v_table_id, 6000, 4000, 3575.11),
(v_table_id, 6000, 4500, 3966.33),
(v_table_id, 6000, 5000, 4514.43),
(v_table_id, 7000, 2000, 2907.81),
(v_table_id, 7000, 2500, 3108.67),
(v_table_id, 7000, 3000, 3309.53),
(v_table_id, 7000, 3500, 3667.09),
(v_table_id, 7000, 4000, 4075.63),
(v_table_id, 7000, 4500, 4523.14),
(v_table_id, 7000, 5000, 5390.47)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Poly (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"poly_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2559.81),
(v_table_id, 6000, 2500, 2734.29),
(v_table_id, 6000, 3000, 3036.66),
(v_table_id, 6000, 3500, 3218.91),
(v_table_id, 6000, 4000, 3740.15),
(v_table_id, 6000, 4500, 4255.41),
(v_table_id, 6000, 4900, 4501.92),
(v_table_id, 7000, 2000, 2907.81),
(v_table_id, 7000, 2500, 3108.67),
(v_table_id, 7000, 3000, 3457.35),
(v_table_id, 7000, 3500, 3667.09),
(v_table_id, 7000, 4000, 4484.28),
(v_table_id, 7000, 4500, 5091.11),
(v_table_id, 7000, 4900, 5375.88)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Poly (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Poly (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"poly_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2559.81),
(v_table_id, 6000, 2500, 2734.29),
(v_table_id, 6000, 3000, 3036.66),
(v_table_id, 6000, 3500, 3370.98),
(v_table_id, 6000, 4000, 3740.15),
(v_table_id, 6000, 4500, 4255.41),
(v_table_id, 6000, 4600, 4464.41),
(v_table_id, 7000, 2000, 2907.81),
(v_table_id, 7000, 2500, 3108.67),
(v_table_id, 7000, 3000, 3457.35),
(v_table_id, 7000, 3500, 4061.96),
(v_table_id, 7000, 4000, 4484.28),
(v_table_id, 7000, 4500, 5091.11),
(v_table_id, 7000, 4600, 5251.77)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2852.63),
(v_table_id, 6000, 2500, 3103.31),
(v_table_id, 6000, 3000, 3353.99),
(v_table_id, 6000, 3500, 3757.85),
(v_table_id, 6000, 4000, 4240.17),
(v_table_id, 6000, 4500, 4769.24),
(v_table_id, 6000, 5000, 5536.52),
(v_table_id, 7000, 2000, 3227.50),
(v_table_id, 7000, 2500, 3511.65),
(v_table_id, 7000, 3000, 3795.80),
(v_table_id, 7000, 3500, 4253.98),
(v_table_id, 7000, 4000, 5016.58),
(v_table_id, 7000, 4500, 5608.78),
(v_table_id, 7000, 5000, 6481.23)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2852.63),
(v_table_id, 6000, 2500, 3103.31),
(v_table_id, 6000, 3000, 3353.99),
(v_table_id, 6000, 3500, 3757.85),
(v_table_id, 6000, 4000, 4240.17),
(v_table_id, 6000, 4500, 4769.24),
(v_table_id, 6000, 5000, 5536.52),
(v_table_id, 7000, 2000, 3227.50),
(v_table_id, 7000, 2500, 3511.65),
(v_table_id, 7000, 3000, 3795.80),
(v_table_id, 7000, 3500, 4475.05),
(v_table_id, 7000, 4000, 5016.58),
(v_table_id, 7000, 4500, 5608.78),
(v_table_id, 7000, 5000, 6399.69)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Topline XL Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Topline XL Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Topline XL","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 6000, 2000, 2914.73),
(v_table_id, 6000, 2500, 3180.93),
(v_table_id, 6000, 3000, 3590.42),
(v_table_id, 6000, 3500, 4060.37),
(v_table_id, 6000, 4000, 4576.86),
(v_table_id, 6000, 4500, 5503.17),
(v_table_id, 6000, 4700, 5812.33),
(v_table_id, 7000, 2000, 3299.95),
(v_table_id, 7000, 2500, 3602.21),
(v_table_id, 7000, 3000, 4288.58),
(v_table_id, 7000, 3500, 4817.23),
(v_table_id, 7000, 4000, 5396.32),
(v_table_id, 7000, 4500, 6152.78),
(v_table_id, 7000, 4700, 6500.40)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Designline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Designline Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Designline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 4500, 2980.87),
(v_table_id, 3000, 5000, 3511.66),
(v_table_id, 4000, 2500, 2792.84),
(v_table_id, 4000, 3000, 3000.27),
(v_table_id, 4000, 3500, 3207.70),
(v_table_id, 4000, 4000, 3415.13),
(v_table_id, 4000, 4500, 3622.56),
(v_table_id, 4000, 5000, 4316.64),
(v_table_id, 5000, 2500, 3267.99),
(v_table_id, 5000, 3000, 3517.06),
(v_table_id, 5000, 3500, 3766.12),
(v_table_id, 5000, 4000, 4015.18),
(v_table_id, 5000, 4500, 4264.24),
(v_table_id, 5000, 5000, 5579.50),
(v_table_id, 6000, 2500, 3954.01),
(v_table_id, 6000, 3000, 4269.77),
(v_table_id, 6000, 3500, 4585.54),
(v_table_id, 6000, 4000, 4901.30),
(v_table_id, 6000, 4500, 5386.04),
(v_table_id, 6000, 5000, 6553.45),
(v_table_id, 7000, 2500, 4598.14),
(v_table_id, 7000, 3000, 4955.53),
(v_table_id, 7000, 3500, 5312.93),
(v_table_id, 7000, 4000, 5670.33),
(v_table_id, 7000, 4500, 6027.73),
(v_table_id, 7000, 5000, 7358.43)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Designline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Designline Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Designline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 4500, 3345.87),
(v_table_id, 3000, 5000, 3511.66),
(v_table_id, 4000, 2500, 2792.84),
(v_table_id, 4000, 3000, 3000.27),
(v_table_id, 4000, 3500, 3207.70),
(v_table_id, 4000, 4000, 3415.13),
(v_table_id, 4000, 4500, 4109.21),
(v_table_id, 4000, 5000, 4316.64),
(v_table_id, 5000, 2500, 3267.99),
(v_table_id, 5000, 3000, 3517.06),
(v_table_id, 5000, 3500, 3766.12),
(v_table_id, 5000, 4000, 4015.18),
(v_table_id, 5000, 4500, 4872.56),
(v_table_id, 5000, 5000, 5121.62),
(v_table_id, 6000, 2500, 3954.01),
(v_table_id, 6000, 3000, 4269.77),
(v_table_id, 6000, 3500, 4585.54),
(v_table_id, 6000, 4000, 5070.28),
(v_table_id, 6000, 4500, 6237.69),
(v_table_id, 6000, 5000, 6553.45),
(v_table_id, 7000, 2500, 4598.14),
(v_table_id, 7000, 3000, 4955.53),
(v_table_id, 7000, 3500, 5312.93),
(v_table_id, 7000, 4000, 5670.33),
(v_table_id, 7000, 4500, 7001.04),
(v_table_id, 7000, 5000, 7358.43)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Designline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Designline Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Designline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 4500, 3415.73),
(v_table_id, 3000, 5000, 3589.29),
(v_table_id, 4000, 2500, 2844.59),
(v_table_id, 4000, 3000, 3062.37),
(v_table_id, 4000, 3500, 3280.15),
(v_table_id, 4000, 4000, 3497.93),
(v_table_id, 4000, 4500, 4202.36),
(v_table_id, 4000, 5000, 4420.14),
(v_table_id, 5000, 2500, 3332.68),
(v_table_id, 5000, 3000, 3594.68),
(v_table_id, 5000, 3500, 3856.68),
(v_table_id, 5000, 4000, 4118.68),
(v_table_id, 5000, 4500, 4989.00),
(v_table_id, 5000, 5000, 5251.00),
(v_table_id, 6000, 2500, 4031.63),
(v_table_id, 6000, 3000, 4362.92),
(v_table_id, 6000, 3500, 4863.19),
(v_table_id, 6000, 4000, 5194.48),
(v_table_id, 6000, 4500, 6377.41),
(v_table_id, 6000, 5000, 6708.70),
(v_table_id, 7000, 2500, 4688.70),
(v_table_id, 7000, 3000, 5064.21),
(v_table_id, 7000, 3500, 5439.72),
(v_table_id, 7000, 4000, 5815.23),
(v_table_id, 7000, 4500, 7164.05),
(v_table_id, 7000, 5000, 7539.56)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":1,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
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
(v_table_id, 7000, 6000, 10014.40)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":2,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
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
(v_table_id, 7000, 6000, 10014.40)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ultraline Glass (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ultraline Glass (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Ultraline","cover_type":"glass_clear","zone":3,"construction_type":"wall","structure_type":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
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
(v_table_id, 7000, 6000, 10231.75)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    -- Cleanup
    DELETE FROM pricing_addons WHERE addon_code = 'aluxe-v2-panorama-3';
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Panorama (3-Tor)';

    -- Create Table
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Panorama (3-Tor)', 'addon_matrix', true, 'EUR', '{"provider":"Aluxe","addon_group":"panorama","model_family":"Panorama","structure_type":"addon_matrix","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    -- Insert Matrix Entries
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
            
(v_table_id, 1500, 2000, 586.89),
(v_table_id, 1500, 2100, 589.14),
(v_table_id, 1500, 2200, 591.38),
(v_table_id, 1500, 2300, 593.63),
(v_table_id, 1500, 2400, 595.87),
(v_table_id, 1500, 2500, 598.12),
(v_table_id, 1500, 2600, 600.36),
(v_table_id, 1500, 2700, 602.61),
(v_table_id, 2000, 2000, 848.09),
(v_table_id, 2000, 2100, 850.33),
(v_table_id, 2000, 2200, 852.58),
(v_table_id, 2000, 2300, 854.82),
(v_table_id, 2000, 2400, 857.07),
(v_table_id, 2000, 2500, 859.31),
(v_table_id, 2000, 2600, 861.56),
(v_table_id, 2000, 2700, 863.80),
(v_table_id, 2500, 2000, 867.70),
(v_table_id, 2500, 2100, 869.95),
(v_table_id, 2500, 2200, 872.19),
(v_table_id, 2500, 2300, 874.44),
(v_table_id, 2500, 2400, 876.68),
(v_table_id, 2500, 2500, 878.93),
(v_table_id, 2500, 2600, 881.17),
(v_table_id, 2500, 2700, 883.42),
(v_table_id, 3000, 2000, 1128.90),
(v_table_id, 3000, 2100, 1131.14),
(v_table_id, 3000, 2200, 1133.39),
(v_table_id, 3000, 2300, 1135.63),
(v_table_id, 3000, 2400, 1137.88),
(v_table_id, 3000, 2500, 1140.12),
(v_table_id, 3000, 2600, 1142.36),
(v_table_id, 3000, 2700, 1144.61),
(v_table_id, 3500, 2000, 1148.51),
(v_table_id, 3500, 2100, 1150.76),
(v_table_id, 3500, 2200, 1153.00),
(v_table_id, 3500, 2300, 1155.25),
(v_table_id, 3500, 2400, 1157.49),
(v_table_id, 3500, 2500, 1159.74),
(v_table_id, 3500, 2600, 1161.98),
(v_table_id, 3500, 2700, 1164.22),
(v_table_id, 4000, 2000, 1409.71),
(v_table_id, 4000, 2100, 1411.95),
(v_table_id, 4000, 2200, 1414.20),
(v_table_id, 4000, 2300, 1416.44),
(v_table_id, 4000, 2400, 1418.68),
(v_table_id, 4000, 2500, 1420.93),
(v_table_id, 4000, 2600, 1423.17),
(v_table_id, 4000, 2700, 1425.42),
(v_table_id, 4500, 2000, 1429.32),
(v_table_id, 4500, 2100, 1431.57),
(v_table_id, 4500, 2200, 1433.81),
(v_table_id, 4500, 2300, 1436.06),
(v_table_id, 4500, 2400, 1438.30),
(v_table_id, 4500, 2500, 1440.54),
(v_table_id, 4500, 2600, 1442.79),
(v_table_id, 4500, 2700, 1445.03),
(v_table_id, 5000, 2000, 1690.52),
(v_table_id, 5000, 2100, 1692.76),
(v_table_id, 5000, 2200, 1695.00),
(v_table_id, 5000, 2300, 1697.25),
(v_table_id, 5000, 2400, 1699.49),
(v_table_id, 5000, 2500, 1701.74),
(v_table_id, 5000, 2600, 1703.98),
(v_table_id, 5000, 2700, 1706.23),
(v_table_id, 5500, 2000, 1951.71),
(v_table_id, 5500, 2100, 1953.95),
(v_table_id, 5500, 2200, 1956.20),
(v_table_id, 5500, 2300, 1958.44),
(v_table_id, 5500, 2400, 1960.69),
(v_table_id, 5500, 2500, 1962.93),
(v_table_id, 5500, 2600, 1965.18),
(v_table_id, 5500, 2700, 1967.42),
(v_table_id, 6000, 2000, 1971.32),
(v_table_id, 6000, 2100, 1973.57),
(v_table_id, 6000, 2200, 1975.81),
(v_table_id, 6000, 2300, 1978.06),
(v_table_id, 6000, 2400, 1980.30),
(v_table_id, 6000, 2500, 1982.55),
(v_table_id, 6000, 2600, 1984.79),
(v_table_id, 6000, 2700, 1987.04),
(v_table_id, 6500, 2000, 2232.52),
(v_table_id, 6500, 2100, 2234.76),
(v_table_id, 6500, 2200, 2237.01),
(v_table_id, 6500, 2300, 2239.25),
(v_table_id, 6500, 2400, 2241.50),
(v_table_id, 6500, 2500, 2243.74),
(v_table_id, 6500, 2600, 2245.99),
(v_table_id, 6500, 2700, 2248.23),
(v_table_id, 7000, 2000, 2252.13),
(v_table_id, 7000, 2100, 2254.38),
(v_table_id, 7000, 2200, 2256.62),
(v_table_id, 7000, 2300, 2258.87),
(v_table_id, 7000, 2400, 2261.11),
(v_table_id, 7000, 2500, 2263.36),
(v_table_id, 7000, 2600, 2265.60),
(v_table_id, 7000, 2700, 2267.85),
(v_table_id, 7500, 2000, 2513.33),
(v_table_id, 7500, 2100, 2515.57),
(v_table_id, 7500, 2200, 2517.82),
(v_table_id, 7500, 2300, 2520.06),
(v_table_id, 7500, 2400, 2522.30),
(v_table_id, 7500, 2500, 2524.55),
(v_table_id, 7500, 2600, 2526.79),
(v_table_id, 7500, 2700, 2529.04),
(v_table_id, 8000, 2000, 2532.94),
(v_table_id, 8000, 2100, 2535.19),
(v_table_id, 8000, 2200, 2537.43),
(v_table_id, 8000, 2300, 2539.68),
(v_table_id, 8000, 2400, 2541.92),
(v_table_id, 8000, 2500, 2544.17),
(v_table_id, 8000, 2600, 2546.41),
(v_table_id, 8000, 2700, 2548.65),
(v_table_id, 8500, 2000, 2794.14),
(v_table_id, 8500, 2100, 2796.38),
(v_table_id, 8500, 2200, 2798.62),
(v_table_id, 8500, 2300, 2800.87),
(v_table_id, 8500, 2400, 2803.11),
(v_table_id, 8500, 2500, 2805.36),
(v_table_id, 8500, 2600, 2807.60),
(v_table_id, 8500, 2700, 2809.85)
;

    INSERT INTO pricing_addons (addon_code, addon_name, addon_group, unit, price_upe_net_eur, price_table_id, properties)
    VALUES ('aluxe-v2-panorama-3', 'Panorama V2 (3-Tor)', 'panorama', 'piece', 0, v_table_id, '{"provider": "Aluxe"}'::jsonb);
            
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    -- Cleanup
    DELETE FROM pricing_addons WHERE addon_code = 'aluxe-v2-panorama-5';
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Panorama (5-Tor)';

    -- Create Table
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Panorama (5-Tor)', 'addon_matrix', true, 'EUR', '{"provider":"Aluxe","addon_group":"panorama","model_family":"Panorama","structure_type":"addon_matrix","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    -- Insert Matrix Entries
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
            
(v_table_id, 1500, 2000, 634.21),
(v_table_id, 1500, 2100, 636.46),
(v_table_id, 1500, 2200, 638.70),
(v_table_id, 1500, 2300, 640.95),
(v_table_id, 1500, 2400, 643.19),
(v_table_id, 1500, 2500, 645.43),
(v_table_id, 1500, 2600, 647.68),
(v_table_id, 1500, 2700, 649.92),
(v_table_id, 2000, 2000, 914.34),
(v_table_id, 2000, 2100, 916.58),
(v_table_id, 2000, 2200, 918.83),
(v_table_id, 2000, 2300, 921.07),
(v_table_id, 2000, 2400, 923.32),
(v_table_id, 2000, 2500, 925.56),
(v_table_id, 2000, 2600, 927.80),
(v_table_id, 2000, 2700, 930.05),
(v_table_id, 2500, 2000, 943.41),
(v_table_id, 2500, 2100, 945.65),
(v_table_id, 2500, 2200, 947.90),
(v_table_id, 2500, 2300, 950.14),
(v_table_id, 2500, 2400, 952.39),
(v_table_id, 2500, 2500, 954.63),
(v_table_id, 2500, 2600, 956.87),
(v_table_id, 2500, 2700, 959.12),
(v_table_id, 3000, 2000, 1223.53),
(v_table_id, 3000, 2100, 1225.78),
(v_table_id, 3000, 2200, 1228.02),
(v_table_id, 3000, 2300, 1230.27),
(v_table_id, 3000, 2400, 1232.51),
(v_table_id, 3000, 2500, 1234.75),
(v_table_id, 3000, 2600, 1237.00),
(v_table_id, 3000, 2700, 1239.24),
(v_table_id, 3500, 2000, 1252.60),
(v_table_id, 3500, 2100, 1254.85),
(v_table_id, 3500, 2200, 1257.09),
(v_table_id, 3500, 2300, 1259.34),
(v_table_id, 3500, 2400, 1261.58),
(v_table_id, 3500, 2500, 1263.82),
(v_table_id, 3500, 2600, 1266.07),
(v_table_id, 3500, 2700, 1268.31),
(v_table_id, 4000, 2000, 1532.73),
(v_table_id, 4000, 2100, 1534.97),
(v_table_id, 4000, 2200, 1537.22),
(v_table_id, 4000, 2300, 1539.46),
(v_table_id, 4000, 2400, 1541.71),
(v_table_id, 4000, 2500, 1543.95),
(v_table_id, 4000, 2600, 1546.19),
(v_table_id, 4000, 2700, 1548.44),
(v_table_id, 4500, 2000, 1561.80),
(v_table_id, 4500, 2100, 1564.04),
(v_table_id, 4500, 2200, 1566.29),
(v_table_id, 4500, 2300, 1568.53),
(v_table_id, 4500, 2400, 1570.78),
(v_table_id, 4500, 2500, 1573.02),
(v_table_id, 4500, 2600, 1575.26),
(v_table_id, 4500, 2700, 1577.51),
(v_table_id, 5000, 2000, 1841.92),
(v_table_id, 5000, 2100, 1844.17),
(v_table_id, 5000, 2200, 1846.41),
(v_table_id, 5000, 2300, 1848.66),
(v_table_id, 5000, 2400, 1850.90),
(v_table_id, 5000, 2500, 1853.15),
(v_table_id, 5000, 2600, 1855.39),
(v_table_id, 5000, 2700, 1857.63),
(v_table_id, 5500, 2000, 2122.05),
(v_table_id, 5500, 2100, 2124.29),
(v_table_id, 5500, 2200, 2126.54),
(v_table_id, 5500, 2300, 2128.78),
(v_table_id, 5500, 2400, 2131.03),
(v_table_id, 5500, 2500, 2133.27),
(v_table_id, 5500, 2600, 2135.51),
(v_table_id, 5500, 2700, 2137.76),
(v_table_id, 6000, 2000, 2151.12),
(v_table_id, 6000, 2100, 2153.36),
(v_table_id, 6000, 2200, 2155.61),
(v_table_id, 6000, 2300, 2157.85),
(v_table_id, 6000, 2400, 2160.10),
(v_table_id, 6000, 2500, 2162.34),
(v_table_id, 6000, 2600, 2164.58),
(v_table_id, 6000, 2700, 2166.83),
(v_table_id, 6500, 2000, 2431.24),
(v_table_id, 6500, 2100, 2433.49),
(v_table_id, 6500, 2200, 2435.73),
(v_table_id, 6500, 2300, 2437.98),
(v_table_id, 6500, 2400, 2440.22),
(v_table_id, 6500, 2500, 2442.46),
(v_table_id, 6500, 2600, 2444.71),
(v_table_id, 6500, 2700, 2446.95),
(v_table_id, 7000, 2000, 2460.31),
(v_table_id, 7000, 2100, 2462.56),
(v_table_id, 7000, 2200, 2464.80),
(v_table_id, 7000, 2300, 2467.05),
(v_table_id, 7000, 2400, 2469.29),
(v_table_id, 7000, 2500, 2471.53),
(v_table_id, 7000, 2600, 2473.78),
(v_table_id, 7000, 2700, 2476.02),
(v_table_id, 7500, 2000, 2740.44),
(v_table_id, 7500, 2100, 2742.68),
(v_table_id, 7500, 2200, 2744.93),
(v_table_id, 7500, 2300, 2747.17),
(v_table_id, 7500, 2400, 2749.42),
(v_table_id, 7500, 2500, 2751.66),
(v_table_id, 7500, 2600, 2753.90),
(v_table_id, 7500, 2700, 2756.15),
(v_table_id, 8000, 2000, 2769.51),
(v_table_id, 8000, 2100, 2771.75),
(v_table_id, 8000, 2200, 2774.00),
(v_table_id, 8000, 2300, 2776.24),
(v_table_id, 8000, 2400, 2778.49),
(v_table_id, 8000, 2500, 2780.73),
(v_table_id, 8000, 2600, 2782.97),
(v_table_id, 8000, 2700, 2785.22),
(v_table_id, 8500, 2000, 3049.63),
(v_table_id, 8500, 2100, 3051.88),
(v_table_id, 8500, 2200, 3054.12),
(v_table_id, 8500, 2300, 3056.37),
(v_table_id, 8500, 2400, 3058.61),
(v_table_id, 8500, 2500, 3060.85),
(v_table_id, 8500, 2600, 3063.10),
(v_table_id, 8500, 2700, 3065.34)
;

    INSERT INTO pricing_addons (addon_code, addon_name, addon_group, unit, price_upe_net_eur, price_table_id, properties)
    VALUES ('aluxe-v2-panorama-5', 'Panorama V2 (5-Tor)', 'panorama', 'piece', 0, v_table_id, '{"provider": "Aluxe"}'::jsonb);
            
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Side Wall (Glass)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Side Wall (Glass)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Side Wall","cover_type":"Glass","construction_type":"wall","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 0, 1000, 596.84),
(v_table_id, 0, 1500, 795.79),
(v_table_id, 0, 2000, 882.94),
(v_table_id, 0, 2500, 1067.69),
(v_table_id, 0, 3000, 1163.37),
(v_table_id, 0, 3500, 1371.79),
(v_table_id, 0, 4000, 1466.52),
(v_table_id, 0, 4500, 1672.10),
(v_table_id, 0, 5000, 1768.73)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Front Wall (Glass)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Front Wall (Glass)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Front Wall","cover_type":"Glass","construction_type":"wall","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 1000, 0, 546.63),
(v_table_id, 2000, 0, 776.84),
(v_table_id, 3000, 0, 1019.37),
(v_table_id, 4000, 0, 1261.90),
(v_table_id, 5000, 0, 1514.84),
(v_table_id, 6000, 0, 1653.16),
(v_table_id, 7000, 0, 1861.58)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sliding Door';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sliding Door', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Sliding Door","cover_type":"Glass","construction_type":"wall","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 2000, 0, 1198.42),
(v_table_id, 2500, 0, 1286.52),
(v_table_id, 3000, 0, 1817.05),
(v_table_id, 3500, 0, 1932.63),
(v_table_id, 4000, 0, 2053.90),
(v_table_id, 4500, 0, 2174.21),
(v_table_id, 5000, 0, 2376.00),
(v_table_id, 5500, 0, 2922.63),
(v_table_id, 6000, 0, 3107.37)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Wedge (Glass)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Wedge","cover_type":"Glass","construction_type":"wall","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 0, 2000, 480.31),
(v_table_id, 0, 2500, 525.79),
(v_table_id, 0, 3000, 570.31),
(v_table_id, 0, 3500, 614.84),
(v_table_id, 0, 4000, 678.31),
(v_table_id, 0, 4500, 720.95),
(v_table_id, 0, 5000, 765.48),
(v_table_id, 0, 55, 38.40),
(v_table_id, 0, 891, 20.07)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - On-Roof Awning';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - On-Roof Awning', 'addon_matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"On-Roof Awning","addon_group":"awning","structure_type":"addon_matrix","pricing_method":"matrix","match_type":"projection"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 2500, 1465.14),
(v_table_id, 3000, 3000, 1532.70),
(v_table_id, 3000, 3500, 1600.20),
(v_table_id, 3000, 4000, 1703.70),
(v_table_id, 3000, 4500, 1772.10),
(v_table_id, 3000, 5000, 1838.70),
(v_table_id, 3500, 2500, 1566.00),
(v_table_id, 3500, 3000, 1641.60),
(v_table_id, 3500, 3500, 1718.10),
(v_table_id, 3500, 4000, 1830.60),
(v_table_id, 3500, 4500, 1907.10),
(v_table_id, 3500, 5000, 1983.60),
(v_table_id, 4000, 2500, 1659.60),
(v_table_id, 4000, 3000, 1744.20),
(v_table_id, 4000, 3500, 1829.70),
(v_table_id, 4000, 4000, 1951.20),
(v_table_id, 4000, 4500, 2035.80),
(v_table_id, 4000, 5000, 2121.30),
(v_table_id, 4500, 2500, 1746.90),
(v_table_id, 4500, 3000, 1840.50),
(v_table_id, 4500, 3500, 1935.00),
(v_table_id, 4500, 4000, 2064.60),
(v_table_id, 4500, 4500, 2159.10),
(v_table_id, 4500, 5000, 2251.80),
(v_table_id, 5000, 2500, 1841.40),
(v_table_id, 5000, 3000, 1943.10),
(v_table_id, 5000, 3500, 2045.70),
(v_table_id, 5000, 4000, 2185.20),
(v_table_id, 5000, 4500, 2287.80),
(v_table_id, 5000, 5000, 2389.50),
(v_table_id, 5500, 2500, 1943.10),
(v_table_id, 5500, 3000, 2053.80),
(v_table_id, 5500, 3500, 2165.40),
(v_table_id, 5500, 4000, 2313.00),
(v_table_id, 5500, 4500, 2424.60),
(v_table_id, 5500, 5000, 2535.30),
(v_table_id, 6000, 2500, 2036.70),
(v_table_id, 6000, 3000, 2156.40),
(v_table_id, 6000, 3500, 2277.00),
(v_table_id, 6000, 4000, 2433.60),
(v_table_id, 6000, 4500, 2553.30),
(v_table_id, 6000, 5000, 2673.00),
(v_table_id, 6000, 2500, 2977.20),
(v_table_id, 6000, 3000, 3112.20),
(v_table_id, 6000, 3500, 3247.20),
(v_table_id, 6000, 4000, 3455.10),
(v_table_id, 6000, 4500, 3591.00),
(v_table_id, 6000, 5000, 3725.10),
(v_table_id, 7000, 2500, 3178.80),
(v_table_id, 7000, 3000, 3330.00),
(v_table_id, 7000, 3500, 3483.00),
(v_table_id, 7000, 4000, 3708.90),
(v_table_id, 7000, 4500, 3861.90),
(v_table_id, 7000, 5000, 4013.10),
(v_table_id, 8000, 2500, 3366.90),
(v_table_id, 8000, 3000, 3536.10),
(v_table_id, 8000, 3500, 3706.20),
(v_table_id, 8000, 4000, 3949.20),
(v_table_id, 8000, 4500, 4119.30),
(v_table_id, 8000, 5000, 4289.40),
(v_table_id, 9000, 2500, 3541.50),
(v_table_id, 9000, 3000, 3728.70),
(v_table_id, 9000, 3500, 3915.90),
(v_table_id, 9000, 4000, 4176.90),
(v_table_id, 9000, 4500, 4364.10),
(v_table_id, 9000, 5000, 4551.30),
(v_table_id, 10000, 2500, 3729.60),
(v_table_id, 10000, 3000, 3933.90),
(v_table_id, 10000, 3500, 4139.10),
(v_table_id, 10000, 4000, 4417.20),
(v_table_id, 10000, 4500, 4622.40),
(v_table_id, 10000, 5000, 4826.70),
(v_table_id, 11000, 2500, 3933.00),
(v_table_id, 11000, 3000, 4155.30),
(v_table_id, 11000, 3500, 4377.60),
(v_table_id, 11000, 4000, 4672.80),
(v_table_id, 11000, 4500, 4896.00),
(v_table_id, 11000, 5000, 5117.40),
(v_table_id, 12000, 2500, 4121.10),
(v_table_id, 12000, 3000, 4360.50),
(v_table_id, 12000, 3500, 4600.80),
(v_table_id, 12000, 4000, 4914.00),
(v_table_id, 12000, 4500, 5153.40),
(v_table_id, 12000, 5000, 5392.80)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Under-Roof Awning';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Under-Roof Awning', 'addon_matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Under-Roof Awning","addon_group":"awning","structure_type":"addon_matrix","pricing_method":"matrix","match_type":"projection"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 3000, 0, 2.00),
(v_table_id, 3000, 2500, 1465.14),
(v_table_id, 3000, 3000, 1532.70),
(v_table_id, 3000, 3500, 1600.20),
(v_table_id, 3000, 4000, 1703.70),
(v_table_id, 3000, 4500, 1772.10),
(v_table_id, 3000, 5000, 1838.70),
(v_table_id, 3500, 0, 2.00),
(v_table_id, 3500, 2500, 1566.00),
(v_table_id, 3500, 3000, 1641.60),
(v_table_id, 3500, 3500, 1718.10),
(v_table_id, 3500, 4000, 1830.60),
(v_table_id, 3500, 4500, 1907.10),
(v_table_id, 3500, 5000, 1983.60),
(v_table_id, 4000, 0, 2.00),
(v_table_id, 4000, 2500, 1659.60),
(v_table_id, 4000, 3000, 1744.20),
(v_table_id, 4000, 3500, 1829.70),
(v_table_id, 4000, 4000, 1951.20),
(v_table_id, 4000, 4500, 2035.80),
(v_table_id, 4000, 5000, 2121.30),
(v_table_id, 4500, 0, 2.00),
(v_table_id, 4500, 2500, 1746.90),
(v_table_id, 4500, 3000, 1840.50),
(v_table_id, 4500, 3500, 1935.00),
(v_table_id, 4500, 4000, 2064.60),
(v_table_id, 4500, 4500, 2159.10),
(v_table_id, 4500, 5000, 2251.80),
(v_table_id, 5000, 0, 2.00),
(v_table_id, 5000, 2500, 1841.40),
(v_table_id, 5000, 3000, 1943.10),
(v_table_id, 5000, 3500, 2045.70),
(v_table_id, 5000, 4000, 2185.20),
(v_table_id, 5000, 4500, 2287.80),
(v_table_id, 5000, 5000, 2389.50),
(v_table_id, 5500, 0, 2.00),
(v_table_id, 5500, 2500, 1943.10),
(v_table_id, 5500, 3000, 2053.80),
(v_table_id, 5500, 3500, 2165.40),
(v_table_id, 5500, 4000, 2313.00),
(v_table_id, 5500, 4500, 2424.60),
(v_table_id, 5500, 5000, 2535.30),
(v_table_id, 6000, 0, 2.00),
(v_table_id, 6000, 2500, 2036.70),
(v_table_id, 6000, 3000, 2156.40),
(v_table_id, 6000, 3500, 2277.00),
(v_table_id, 6000, 4000, 2433.60),
(v_table_id, 6000, 4500, 2553.30),
(v_table_id, 6000, 5000, 2673.00),
(v_table_id, 6000, 0, 4.00),
(v_table_id, 6000, 2500, 2977.20),
(v_table_id, 6000, 3000, 3112.20),
(v_table_id, 6000, 3500, 3247.20),
(v_table_id, 6000, 4000, 3455.10),
(v_table_id, 6000, 4500, 3591.00),
(v_table_id, 6000, 5000, 3725.10),
(v_table_id, 7000, 0, 4.00),
(v_table_id, 7000, 2500, 3178.80),
(v_table_id, 7000, 3000, 3330.00),
(v_table_id, 7000, 3500, 3483.00),
(v_table_id, 7000, 4000, 3708.90),
(v_table_id, 7000, 4500, 3861.90),
(v_table_id, 7000, 5000, 4013.10),
(v_table_id, 8000, 0, 4.00),
(v_table_id, 8000, 2500, 3366.90),
(v_table_id, 8000, 3000, 3536.10),
(v_table_id, 8000, 3500, 3706.20),
(v_table_id, 8000, 4000, 3949.20),
(v_table_id, 8000, 4500, 4119.30),
(v_table_id, 8000, 5000, 4289.40),
(v_table_id, 9000, 0, 4.00),
(v_table_id, 9000, 2500, 3541.50),
(v_table_id, 9000, 3000, 3728.70),
(v_table_id, 9000, 3500, 3915.90),
(v_table_id, 9000, 4000, 4176.90),
(v_table_id, 9000, 4500, 4364.10),
(v_table_id, 9000, 5000, 4551.30),
(v_table_id, 10000, 0, 4.00),
(v_table_id, 10000, 2500, 3729.60),
(v_table_id, 10000, 3000, 3933.90),
(v_table_id, 10000, 3500, 4139.10),
(v_table_id, 10000, 4000, 4417.20),
(v_table_id, 10000, 4500, 4622.40),
(v_table_id, 10000, 5000, 4826.70),
(v_table_id, 11000, 0, 4.00),
(v_table_id, 11000, 2500, 3933.00),
(v_table_id, 11000, 3000, 4155.30),
(v_table_id, 11000, 3500, 4377.60),
(v_table_id, 11000, 4000, 4672.80),
(v_table_id, 11000, 4500, 4896.00),
(v_table_id, 11000, 5000, 5117.40),
(v_table_id, 12000, 0, 4.00),
(v_table_id, 12000, 2500, 4121.10),
(v_table_id, 12000, 3000, 4360.50),
(v_table_id, 12000, 3500, 4600.80),
(v_table_id, 12000, 4000, 4914.00),
(v_table_id, 12000, 4500, 5153.40),
(v_table_id, 12000, 5000, 5392.80)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - ZIP Screen';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - ZIP Screen', 'addon_matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"ZIP Screen","addon_group":"zip_screen","structure_type":"addon_matrix","pricing_method":"matrix","match_type":"height"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 1500, 1000, 655.22),
(v_table_id, 1500, 1250, 681.27),
(v_table_id, 1500, 1500, 707.34),
(v_table_id, 1500, 1750, 733.39),
(v_table_id, 1500, 2000, 759.44),
(v_table_id, 1500, 2250, 785.51),
(v_table_id, 1500, 2500, 811.56),
(v_table_id, 1500, 2750, 837.61),
(v_table_id, 1500, 3000, 863.66),
(v_table_id, 1750, 1000, 682.51),
(v_table_id, 1750, 1250, 710.77),
(v_table_id, 1750, 1500, 739.02),
(v_table_id, 1750, 1750, 767.29),
(v_table_id, 1750, 2000, 795.53),
(v_table_id, 1750, 2250, 823.81),
(v_table_id, 1750, 2500, 852.05),
(v_table_id, 1750, 2750, 880.30),
(v_table_id, 1750, 3000, 908.54),
(v_table_id, 2000, 1000, 704.45),
(v_table_id, 2000, 1250, 734.91),
(v_table_id, 2000, 1500, 765.35),
(v_table_id, 2000, 1750, 795.82),
(v_table_id, 2000, 2000, 826.26),
(v_table_id, 2000, 2250, 856.74),
(v_table_id, 2000, 2500, 887.17),
(v_table_id, 2000, 2750, 917.63),
(v_table_id, 2000, 3000, 948.07),
(v_table_id, 2250, 1000, 726.39),
(v_table_id, 2250, 1250, 759.06),
(v_table_id, 2250, 1500, 791.71),
(v_table_id, 2250, 1750, 824.37),
(v_table_id, 2250, 2000, 857.01),
(v_table_id, 2250, 2250, 889.68),
(v_table_id, 2250, 2500, 922.32),
(v_table_id, 2250, 2750, 954.97),
(v_table_id, 2250, 3000, 987.61),
(v_table_id, 2500, 1000, 748.36),
(v_table_id, 2500, 1250, 783.21),
(v_table_id, 2500, 1500, 818.06),
(v_table_id, 2500, 1750, 852.92),
(v_table_id, 2500, 2000, 887.75),
(v_table_id, 2500, 2250, 922.63),
(v_table_id, 2500, 2500, 957.46),
(v_table_id, 2500, 2750, 992.32),
(v_table_id, 2500, 3000, 1027.15),
(v_table_id, 2750, 1000, 773.79),
(v_table_id, 2750, 1250, 810.84),
(v_table_id, 2750, 1500, 847.90),
(v_table_id, 2750, 1750, 884.96),
(v_table_id, 2750, 2000, 921.98),
(v_table_id, 2750, 2250, 959.06),
(v_table_id, 2750, 2500, 996.08),
(v_table_id, 2750, 2750, 1033.15),
(v_table_id, 2750, 3000, 1070.18),
(v_table_id, 3000, 1000, 795.73),
(v_table_id, 3000, 1250, 834.98),
(v_table_id, 3000, 1500, 874.23),
(v_table_id, 3000, 1750, 913.48),
(v_table_id, 3000, 2000, 952.71),
(v_table_id, 3000, 2250, 992.00),
(v_table_id, 3000, 2500, 1031.22),
(v_table_id, 3000, 2750, 1070.47),
(v_table_id, 3000, 3000, 1109.70),
(v_table_id, 3250, 1000, 821.19),
(v_table_id, 3250, 1250, 862.63),
(v_table_id, 3250, 1500, 904.09),
(v_table_id, 3250, 1750, 945.54),
(v_table_id, 3250, 2000, 986.96),
(v_table_id, 3250, 2250, 1028.43),
(v_table_id, 3250, 2500, 1069.86),
(v_table_id, 3250, 2750, 1111.31),
(v_table_id, 3250, 3000, 1152.75),
(v_table_id, 3500, 1000, 843.17),
(v_table_id, 3500, 1250, 886.81),
(v_table_id, 3500, 1500, 930.46),
(v_table_id, 3500, 1750, 974.11),
(v_table_id, 3500, 2000, 1017.74),
(v_table_id, 3500, 2250, 1061.40),
(v_table_id, 3500, 2500, 1105.04),
(v_table_id, 3500, 2750, 1148.68),
(v_table_id, 3500, 3000, 1192.32),
(v_table_id, 3750, 1000, 865.09),
(v_table_id, 3750, 1250, 910.94),
(v_table_id, 3750, 1500, 956.78),
(v_table_id, 3750, 1750, 1002.64),
(v_table_id, 3750, 2000, 1048.47),
(v_table_id, 3750, 2250, 1094.34),
(v_table_id, 3750, 2500, 1140.16),
(v_table_id, 3750, 2750, 1186.00),
(v_table_id, 3750, 3000, 1231.83),
(v_table_id, 4000, 1000, 887.05),
(v_table_id, 4000, 1250, 935.10),
(v_table_id, 4000, 1500, 983.13),
(v_table_id, 4000, 1750, 1031.18),
(v_table_id, 4000, 2000, 1079.22),
(v_table_id, 4000, 2250, 1127.29),
(v_table_id, 4000, 2500, 1175.30),
(v_table_id, 4000, 2750, 1223.35),
(v_table_id, 4000, 3000, 1271.39),
(v_table_id, 4250, 1000, 912.49),
(v_table_id, 4250, 1250, 962.75),
(v_table_id, 4250, 1500, 1012.99),
(v_table_id, 4250, 1750, 1063.24),
(v_table_id, 4250, 2000, 1113.46),
(v_table_id, 4250, 2250, 1163.72),
(v_table_id, 4250, 2500, 1213.96),
(v_table_id, 4250, 2750, 1264.19),
(v_table_id, 4250, 3000, 1314.41),
(v_table_id, 4500, 1000, 934.43),
(v_table_id, 4500, 1250, 986.88),
(v_table_id, 4500, 1500, 1039.32),
(v_table_id, 4500, 1750, 1091.76),
(v_table_id, 4500, 2000, 1144.19),
(v_table_id, 4500, 2250, 1196.65),
(v_table_id, 4500, 2500, 1249.07),
(v_table_id, 4500, 2750, 1301.52),
(v_table_id, 4500, 3000, 1353.94),
(v_table_id, 4750, 1000, 959.96),
(v_table_id, 4750, 1250, 1014.59),
(v_table_id, 4750, 1500, 1069.24),
(v_table_id, 4750, 1750, 1123.88),
(v_table_id, 4750, 2000, 1178.50),
(v_table_id, 4750, 2250, 1233.16),
(v_table_id, 4750, 2500, 1287.77),
(v_table_id, 4750, 2750, 1342.42),
(v_table_id, 4750, 3000, 1397.05),
(v_table_id, 5000, 1000, 1004.18),
(v_table_id, 5000, 1250, 1061.04),
(v_table_id, 5000, 1500, 1117.87),
(v_table_id, 5000, 1750, 1174.71),
(v_table_id, 5000, 2000, 1231.52),
(v_table_id, 5000, 2250, 1288.40),
(v_table_id, 5000, 2500, 1345.22),
(v_table_id, 5000, 2750, 1402.06),
(v_table_id, 5000, 3000, 1458.87),
(v_table_id, 5250, 1000, 1030.71),
(v_table_id, 5250, 1250, 1089.75),
(v_table_id, 5250, 1500, 1148.80),
(v_table_id, 5250, 1750, 1207.84),
(v_table_id, 5250, 2000, 1266.84),
(v_table_id, 5250, 2250, 1325.90),
(v_table_id, 5250, 2500, 1384.92),
(v_table_id, 5250, 2750, 1443.96),
(v_table_id, 5250, 3000, 1502.98),
(v_table_id, 5500, 1000, 1053.66),
(v_table_id, 5500, 1250, 1114.89),
(v_table_id, 5500, 1500, 1176.14),
(v_table_id, 5500, 1750, 1237.36),
(v_table_id, 5500, 2000, 1298.59),
(v_table_id, 5500, 2250, 1359.84),
(v_table_id, 5500, 2500, 1421.07),
(v_table_id, 5500, 2750, 1482.30),
(v_table_id, 5500, 3000, 1543.53),
(v_table_id, 5750, 1000, 1076.57),
(v_table_id, 5750, 1250, 1140.01),
(v_table_id, 5750, 1500, 1203.44),
(v_table_id, 5750, 1750, 1266.89),
(v_table_id, 5750, 2000, 1330.31),
(v_table_id, 5750, 2250, 1393.77),
(v_table_id, 5750, 2500, 1457.18),
(v_table_id, 5750, 2750, 1520.61),
(v_table_id, 5750, 3000, 1584.03),
(v_table_id, 6000, 1000, 1099.55),
(v_table_id, 6000, 1250, 1165.19),
(v_table_id, 6000, 1500, 1230.80),
(v_table_id, 6000, 1750, 1296.44),
(v_table_id, 6000, 2000, 1362.07),
(v_table_id, 6000, 2250, 1427.72),
(v_table_id, 6000, 2500, 1493.32),
(v_table_id, 6000, 2750, 1558.96),
(v_table_id, 6000, 3000, 1624.59)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":1,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 3594.61746, 3839.13),
(v_table_id, 40004500, 529.92, 596.16),
(v_table_id, 40004500, 4124.53746, 4435.29),
(v_table_id, 40004500, 132.48000000000002, 149.04),
(v_table_id, 40004500, 508.4639999999998, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 2, 2.00),
(v_table_id, 40004500, 16, 18.00),
(v_table_id, 40005000, 3594.61746, 4083.64),
(v_table_id, 40005000, 529.92, 662.40),
(v_table_id, 40005000, 4124.53746, 4746.04),
(v_table_id, 40005000, 132.48000000000002, 165.60),
(v_table_id, 40005000, 508.4639999999998, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 2, 2.00),
(v_table_id, 40005000, 16, 20.00),
(v_table_id, 50003000, 3594.61746, 3582.76),
(v_table_id, 50003000, 529.92, 496.80),
(v_table_id, 50003000, 4124.53746, 4079.56),
(v_table_id, 50003000, 132.48000000000002, 124.20),
(v_table_id, 50003000, 508.4639999999998, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 2, 2.00),
(v_table_id, 50003000, 16, 15.00),
(v_table_id, 50003500, 3594.61746, 3865.89),
(v_table_id, 50003500, 529.92, 579.60),
(v_table_id, 50003500, 4124.53746, 4445.49),
(v_table_id, 50003500, 132.48000000000002, 144.90),
(v_table_id, 50003500, 508.4639999999998, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 2, 2.00),
(v_table_id, 50003500, 16, 17.50),
(v_table_id, 50004000, 3594.61746, 4149.02),
(v_table_id, 50004000, 529.92, 662.40),
(v_table_id, 50004000, 4124.53746, 4811.42),
(v_table_id, 50004000, 132.48000000000002, 165.60),
(v_table_id, 50004000, 508.4639999999998, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 2, 2.00),
(v_table_id, 50004000, 16, 20.00),
(v_table_id, 50004500, 3594.61746, 4432.16),
(v_table_id, 50004500, 529.92, 745.20),
(v_table_id, 50004500, 4124.53746, 5177.36),
(v_table_id, 50004500, 132.48000000000002, 186.30),
(v_table_id, 50004500, 508.4639999999998, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 2, 2.00),
(v_table_id, 50004500, 16, 22.50),
(v_table_id, 50005000, 3594.61746, 4715.29),
(v_table_id, 50005000, 529.92, 828.00),
(v_table_id, 50005000, 4124.53746, 5543.29),
(v_table_id, 50005000, 132.48000000000002, 207.00),
(v_table_id, 50005000, 508.4639999999998, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 2, 2.00),
(v_table_id, 50005000, 16, 25.00),
(v_table_id, 60003000, 3594.61746, 4059.93),
(v_table_id, 60003000, 529.92, 596.16),
(v_table_id, 60003000, 4124.53746, 4656.09),
(v_table_id, 60003000, 132.48000000000002, 149.04),
(v_table_id, 60003000, 508.4639999999998, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 2, 2.00),
(v_table_id, 60003000, 16, 18.00),
(v_table_id, 60003500, 3594.61746, 4381.68),
(v_table_id, 60003500, 529.92, 695.52),
(v_table_id, 60003500, 4124.53746, 5077.20),
(v_table_id, 60003500, 132.48000000000002, 173.88),
(v_table_id, 60003500, 508.4639999999998, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 2, 2.00),
(v_table_id, 60003500, 16, 21.00),
(v_table_id, 60004000, 3594.61746, 4703.43),
(v_table_id, 60004000, 529.92, 794.88),
(v_table_id, 60004000, 4124.53746, 5498.31),
(v_table_id, 60004000, 132.48000000000002, 198.72),
(v_table_id, 60004000, 508.4639999999998, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 2, 2.00),
(v_table_id, 60004000, 16, 24.00),
(v_table_id, 60004500, 3594.61746, 5025.18),
(v_table_id, 60004500, 529.92, 894.24),
(v_table_id, 60004500, 4124.53746, 5919.42),
(v_table_id, 60004500, 132.48000000000002, 223.56),
(v_table_id, 60004500, 508.4639999999998, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 2, 2.00),
(v_table_id, 60004500, 16, 27.00),
(v_table_id, 60005000, 3594.61746, 5346.93),
(v_table_id, 60005000, 529.92, 993.60),
(v_table_id, 60005000, 4124.53746, 6340.53),
(v_table_id, 60005000, 132.48000000000002, 248.40),
(v_table_id, 60005000, 508.4639999999998, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 2, 2.00),
(v_table_id, 60005000, 16, 30.00),
(v_table_id, 70003000, 3594.61746, 4537.10),
(v_table_id, 70003000, 529.92, 695.52),
(v_table_id, 70003000, 4124.53746, 5232.62),
(v_table_id, 70003000, 132.48000000000002, 173.88),
(v_table_id, 70003000, 508.4639999999998, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 2, 2.00),
(v_table_id, 70003000, 16, 21.00),
(v_table_id, 70003500, 3594.61746, 4897.47),
(v_table_id, 70003500, 529.92, 811.44),
(v_table_id, 70003500, 4124.53746, 5708.91),
(v_table_id, 70003500, 132.48000000000002, 202.86),
(v_table_id, 70003500, 508.4639999999998, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 2, 2.00),
(v_table_id, 70003500, 16, 24.50),
(v_table_id, 70004000, 3594.61746, 5478.91),
(v_table_id, 70004000, 529.92, 927.36),
(v_table_id, 70004000, 4124.53746, 6406.27),
(v_table_id, 70004000, 132.48000000000002, 231.84),
(v_table_id, 70004000, 508.4639999999998, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 2, 2.00),
(v_table_id, 70004000, 16, 28.00),
(v_table_id, 70004500, 3594.61746, 5839.28),
(v_table_id, 70004500, 529.92, 1043.28),
(v_table_id, 70004500, 4124.53746, 6882.56),
(v_table_id, 70004500, 132.48000000000002, 260.82),
(v_table_id, 70004500, 508.4639999999998, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 2, 2.00),
(v_table_id, 70004500, 16, 31.50),
(v_table_id, 70005000, 3594.61746, 6199.65),
(v_table_id, 70005000, 529.92, 1159.20),
(v_table_id, 70005000, 4124.53746, 7358.85),
(v_table_id, 70005000, 132.48000000000002, 289.80),
(v_table_id, 70005000, 508.4639999999998, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 2, 2.00),
(v_table_id, 70005000, 16, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":2,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 3594.61746, 3839.13),
(v_table_id, 40004500, 529.92, 596.16),
(v_table_id, 40004500, 4124.53746, 4435.29),
(v_table_id, 40004500, 132.48000000000002, 149.04),
(v_table_id, 40004500, 508.4639999999998, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 2, 2.00),
(v_table_id, 40004500, 16, 18.00),
(v_table_id, 40005000, 3594.61746, 4083.64),
(v_table_id, 40005000, 529.92, 662.40),
(v_table_id, 40005000, 4124.53746, 4746.04),
(v_table_id, 40005000, 132.48000000000002, 165.60),
(v_table_id, 40005000, 508.4639999999998, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 2, 2.00),
(v_table_id, 40005000, 16, 20.00),
(v_table_id, 50003000, 3594.61746, 3582.76),
(v_table_id, 50003000, 529.92, 496.80),
(v_table_id, 50003000, 4124.53746, 4079.56),
(v_table_id, 50003000, 132.48000000000002, 124.20),
(v_table_id, 50003000, 508.4639999999998, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 2, 2.00),
(v_table_id, 50003000, 16, 15.00),
(v_table_id, 50003500, 3594.61746, 3865.89),
(v_table_id, 50003500, 529.92, 579.60),
(v_table_id, 50003500, 4124.53746, 4445.49),
(v_table_id, 50003500, 132.48000000000002, 144.90),
(v_table_id, 50003500, 508.4639999999998, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 2, 2.00),
(v_table_id, 50003500, 16, 17.50),
(v_table_id, 50004000, 3594.61746, 4149.02),
(v_table_id, 50004000, 529.92, 662.40),
(v_table_id, 50004000, 4124.53746, 4811.42),
(v_table_id, 50004000, 132.48000000000002, 165.60),
(v_table_id, 50004000, 508.4639999999998, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 2, 2.00),
(v_table_id, 50004000, 16, 20.00),
(v_table_id, 50004500, 3594.61746, 4432.16),
(v_table_id, 50004500, 529.92, 745.20),
(v_table_id, 50004500, 4124.53746, 5177.36),
(v_table_id, 50004500, 132.48000000000002, 186.30),
(v_table_id, 50004500, 508.4639999999998, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 2, 2.00),
(v_table_id, 50004500, 16, 22.50),
(v_table_id, 50005000, 3594.61746, 4715.29),
(v_table_id, 50005000, 529.92, 828.00),
(v_table_id, 50005000, 4124.53746, 5543.29),
(v_table_id, 50005000, 132.48000000000002, 207.00),
(v_table_id, 50005000, 508.4639999999998, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 2, 2.00),
(v_table_id, 50005000, 16, 25.00),
(v_table_id, 60003000, 3594.61746, 4059.93),
(v_table_id, 60003000, 529.92, 596.16),
(v_table_id, 60003000, 4124.53746, 4656.09),
(v_table_id, 60003000, 132.48000000000002, 149.04),
(v_table_id, 60003000, 508.4639999999998, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 2, 2.00),
(v_table_id, 60003000, 16, 18.00),
(v_table_id, 60003500, 3594.61746, 4381.68),
(v_table_id, 60003500, 529.92, 695.52),
(v_table_id, 60003500, 4124.53746, 5077.20),
(v_table_id, 60003500, 132.48000000000002, 173.88),
(v_table_id, 60003500, 508.4639999999998, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 2, 2.00),
(v_table_id, 60003500, 16, 21.00),
(v_table_id, 60004000, 3594.61746, 4703.43),
(v_table_id, 60004000, 529.92, 794.88),
(v_table_id, 60004000, 4124.53746, 5498.31),
(v_table_id, 60004000, 132.48000000000002, 198.72),
(v_table_id, 60004000, 508.4639999999998, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 2, 2.00),
(v_table_id, 60004000, 16, 24.00),
(v_table_id, 60004500, 3594.61746, 5025.18),
(v_table_id, 60004500, 529.92, 894.24),
(v_table_id, 60004500, 4124.53746, 5919.42),
(v_table_id, 60004500, 132.48000000000002, 223.56),
(v_table_id, 60004500, 508.4639999999998, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 2, 2.00),
(v_table_id, 60004500, 16, 27.00),
(v_table_id, 60005000, 3594.61746, 5346.93),
(v_table_id, 60005000, 529.92, 993.60),
(v_table_id, 60005000, 4124.53746, 6340.53),
(v_table_id, 60005000, 132.48000000000002, 248.40),
(v_table_id, 60005000, 508.4639999999998, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 2, 2.00),
(v_table_id, 60005000, 16, 30.00),
(v_table_id, 70003000, 3594.61746, 4537.10),
(v_table_id, 70003000, 529.92, 695.52),
(v_table_id, 70003000, 4124.53746, 5232.62),
(v_table_id, 70003000, 132.48000000000002, 173.88),
(v_table_id, 70003000, 508.4639999999998, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 2, 2.00),
(v_table_id, 70003000, 16, 21.00),
(v_table_id, 70003500, 3594.61746, 5118.54),
(v_table_id, 70003500, 529.92, 811.44),
(v_table_id, 70003500, 4124.53746, 5929.98),
(v_table_id, 70003500, 132.48000000000002, 202.86),
(v_table_id, 70003500, 508.4639999999998, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 2, 2.00),
(v_table_id, 70003500, 16, 24.50),
(v_table_id, 70004000, 3594.61746, 5478.91),
(v_table_id, 70004000, 529.92, 927.36),
(v_table_id, 70004000, 4124.53746, 6406.27),
(v_table_id, 70004000, 132.48000000000002, 231.84),
(v_table_id, 70004000, 508.4639999999998, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 2, 2.00),
(v_table_id, 70004000, 16, 28.00),
(v_table_id, 70004500, 3594.61746, 5839.28),
(v_table_id, 70004500, 529.92, 1043.28),
(v_table_id, 70004500, 4124.53746, 6882.56),
(v_table_id, 70004500, 132.48000000000002, 260.82),
(v_table_id, 70004500, 508.4639999999998, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 2, 2.00),
(v_table_id, 70004500, 16, 31.50),
(v_table_id, 70005000, 3594.61746, 6144.58),
(v_table_id, 70005000, 529.92, 1159.20),
(v_table_id, 70005000, 4124.53746, 7303.78),
(v_table_id, 70005000, 132.48000000000002, 289.80),
(v_table_id, 70005000, 508.4639999999998, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 2, 3.00),
(v_table_id, 70005000, 16, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":3,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004000, 3350.1037499999998, 3594.62),
(v_table_id, 40004000, 463.67999999999995, 529.92),
(v_table_id, 40004000, 3813.7837499999996, 4124.54),
(v_table_id, 40004000, 188.36999999999998, 215.28),
(v_table_id, 40004000, 444.90599999999984, 508.46),
(v_table_id, 40004000, 5, 5.00),
(v_table_id, 40004000, 2, 2.00),
(v_table_id, 40004000, 14, 16.00),
(v_table_id, 40004500, 3350.1037499999998, 3839.13),
(v_table_id, 40004500, 463.67999999999995, 596.16),
(v_table_id, 40004500, 3813.7837499999996, 4435.29),
(v_table_id, 40004500, 188.36999999999998, 242.19),
(v_table_id, 40004500, 444.90599999999984, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 2, 2.00),
(v_table_id, 40004500, 14, 18.00),
(v_table_id, 40005000, 3350.1037499999998, 4553.11),
(v_table_id, 40005000, 463.67999999999995, 662.40),
(v_table_id, 40005000, 3813.7837499999996, 5215.51),
(v_table_id, 40005000, 188.36999999999998, 269.10),
(v_table_id, 40005000, 444.90599999999984, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 2, 2.00),
(v_table_id, 40005000, 14, 20.00),
(v_table_id, 50003000, 3350.1037499999998, 3582.76),
(v_table_id, 50003000, 463.67999999999995, 496.80),
(v_table_id, 50003000, 3813.7837499999996, 4079.56),
(v_table_id, 50003000, 188.36999999999998, 201.83),
(v_table_id, 50003000, 444.90599999999984, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 2, 2.00),
(v_table_id, 50003000, 14, 15.00),
(v_table_id, 50003500, 3350.1037499999998, 3865.89),
(v_table_id, 50003500, 463.67999999999995, 579.60),
(v_table_id, 50003500, 3813.7837499999996, 4445.49),
(v_table_id, 50003500, 188.36999999999998, 235.46),
(v_table_id, 50003500, 444.90599999999984, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 2, 2.00),
(v_table_id, 50003500, 14, 17.50),
(v_table_id, 50004000, 3350.1037499999998, 4149.02),
(v_table_id, 50004000, 463.67999999999995, 662.40),
(v_table_id, 50004000, 3813.7837499999996, 4811.42),
(v_table_id, 50004000, 188.36999999999998, 269.10),
(v_table_id, 50004000, 444.90599999999984, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 2, 2.00),
(v_table_id, 50004000, 14, 20.00),
(v_table_id, 50004500, 3350.1037499999998, 4432.16),
(v_table_id, 50004500, 463.67999999999995, 745.20),
(v_table_id, 50004500, 3813.7837499999996, 5177.36),
(v_table_id, 50004500, 188.36999999999998, 302.74),
(v_table_id, 50004500, 444.90599999999984, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 2, 2.00),
(v_table_id, 50004500, 14, 22.50),
(v_table_id, 50005000, 3350.1037499999998, 5302.13),
(v_table_id, 50005000, 463.67999999999995, 828.00),
(v_table_id, 50005000, 3813.7837499999996, 6130.13),
(v_table_id, 50005000, 188.36999999999998, 336.37),
(v_table_id, 50005000, 444.90599999999984, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 2, 2.00),
(v_table_id, 50005000, 14, 25.00),
(v_table_id, 60003000, 3350.1037499999998, 4059.93),
(v_table_id, 60003000, 463.67999999999995, 596.16),
(v_table_id, 60003000, 3813.7837499999996, 4656.09),
(v_table_id, 60003000, 188.36999999999998, 242.19),
(v_table_id, 60003000, 444.90599999999984, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 2, 2.00),
(v_table_id, 60003000, 14, 18.00),
(v_table_id, 60003500, 3350.1037499999998, 4381.68),
(v_table_id, 60003500, 463.67999999999995, 695.52),
(v_table_id, 60003500, 3813.7837499999996, 5077.20),
(v_table_id, 60003500, 188.36999999999998, 282.55),
(v_table_id, 60003500, 444.90599999999984, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 2, 2.00),
(v_table_id, 60003500, 14, 21.00),
(v_table_id, 60004000, 3350.1037499999998, 4703.43),
(v_table_id, 60004000, 463.67999999999995, 794.88),
(v_table_id, 60004000, 3813.7837499999996, 5498.31),
(v_table_id, 60004000, 188.36999999999998, 322.92),
(v_table_id, 60004000, 444.90599999999984, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 2, 2.00),
(v_table_id, 60004000, 14, 24.00),
(v_table_id, 60004500, 3350.1037499999998, 5214.67),
(v_table_id, 60004500, 463.67999999999995, 894.24),
(v_table_id, 60004500, 3813.7837499999996, 6108.91),
(v_table_id, 60004500, 188.36999999999998, 363.29),
(v_table_id, 60004500, 444.90599999999984, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 2, 2.00),
(v_table_id, 60004500, 14, 27.00),
(v_table_id, 60005000, 3350.1037499999998, 6240.63),
(v_table_id, 60005000, 463.67999999999995, 993.60),
(v_table_id, 60005000, 3813.7837499999996, 7234.23),
(v_table_id, 60005000, 188.36999999999998, 403.65),
(v_table_id, 60005000, 444.90599999999984, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 2, 2.00),
(v_table_id, 60005000, 14, 30.00),
(v_table_id, 70003000, 3350.1037499999998, 4758.17),
(v_table_id, 70003000, 463.67999999999995, 695.52),
(v_table_id, 70003000, 3813.7837499999996, 5453.69),
(v_table_id, 70003000, 188.36999999999998, 282.55),
(v_table_id, 70003000, 444.90599999999984, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 2, 2.00),
(v_table_id, 70003000, 14, 21.00),
(v_table_id, 70003500, 3350.1037499999998, 5118.54),
(v_table_id, 70003500, 463.67999999999995, 811.44),
(v_table_id, 70003500, 3813.7837499999996, 5929.98),
(v_table_id, 70003500, 188.36999999999998, 329.65),
(v_table_id, 70003500, 444.90599999999984, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 2, 2.00),
(v_table_id, 70003500, 14, 24.50),
(v_table_id, 70004000, 3350.1037499999998, 5478.91),
(v_table_id, 70004000, 463.67999999999995, 927.36),
(v_table_id, 70004000, 3813.7837499999996, 6406.27),
(v_table_id, 70004000, 188.36999999999998, 376.74),
(v_table_id, 70004000, 444.90599999999984, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 2, 2.00),
(v_table_id, 70004000, 14, 28.00),
(v_table_id, 70004500, 3350.1037499999998, 5784.21),
(v_table_id, 70004500, 463.67999999999995, 1043.28),
(v_table_id, 70004500, 3813.7837499999996, 6827.49),
(v_table_id, 70004500, 188.36999999999998, 423.83),
(v_table_id, 70004500, 444.90599999999984, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 2, 3.00),
(v_table_id, 70004500, 14, 31.50),
(v_table_id, 70005000, 3350.1037499999998, 6966.15),
(v_table_id, 70005000, 463.67999999999995, 1159.20),
(v_table_id, 70005000, 3813.7837499999996, 8125.35),
(v_table_id, 70005000, 188.36999999999998, 470.92),
(v_table_id, 70005000, 444.90599999999984, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 2, 3.00),
(v_table_id, 70005000, 14, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline Freestanding (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":1,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 4215.49002, 4460.00),
(v_table_id, 40004500, 529.92, 596.16),
(v_table_id, 40004500, 4745.41002, 5056.16),
(v_table_id, 40004500, 132.48000000000002, 149.04),
(v_table_id, 40004500, 508.4639999999998, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 4, 4.00),
(v_table_id, 40004500, 16, 18.00),
(v_table_id, 40005000, 4215.49002, 4704.52),
(v_table_id, 40005000, 529.92, 662.40),
(v_table_id, 40005000, 4745.41002, 5366.92),
(v_table_id, 40005000, 132.48000000000002, 165.60),
(v_table_id, 40005000, 508.4639999999998, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 4, 4.00),
(v_table_id, 40005000, 16, 20.00),
(v_table_id, 50003000, 4215.49002, 4256.42),
(v_table_id, 50003000, 529.92, 496.80),
(v_table_id, 50003000, 4745.41002, 4753.22),
(v_table_id, 50003000, 132.48000000000002, 124.20),
(v_table_id, 50003000, 508.4639999999998, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 4, 4.00),
(v_table_id, 50003000, 16, 15.00),
(v_table_id, 50003500, 4215.49002, 4539.55),
(v_table_id, 50003500, 529.92, 579.60),
(v_table_id, 50003500, 4745.41002, 5119.15),
(v_table_id, 50003500, 132.48000000000002, 144.90),
(v_table_id, 50003500, 508.4639999999998, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 4, 4.00),
(v_table_id, 50003500, 16, 17.50),
(v_table_id, 50004000, 4215.49002, 4822.68),
(v_table_id, 50004000, 529.92, 662.40),
(v_table_id, 50004000, 4745.41002, 5485.08),
(v_table_id, 50004000, 132.48000000000002, 165.60),
(v_table_id, 50004000, 508.4639999999998, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 4, 4.00),
(v_table_id, 50004000, 16, 20.00),
(v_table_id, 50004500, 4215.49002, 5105.81),
(v_table_id, 50004500, 529.92, 745.20),
(v_table_id, 50004500, 4745.41002, 5851.01),
(v_table_id, 50004500, 132.48000000000002, 186.30),
(v_table_id, 50004500, 508.4639999999998, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 4, 4.00),
(v_table_id, 50004500, 16, 22.50),
(v_table_id, 50005000, 4215.49002, 5388.95),
(v_table_id, 50005000, 529.92, 828.00),
(v_table_id, 50005000, 4745.41002, 6216.95),
(v_table_id, 50005000, 132.48000000000002, 207.00),
(v_table_id, 50005000, 508.4639999999998, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 4, 4.00),
(v_table_id, 50005000, 16, 25.00),
(v_table_id, 60003000, 4215.49002, 4786.37),
(v_table_id, 60003000, 529.92, 596.16),
(v_table_id, 60003000, 4745.41002, 5382.53),
(v_table_id, 60003000, 132.48000000000002, 149.04),
(v_table_id, 60003000, 508.4639999999998, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 4, 4.00),
(v_table_id, 60003000, 16, 18.00),
(v_table_id, 60003500, 4215.49002, 5108.12),
(v_table_id, 60003500, 529.92, 695.52),
(v_table_id, 60003500, 4745.41002, 5803.64),
(v_table_id, 60003500, 132.48000000000002, 173.88),
(v_table_id, 60003500, 508.4639999999998, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 4, 4.00),
(v_table_id, 60003500, 16, 21.00),
(v_table_id, 60004000, 4215.49002, 5429.87),
(v_table_id, 60004000, 529.92, 794.88),
(v_table_id, 60004000, 4745.41002, 6224.75),
(v_table_id, 60004000, 132.48000000000002, 198.72),
(v_table_id, 60004000, 508.4639999999998, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 4, 4.00),
(v_table_id, 60004000, 16, 24.00),
(v_table_id, 60004500, 4215.49002, 5751.62),
(v_table_id, 60004500, 529.92, 894.24),
(v_table_id, 60004500, 4745.41002, 6645.86),
(v_table_id, 60004500, 132.48000000000002, 223.56),
(v_table_id, 60004500, 508.4639999999998, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 4, 4.00),
(v_table_id, 60004500, 16, 27.00),
(v_table_id, 60005000, 4215.49002, 6073.38),
(v_table_id, 60005000, 529.92, 993.60),
(v_table_id, 60005000, 4745.41002, 7066.98),
(v_table_id, 60005000, 132.48000000000002, 248.40),
(v_table_id, 60005000, 508.4639999999998, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 4, 4.00),
(v_table_id, 60005000, 16, 30.00),
(v_table_id, 70003000, 4215.49002, 5316.32),
(v_table_id, 70003000, 529.92, 695.52),
(v_table_id, 70003000, 4745.41002, 6011.84),
(v_table_id, 70003000, 132.48000000000002, 173.88),
(v_table_id, 70003000, 508.4639999999998, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 4, 4.00),
(v_table_id, 70003000, 16, 21.00),
(v_table_id, 70003500, 4215.49002, 5676.69),
(v_table_id, 70003500, 529.92, 811.44),
(v_table_id, 70003500, 4745.41002, 6488.13),
(v_table_id, 70003500, 132.48000000000002, 202.86),
(v_table_id, 70003500, 508.4639999999998, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 4, 4.00),
(v_table_id, 70003500, 16, 24.50),
(v_table_id, 70004000, 4215.49002, 6479.21),
(v_table_id, 70004000, 529.92, 927.36),
(v_table_id, 70004000, 4745.41002, 7406.57),
(v_table_id, 70004000, 132.48000000000002, 231.84),
(v_table_id, 70004000, 508.4639999999998, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 4, 4.00),
(v_table_id, 70004000, 16, 28.00),
(v_table_id, 70004500, 4215.49002, 6839.58),
(v_table_id, 70004500, 529.92, 1043.28),
(v_table_id, 70004500, 4745.41002, 7882.86),
(v_table_id, 70004500, 132.48000000000002, 260.82),
(v_table_id, 70004500, 508.4639999999998, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 4, 4.00),
(v_table_id, 70004500, 16, 31.50),
(v_table_id, 70005000, 4215.49002, 7199.95),
(v_table_id, 70005000, 529.92, 1159.20),
(v_table_id, 70005000, 4745.41002, 8359.15),
(v_table_id, 70005000, 132.48000000000002, 289.80),
(v_table_id, 70005000, 508.4639999999998, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 4, 4.00),
(v_table_id, 70005000, 16, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline Freestanding (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":2,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 4215.49002, 4460.00),
(v_table_id, 40004500, 529.92, 596.16),
(v_table_id, 40004500, 4745.41002, 5056.16),
(v_table_id, 40004500, 132.48000000000002, 149.04),
(v_table_id, 40004500, 508.4639999999998, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 4, 4.00),
(v_table_id, 40004500, 16, 18.00),
(v_table_id, 40005000, 4215.49002, 4704.52),
(v_table_id, 40005000, 529.92, 662.40),
(v_table_id, 40005000, 4745.41002, 5366.92),
(v_table_id, 40005000, 132.48000000000002, 165.60),
(v_table_id, 40005000, 508.4639999999998, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 4, 4.00),
(v_table_id, 40005000, 16, 20.00),
(v_table_id, 50003000, 4215.49002, 4256.42),
(v_table_id, 50003000, 529.92, 496.80),
(v_table_id, 50003000, 4745.41002, 4753.22),
(v_table_id, 50003000, 132.48000000000002, 124.20),
(v_table_id, 50003000, 508.4639999999998, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 4, 4.00),
(v_table_id, 50003000, 16, 15.00),
(v_table_id, 50003500, 4215.49002, 4539.55),
(v_table_id, 50003500, 529.92, 579.60),
(v_table_id, 50003500, 4745.41002, 5119.15),
(v_table_id, 50003500, 132.48000000000002, 144.90),
(v_table_id, 50003500, 508.4639999999998, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 4, 4.00),
(v_table_id, 50003500, 16, 17.50),
(v_table_id, 50004000, 4215.49002, 4822.68),
(v_table_id, 50004000, 529.92, 662.40),
(v_table_id, 50004000, 4745.41002, 5485.08),
(v_table_id, 50004000, 132.48000000000002, 165.60),
(v_table_id, 50004000, 508.4639999999998, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 4, 4.00),
(v_table_id, 50004000, 16, 20.00),
(v_table_id, 50004500, 4215.49002, 5105.81),
(v_table_id, 50004500, 529.92, 745.20),
(v_table_id, 50004500, 4745.41002, 5851.01),
(v_table_id, 50004500, 132.48000000000002, 186.30),
(v_table_id, 50004500, 508.4639999999998, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 4, 4.00),
(v_table_id, 50004500, 16, 22.50),
(v_table_id, 50005000, 4215.49002, 5388.95),
(v_table_id, 50005000, 529.92, 828.00),
(v_table_id, 50005000, 4745.41002, 6216.95),
(v_table_id, 50005000, 132.48000000000002, 207.00),
(v_table_id, 50005000, 508.4639999999998, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 4, 4.00),
(v_table_id, 50005000, 16, 25.00),
(v_table_id, 60003000, 4215.49002, 4786.37),
(v_table_id, 60003000, 529.92, 596.16),
(v_table_id, 60003000, 4745.41002, 5382.53),
(v_table_id, 60003000, 132.48000000000002, 149.04),
(v_table_id, 60003000, 508.4639999999998, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 4, 4.00),
(v_table_id, 60003000, 16, 18.00),
(v_table_id, 60003500, 4215.49002, 5108.12),
(v_table_id, 60003500, 529.92, 695.52),
(v_table_id, 60003500, 4745.41002, 5803.64),
(v_table_id, 60003500, 132.48000000000002, 173.88),
(v_table_id, 60003500, 508.4639999999998, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 4, 4.00),
(v_table_id, 60003500, 16, 21.00),
(v_table_id, 60004000, 4215.49002, 5429.87),
(v_table_id, 60004000, 529.92, 794.88),
(v_table_id, 60004000, 4745.41002, 6224.75),
(v_table_id, 60004000, 132.48000000000002, 198.72),
(v_table_id, 60004000, 508.4639999999998, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 4, 4.00),
(v_table_id, 60004000, 16, 24.00),
(v_table_id, 60004500, 4215.49002, 5751.62),
(v_table_id, 60004500, 529.92, 894.24),
(v_table_id, 60004500, 4745.41002, 6645.86),
(v_table_id, 60004500, 132.48000000000002, 223.56),
(v_table_id, 60004500, 508.4639999999998, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 4, 4.00),
(v_table_id, 60004500, 16, 27.00),
(v_table_id, 60005000, 4215.49002, 6073.38),
(v_table_id, 60005000, 529.92, 993.60),
(v_table_id, 60005000, 4745.41002, 7066.98),
(v_table_id, 60005000, 132.48000000000002, 248.40),
(v_table_id, 60005000, 508.4639999999998, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 4, 4.00),
(v_table_id, 60005000, 16, 30.00),
(v_table_id, 70003000, 4215.49002, 5316.32),
(v_table_id, 70003000, 529.92, 695.52),
(v_table_id, 70003000, 4745.41002, 6011.84),
(v_table_id, 70003000, 132.48000000000002, 173.88),
(v_table_id, 70003000, 508.4639999999998, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 4, 4.00),
(v_table_id, 70003000, 16, 21.00),
(v_table_id, 70003500, 4215.49002, 6118.84),
(v_table_id, 70003500, 529.92, 811.44),
(v_table_id, 70003500, 4745.41002, 6930.28),
(v_table_id, 70003500, 132.48000000000002, 202.86),
(v_table_id, 70003500, 508.4639999999998, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 4, 4.00),
(v_table_id, 70003500, 16, 24.50),
(v_table_id, 70004000, 4215.49002, 6479.21),
(v_table_id, 70004000, 529.92, 927.36),
(v_table_id, 70004000, 4745.41002, 7406.57),
(v_table_id, 70004000, 132.48000000000002, 231.84),
(v_table_id, 70004000, 508.4639999999998, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 4, 4.00),
(v_table_id, 70004000, 16, 28.00),
(v_table_id, 70004500, 4215.49002, 6839.58),
(v_table_id, 70004500, 529.92, 1043.28),
(v_table_id, 70004500, 4745.41002, 7882.86),
(v_table_id, 70004500, 132.48000000000002, 260.82),
(v_table_id, 70004500, 508.4639999999998, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 4, 4.00),
(v_table_id, 70004500, 16, 31.50),
(v_table_id, 70005000, 4215.49002, 7089.81),
(v_table_id, 70005000, 529.92, 1159.20),
(v_table_id, 70005000, 4745.41002, 8249.01),
(v_table_id, 70005000, 132.48000000000002, 289.80),
(v_table_id, 70005000, 508.4639999999998, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 4, 6.00),
(v_table_id, 70005000, 16, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Skyline Freestanding (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Skyline Freestanding (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Skyline","zone":3,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004000, 3970.9763099999996, 4215.49),
(v_table_id, 40004000, 536.1299999999999, 612.72),
(v_table_id, 40004000, 4507.106309999999, 4828.21),
(v_table_id, 40004000, 115.92000000000002, 132.48),
(v_table_id, 40004000, 444.90599999999984, 508.46),
(v_table_id, 40004000, 5, 5.00),
(v_table_id, 40004000, 4, 4.00),
(v_table_id, 40004000, 14, 16.00),
(v_table_id, 40004500, 3970.9763099999996, 4460.00),
(v_table_id, 40004500, 536.1299999999999, 689.31),
(v_table_id, 40004500, 4507.106309999999, 5149.31),
(v_table_id, 40004500, 115.92000000000002, 149.04),
(v_table_id, 40004500, 444.90599999999984, 572.02),
(v_table_id, 40004500, 5, 5.00),
(v_table_id, 40004500, 4, 4.00),
(v_table_id, 40004500, 14, 18.00),
(v_table_id, 40005000, 3970.9763099999996, 5172.46),
(v_table_id, 40005000, 536.1299999999999, 765.90),
(v_table_id, 40005000, 4507.106309999999, 5938.36),
(v_table_id, 40005000, 115.92000000000002, 165.60),
(v_table_id, 40005000, 444.90599999999984, 635.58),
(v_table_id, 40005000, 5, 5.00),
(v_table_id, 40005000, 4, 4.00),
(v_table_id, 40005000, 14, 20.00),
(v_table_id, 50003000, 3970.9763099999996, 4256.42),
(v_table_id, 50003000, 536.1299999999999, 574.42),
(v_table_id, 50003000, 4507.106309999999, 4830.84),
(v_table_id, 50003000, 115.92000000000002, 124.20),
(v_table_id, 50003000, 444.90599999999984, 476.68),
(v_table_id, 50003000, 5, 6.00),
(v_table_id, 50003000, 4, 4.00),
(v_table_id, 50003000, 14, 15.00),
(v_table_id, 50003500, 3970.9763099999996, 4539.55),
(v_table_id, 50003500, 536.1299999999999, 670.16),
(v_table_id, 50003500, 4507.106309999999, 5209.71),
(v_table_id, 50003500, 115.92000000000002, 144.90),
(v_table_id, 50003500, 444.90599999999984, 556.13),
(v_table_id, 50003500, 5, 6.00),
(v_table_id, 50003500, 4, 4.00),
(v_table_id, 50003500, 14, 17.50),
(v_table_id, 50004000, 3970.9763099999996, 4822.68),
(v_table_id, 50004000, 536.1299999999999, 765.90),
(v_table_id, 50004000, 4507.106309999999, 5588.58),
(v_table_id, 50004000, 115.92000000000002, 165.60),
(v_table_id, 50004000, 444.90599999999984, 635.58),
(v_table_id, 50004000, 5, 6.00),
(v_table_id, 50004000, 4, 4.00),
(v_table_id, 50004000, 14, 20.00),
(v_table_id, 50004500, 3970.9763099999996, 5105.81),
(v_table_id, 50004500, 536.1299999999999, 861.64),
(v_table_id, 50004500, 4507.106309999999, 5967.45),
(v_table_id, 50004500, 115.92000000000002, 186.30),
(v_table_id, 50004500, 444.90599999999984, 715.03),
(v_table_id, 50004500, 5, 6.00),
(v_table_id, 50004500, 4, 4.00),
(v_table_id, 50004500, 14, 22.50),
(v_table_id, 50005000, 3970.9763099999996, 5973.87),
(v_table_id, 50005000, 536.1299999999999, 957.37),
(v_table_id, 50005000, 4507.106309999999, 6931.25),
(v_table_id, 50005000, 115.92000000000002, 207.00),
(v_table_id, 50005000, 444.90599999999984, 794.47),
(v_table_id, 50005000, 5, 6.00),
(v_table_id, 50005000, 4, 4.00),
(v_table_id, 50005000, 14, 25.00),
(v_table_id, 60003000, 3970.9763099999996, 4786.37),
(v_table_id, 60003000, 536.1299999999999, 689.31),
(v_table_id, 60003000, 4507.106309999999, 5475.68),
(v_table_id, 60003000, 115.92000000000002, 149.04),
(v_table_id, 60003000, 444.90599999999984, 572.02),
(v_table_id, 60003000, 5, 7.00),
(v_table_id, 60003000, 4, 4.00),
(v_table_id, 60003000, 14, 18.00),
(v_table_id, 60003500, 3970.9763099999996, 5108.12),
(v_table_id, 60003500, 536.1299999999999, 804.20),
(v_table_id, 60003500, 4507.106309999999, 5912.32),
(v_table_id, 60003500, 115.92000000000002, 173.88),
(v_table_id, 60003500, 444.90599999999984, 667.36),
(v_table_id, 60003500, 5, 7.00),
(v_table_id, 60003500, 4, 4.00),
(v_table_id, 60003500, 14, 21.00),
(v_table_id, 60004000, 3970.9763099999996, 5429.87),
(v_table_id, 60004000, 536.1299999999999, 919.08),
(v_table_id, 60004000, 4507.106309999999, 6348.95),
(v_table_id, 60004000, 115.92000000000002, 198.72),
(v_table_id, 60004000, 444.90599999999984, 762.70),
(v_table_id, 60004000, 5, 7.00),
(v_table_id, 60004000, 4, 4.00),
(v_table_id, 60004000, 14, 24.00),
(v_table_id, 60004500, 3970.9763099999996, 6130.61),
(v_table_id, 60004500, 536.1299999999999, 1033.96),
(v_table_id, 60004500, 4507.106309999999, 7164.57),
(v_table_id, 60004500, 115.92000000000002, 223.56),
(v_table_id, 60004500, 444.90599999999984, 858.03),
(v_table_id, 60004500, 5, 7.00),
(v_table_id, 60004500, 4, 4.00),
(v_table_id, 60004500, 14, 27.00),
(v_table_id, 60005000, 3970.9763099999996, 7154.27),
(v_table_id, 60005000, 536.1299999999999, 1148.85),
(v_table_id, 60005000, 4507.106309999999, 8303.12),
(v_table_id, 60005000, 115.92000000000002, 248.40),
(v_table_id, 60005000, 444.90599999999984, 953.37),
(v_table_id, 60005000, 5, 7.00),
(v_table_id, 60005000, 4, 4.00),
(v_table_id, 60005000, 14, 30.00),
(v_table_id, 70003000, 3970.9763099999996, 5758.47),
(v_table_id, 70003000, 536.1299999999999, 804.20),
(v_table_id, 70003000, 4507.106309999999, 6562.66),
(v_table_id, 70003000, 115.92000000000002, 173.88),
(v_table_id, 70003000, 444.90599999999984, 667.36),
(v_table_id, 70003000, 5, 8.00),
(v_table_id, 70003000, 4, 4.00),
(v_table_id, 70003000, 14, 21.00),
(v_table_id, 70003500, 3970.9763099999996, 6118.84),
(v_table_id, 70003500, 536.1299999999999, 938.23),
(v_table_id, 70003500, 4507.106309999999, 7057.07),
(v_table_id, 70003500, 115.92000000000002, 202.86),
(v_table_id, 70003500, 444.90599999999984, 778.59),
(v_table_id, 70003500, 5, 8.00),
(v_table_id, 70003500, 4, 4.00),
(v_table_id, 70003500, 14, 24.50),
(v_table_id, 70004000, 3970.9763099999996, 6479.21),
(v_table_id, 70004000, 536.1299999999999, 1072.26),
(v_table_id, 70004000, 4507.106309999999, 7551.47),
(v_table_id, 70004000, 115.92000000000002, 231.84),
(v_table_id, 70004000, 444.90599999999984, 889.81),
(v_table_id, 70004000, 5, 8.00),
(v_table_id, 70004000, 4, 4.00),
(v_table_id, 70004000, 14, 28.00),
(v_table_id, 70004500, 3970.9763099999996, 6729.44),
(v_table_id, 70004500, 536.1299999999999, 1206.29),
(v_table_id, 70004500, 4507.106309999999, 7935.73),
(v_table_id, 70004500, 115.92000000000002, 260.82),
(v_table_id, 70004500, 444.90599999999984, 1001.04),
(v_table_id, 70004500, 5, 8.00),
(v_table_id, 70004500, 4, 6.00),
(v_table_id, 70004500, 14, 31.50),
(v_table_id, 70005000, 3970.9763099999996, 7908.71),
(v_table_id, 70005000, 536.1299999999999, 1340.32),
(v_table_id, 70005000, 4507.106309999999, 9249.03),
(v_table_id, 70005000, 115.92000000000002, 289.80),
(v_table_id, 70005000, 444.90599999999984, 1112.26),
(v_table_id, 70005000, 5, 8.00),
(v_table_id, 70005000, 4, 6.00),
(v_table_id, 70005000, 14, 35.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":1,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 40005000, 2322.423, 2514.68),
(v_table_id, 40005000, 2322.423, 2514.68),
(v_table_id, 40005000, 16, 1.00),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 50005000, 2322.423, 2749.27),
(v_table_id, 50005000, 2322.423, 2749.27),
(v_table_id, 50005000, 16, 1.00),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 60005000, 2322.423, 2977.22),
(v_table_id, 60005000, 2322.423, 2977.22),
(v_table_id, 60005000, 16, 1.00),
(v_table_id, 70003000, 2322.423, 2797.13),
(v_table_id, 70003000, 2322.423, 2797.13),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2322.423, 2893.26),
(v_table_id, 70003500, 2322.423, 2893.26),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2322.423, 2989.39),
(v_table_id, 70004000, 2322.423, 2989.39),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 16, 1.00),
(v_table_id, 70005000, 2322.423, 3402.72),
(v_table_id, 70005000, 2322.423, 3402.72),
(v_table_id, 70005000, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":2,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 40005000, 2322.423, 2514.68),
(v_table_id, 40005000, 2322.423, 2514.68),
(v_table_id, 40005000, 16, 1.00),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 50005000, 2322.423, 2749.27),
(v_table_id, 50005000, 2322.423, 2749.27),
(v_table_id, 50005000, 16, 1.00),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 60005000, 2322.423, 2977.22),
(v_table_id, 60005000, 2322.423, 2977.22),
(v_table_id, 60005000, 16, 1.00),
(v_table_id, 70003000, 2322.423, 2797.13),
(v_table_id, 70003000, 2322.423, 2797.13),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2322.423, 2893.26),
(v_table_id, 70003500, 2322.423, 2893.26),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2322.423, 3210.46),
(v_table_id, 70004000, 2322.423, 3210.46),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 16, 1.00),
(v_table_id, 70005000, 2322.423, 3402.72),
(v_table_id, 70005000, 2322.423, 3402.72),
(v_table_id, 70005000, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":3,"construction_type":"attached","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 2322.423, 2418.55),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 2322.423, 2364.75),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 2322.423, 2460.88),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 2322.423, 2557.01),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 2322.423, 2653.14),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 2322.423, 2592.70),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 2322.423, 2688.83),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 2322.423, 2784.96),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 2322.423, 2881.09),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 70003000, 2322.423, 3018.20),
(v_table_id, 70003000, 2322.423, 3018.20),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2322.423, 3114.33),
(v_table_id, 70003500, 2322.423, 3114.33),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2322.423, 3210.46),
(v_table_id, 70004000, 2322.423, 3210.46),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 2322.423, 3306.59),
(v_table_id, 70004500, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 1)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport Freestanding (Zone 1)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":1,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 40005000, 2922.8489999999997, 3115.11),
(v_table_id, 40005000, 2922.8489999999997, 3115.11),
(v_table_id, 40005000, 16, 1.00),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 50005000, 2922.8489999999997, 3407.45),
(v_table_id, 50005000, 2922.8489999999997, 3407.45),
(v_table_id, 50005000, 16, 1.00),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 60005000, 2922.8489999999997, 3699.80),
(v_table_id, 60005000, 2922.8489999999997, 3699.80),
(v_table_id, 60005000, 16, 1.00),
(v_table_id, 70003000, 2922.8489999999997, 3577.19),
(v_table_id, 70003000, 2922.8489999999997, 3577.19),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2922.8489999999997, 3673.32),
(v_table_id, 70003500, 2922.8489999999997, 3673.32),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2922.8489999999997, 3769.45),
(v_table_id, 70004000, 2922.8489999999997, 3769.45),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 16, 1.00),
(v_table_id, 70005000, 2922.8489999999997, 4846.00),
(v_table_id, 70005000, 2922.8489999999997, 4846.00),
(v_table_id, 70005000, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 2)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport Freestanding (Zone 2)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":2,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 40005000, 2922.8489999999997, 3115.11),
(v_table_id, 40005000, 2922.8489999999997, 3115.11),
(v_table_id, 40005000, 16, 1.00),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 50005000, 2922.8489999999997, 3407.45),
(v_table_id, 50005000, 2922.8489999999997, 3407.45),
(v_table_id, 50005000, 16, 1.00),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 60005000, 2922.8489999999997, 3699.80),
(v_table_id, 60005000, 2922.8489999999997, 3699.80),
(v_table_id, 60005000, 16, 1.00),
(v_table_id, 70003000, 2922.8489999999997, 3577.19),
(v_table_id, 70003000, 2922.8489999999997, 3577.19),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2922.8489999999997, 3673.32),
(v_table_id, 70003500, 2922.8489999999997, 3673.32),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2922.8489999999997, 4653.74),
(v_table_id, 70004000, 2922.8489999999997, 4653.74),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 16, 1.00),
(v_table_id, 70005000, 2922.8489999999997, 4846.00),
(v_table_id, 70005000, 2922.8489999999997, 4846.00),
(v_table_id, 70005000, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Carport Freestanding (Zone 3)';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Carport Freestanding (Zone 3)', 'matrix', true, 'EUR', '{"provider":"Aluxe","model_family":"Carport","zone":3,"construction_type":"freestanding","cover_type":"Aluminum","pricing_method":"matrix","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 2922.8489999999997, 3018.98),
(v_table_id, 40004500, 16, 1.00),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 2922.8489999999997, 3022.94),
(v_table_id, 50003000, 16, 1.00),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 2922.8489999999997, 3119.07),
(v_table_id, 50003500, 16, 1.00),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 2922.8489999999997, 3215.20),
(v_table_id, 50004000, 16, 1.00),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 2922.8489999999997, 3311.33),
(v_table_id, 50004500, 16, 1.00),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 2922.8489999999997, 3315.29),
(v_table_id, 60003000, 16, 1.00),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 2922.8489999999997, 3411.41),
(v_table_id, 60003500, 16, 1.00),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 2922.8489999999997, 3507.54),
(v_table_id, 60004000, 16, 1.00),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 2922.8489999999997, 3603.67),
(v_table_id, 60004500, 16, 1.00),
(v_table_id, 70003000, 2922.8489999999997, 4461.49),
(v_table_id, 70003000, 2922.8489999999997, 4461.49),
(v_table_id, 70003000, 16, 1.00),
(v_table_id, 70003500, 2922.8489999999997, 4557.61),
(v_table_id, 70003500, 2922.8489999999997, 4557.61),
(v_table_id, 70003500, 16, 1.00),
(v_table_id, 70004000, 2922.8489999999997, 4653.74),
(v_table_id, 70004000, 2922.8489999999997, 4653.74),
(v_table_id, 70004000, 16, 1.00),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 2922.8489999999997, 4749.87),
(v_table_id, 70004500, 16, 1.00)
;
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Freestanding Surcharge', 'simple', true, 'EUR', '{"provider":"Aluxe","type":"surcharge","category":"freestanding_construction","foundation":false,"pricing_method":"simple"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 3000, 0, 382.68),
(v_table_id, 4000, 0, 450.34),
(v_table_id, 5000, 0, 518.00),
(v_table_id, 6000, 0, 658.55),
(v_table_id, 7000, 0, 726.20);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (Foundation)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Freestanding Surcharge (Foundation)', 'simple', true, 'EUR', '{"provider":"Aluxe","type":"surcharge","category":"freestanding_construction","foundation":true,"pricing_method":"simple"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 3000, 0, 459.78),
(v_table_id, 4000, 0, 527.45),
(v_table_id, 5000, 0, 595.11),
(v_table_id, 6000, 0, 774.20),
(v_table_id, 7000, 0, 841.86);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Zonweringspaneel';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Zonweringspaneel', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_panel","model":"Zonweringspaneel","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 0, 2000, 446.75),
(v_table_id, 0, 2050, 453.07),
(v_table_id, 0, 2100, 459.38),
(v_table_id, 0, 2150, 465.70),
(v_table_id, 0, 2200, 472.01),
(v_table_id, 0, 2250, 478.32),
(v_table_id, 0, 2300, 484.64),
(v_table_id, 0, 2350, 490.96),
(v_table_id, 0, 2400, 497.28),
(v_table_id, 0, 2450, 503.59),
(v_table_id, 0, 2500, 509.90),
(v_table_id, 0, 2550, 516.21),
(v_table_id, 0, 2600, 522.54),
(v_table_id, 0, 2650, 528.85);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fence Element (Aluminium)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fence Element (Aluminium)', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_element","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 1000, 1800, 407.36),
(v_table_id, 1000, 2000, 452.64);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fence Element (Door)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fence Element (Door)', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_door","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 1000, 1800, 645.02),
(v_table_id, 1000, 2000, 673.68);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rahmenprofil für Fenster AL8002 (Selbstbau) (11185)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rahmenprofil für Fenster AL8002 (Selbstbau) (11185)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 72.31);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rahmenabdeckprofil für Fenster AL8003 (Selbstbau) (11007)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rahmenabdeckprofil für Fenster AL8003 (Selbstbau) (11007)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 39.35);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - T-Rahmenprofil für Fenster AL8001 (Selbstbau) (11394)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - T-Rahmenprofil für Fenster AL8001 (Selbstbau) (11394)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 88.26);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - T-Abdeckprofil für Fenster AL8000 (Selbstbaufenster) (11395)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - T-Abdeckprofil für Fenster AL8000 (Selbstbaufenster) (11395)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 98.07);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Winkelverbinder (Selbstbaufenster) (11175)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Winkelverbinder (Selbstbaufenster) (11175)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 3.61);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ausgleichspfosten 110x60mm (11038)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ausgleichspfosten 110x60mm (11038)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 104.21);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Koppelprofil Glas 8mm (11200)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Koppelprofil Glas 8mm (11200)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4.27);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Koppelprofil Glas 10mm (11199)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Koppelprofil Glas 10mm (11199)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4.33);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abtropfleiste 8mm Glas (11031)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abtropfleiste 8mm Glas (11031)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 3.82);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abtropfleiste 10mm Glas (11030)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abtropfleiste 10mm Glas (11030)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 3.92);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Anti-Kondensat-Profil 16mm (11055)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Anti-Kondensat-Profil 16mm (11055)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"980 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 3.22);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Konstruktions Profil 190x117 mm (fest Preis) (11099)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Konstruktions Profil 190x117 mm (fest Preis) (11099)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 600.00);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Klickleiste f. Konstruktions- u. Designlinepfosten (11190)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Klickleiste f. Konstruktions- u. Designlinepfosten (11190)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"4830 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 34.23);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Leiste Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Leiste Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"3500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 20.23);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinne Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinne Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 82.04);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Wandprofil Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Wandprofil Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 52.13);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abdichtprofil (11590)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abdichtprofil (11590)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 18.95);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 7016 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 7016 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 45.55);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9010 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9010 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 45.55);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9007 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9007 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 45.55);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 7016 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 7016 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 61.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9010 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9010 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 61.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9007 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9007 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 61.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sparrenverstärkung XL, Stahl (verzinkt) (11903)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sparrenverstärkung XL, Stahl (verzinkt) (11903)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"70x50x3mm 3900mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 52.12);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline (11373)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline (11373)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"90x10x4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 60.84);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline+, Trendline und Sparren Designline (11372)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline+, Trendline und Sparren Designline (11372)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"110x10x4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 95.50);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Trendline+ (11365)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Trendline+ (11365)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"120x10x4900 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 98.32);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Ultraline und Topline (11408)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Ultraline und Topline (11408)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"140x40x5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 137.18);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) SK, CA, TL XL und Konstruktionspfosten (11375)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) SK, CA, TL XL und Konstruktionspfosten (11375)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"150x40x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 236.84);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Heizstrahler Model Type 4 inkl. Fernbedienung (11171)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Heizstrahler Model Type 4 inkl. Fernbedienung (11171)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"1800 Watt","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 378.94);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - 1er led erweiterung IP65 (11665)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - 1er led erweiterung IP65 (11665)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set ","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28.54);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Set IP65, 6 Spots inkl. Dimmer, max. 9 (fest Preis) (11664)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Set IP65, 6 Spots inkl. Dimmer, max. 9 (fest Preis) (11664)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 298.94);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ø27 mm Lochbohrer (11124) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ø27 mm Lochbohrer (11124) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 11.52);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Stripe 5m (11321) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Stripe 5m (11321) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 138.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Stripe 6m (11917) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Stripe 6m (11917) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 165.76);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Stripe 7m (11918) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Stripe 7m (11918) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 193.46);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Stripe 8m (11322) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Stripe 8m (11322) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 221.02);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - 10er led set IP65 erweiterbar bis max. 13 spots (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - 10er led set IP65 erweiterbar bis max. 13 spots (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 496.84);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Silikon-Diffusor (11323) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Silikon-Diffusor (11323) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 11.54);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Spot (11324) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Spot (11324) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28.54);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ø27 mm Lochbohrer (11124) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ø27 mm Lochbohrer (11124) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 11.52);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED 6er Set (max. 12 Spots) inkl. Dimmer (11948) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED 6er Set (max. 12 Spots) inkl. Dimmer (11948) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 280.80);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - LED Erweiterung 2er Set (11949) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - LED Erweiterung 2er Set (11949) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 65.68);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trafo 150W (11374) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trafo 150W (11374) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 137.07);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Trafo 60W (11379) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trafo 60W (11379) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 98.57);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verbindungsmuffe Buchse (11381) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verbindungsmuffe Buchse (11381) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 18.99);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Anschlussbox Somfy (11380) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Anschlussbox Somfy (11380) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 94.63);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Somfy Steuerung (11300) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Somfy Steuerung (11300) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 315.76);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dimm-Controller (11382) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dimm-Controller (11382) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 49.58);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fernbedienung (11383) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fernbedienung (11383) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 26.06);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Y-Kabel, 4er Set (11414) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Y-Kabel, 4er Set (11414) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 52.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 1m, 4er Set (11435) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 1m, 4er Set (11435) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 24.12);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 2m, 4er Set (11666) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 2m, 4er Set (11666) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 29.46);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 3m, 4er Set (11444) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 3m, 4er Set (11444) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 35.66);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat opal,  5X 16 mm (2,5;3;3,5;4;5 Meter) (11290)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat opal,  5X 16 mm (2,5;3;3,5;4;5 Meter) (11290)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 20.84);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat klar, 5X 16 mm (2,5;3;3,5;4;5 Meter) (11288)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat klar, 5X 16 mm (2,5;3;3,5;4;5 Meter) (11288)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 20.84);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm klar (11284)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm klar (11284)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28.03);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm opal (11286)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm opal (11286)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28.03);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat 16mm, smokey grey (11675)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat 16mm, smokey grey (11675)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 27.48);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Antistaubband (Polycarbonatplatten-Vorderseite)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Antistaubband (Polycarbonatplatten-Vorderseite)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"33 m1","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 32.31);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dichtungsband (Polycarbonatplatte-Hinterseite)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dichtungsband (Polycarbonatplatte-Hinterseite)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"50 m1","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 26.52);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas klar 8 mm VSG (11128)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas klar 8 mm VSG (11128)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 33.12);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas klar 10mm VSG (11131)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas klar 10mm VSG (11131)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 38.29);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas matt 8 mm VSG (11129)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas matt 8 mm VSG (11129)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 41.40);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas matt 10mm VSG (11132)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas matt 10mm VSG (11132)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 46.58);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas Stopsol klar 10 mm VSG (11391)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas Stopsol klar 10 mm VSG (11391)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 64.90);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas planibel grey 8mm VSG (11905)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas planibel grey 8mm VSG (11905)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 61.27);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Iso Glas 33.1-10-33.1 (11508)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Iso Glas 33.1-10-33.1 (11508)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 115.79);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Iso Glas 33.1-10-33.1 24mm Matt (11509)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Iso Glas 33.1-10-33.1 24mm Matt (11509)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 140.40);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Selbstschneidene Schrauben (Torx) inkl. Dichtung in RAL Farbe (11423)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Selbstschneidene Schrauben (Torx) inkl. Dichtung in RAL Farbe (11423)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"25 Stk.","dimension":"5,5x27","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 20.09);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Keilfenster';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Keilfenster', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 16.13);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Panoramaschiebewände (11333)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Panoramaschiebewände (11333)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 18.74);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Markisen (11336)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Markisen (11336)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 17.30);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Abdeckkappen (11080)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Abdeckkappen (11080)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"16 Stk.","dimension":"3,5x19","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 8.68);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dachschrauben (Torx) inkl. Dichtung in RAL Farbe (11400)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dachschrauben (Torx) inkl. Dichtung in RAL Farbe (11400)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"25 Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 18.08);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset freistehende Lösung (11325)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset freistehende Lösung (11325)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 33.27);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Orangeline / Trendline / Topline (11328)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Orangeline / Trendline / Topline (11328)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 42.41);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset erweiterung Topline XL';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset erweiterung Topline XL', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 43.42);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Designline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Designline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 54.28);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Sparren DL (11327)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Sparren DL (11327)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 44.89);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Ultraline (11329)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Ultraline (11329)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 73.66);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Betonfundament mit Auslauf (11064)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Betonfundament mit Auslauf (11064)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"250x250x350 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 38.45);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament (klein,verzinkt) Montageplatte  (11371)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament (klein,verzinkt) Montageplatte  (11371)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 47.39);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament (klein,verzinkt) Montageplatte  RAL 7016 (oder RAL 9016, auslaufend)  (11371)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament (klein,verzinkt) Montageplatte  RAL 7016 (oder RAL 9016, auslaufend)  (11371)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 47.39);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Grundbügel (11151)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Grundbügel (11151)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"104x80x5mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 11.86);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlmauerschuh (je links/rechts) (11376)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlmauerschuh (je links/rechts) (11376)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 100.04);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament zum Einbetonieren (11367)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament zum Einbetonieren (11367)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 129.92);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament zum Aufdübeln asymetrisch (mit Montageplatte) (11369)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament zum Aufdübeln asymetrisch (mit Montageplatte) (11369)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 85.67);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament zum Aufdübeln symetrisch (mit Montageplatte) (11370)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament zum Aufdübeln symetrisch (mit Montageplatte) (11370)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 85.67);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament zum Einbetonieren (11366)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament zum Einbetonieren (11366)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 169.98);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament mit Montageplatte (11368)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament mit Montageplatte (11368)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 106.10);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament zum Einbetonieren (11144)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament zum Einbetonieren (11144)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1800 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 123.16);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Stahlfundament mit Montageplatte (11368)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Stahlfundament mit Montageplatte (11368)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"±1000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 106.10);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC Rohr (11296)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC Rohr (11296)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80x2500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 15.55);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verbindungsmuffe (11381)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verbindungsmuffe (11381)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":" Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 2.68);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC Reduzierung (11356)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC Reduzierung (11356)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80/75 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 2.35);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC 90° Bogen (11077)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC 90° Bogen (11077)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4.22);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC 45° Bogen (11076)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC 45° Bogen (11076)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 3.52);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC T-Stück';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC T-Stück', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 5.00);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Laubfänger (11168/11169)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Laubfänger (11168/11169)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4.73);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Clean Box (11470)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Clean Box (11470)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":1,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 42.11);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Deep Clean Box (11469)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Deep Clean Box (11469)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":1,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 68.42);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Lackstift (11214)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Lackstift (11214)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"nur standard Farben","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 14.21);
END $$;

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sprühdose';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sprühdose', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"nur standard Farben","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28.42);
END $$;