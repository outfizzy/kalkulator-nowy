
-- Aluxe V2 Import Script
-- Generated: 2026-01-18T16:12:06.451Z

BEGIN;
    

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
        
(v_table_id, 3000, 2000, 954),
(v_table_id, 3000, 2500, 1039),
(v_table_id, 3000, 3000, 1125),
(v_table_id, 3000, 3500, 1273),
(v_table_id, 3000, 4000, 1446),
(v_table_id, 3000, 4500, 1640),
(v_table_id, 3000, 5000, 1880),
(v_table_id, 4000, 2000, 1180),
(v_table_id, 4000, 2500, 1290),
(v_table_id, 4000, 3000, 1400),
(v_table_id, 4000, 3500, 1686),
(v_table_id, 4000, 4000, 1906),
(v_table_id, 4000, 4500, 2149),
(v_table_id, 4000, 5000, 2483),
(v_table_id, 5000, 2000, 1528),
(v_table_id, 5000, 2500, 1662),
(v_table_id, 5000, 3000, 1796),
(v_table_id, 5000, 3500, 2027),
(v_table_id, 5000, 4000, 2232),
(v_table_id, 5000, 4500, 2524),
(v_table_id, 5000, 5000, 2953),
(v_table_id, 6000, 2000, 1694),
(v_table_id, 6000, 2500, 1852),
(v_table_id, 6000, 3000, 2010),
(v_table_id, 6000, 3500, 2282),
(v_table_id, 6000, 4000, 2594),
(v_table_id, 6000, 4500, 2936),
(v_table_id, 6000, 5000, 3460),
(v_table_id, 7000, 2000, 1921),
(v_table_id, 7000, 2500, 2102),
(v_table_id, 7000, 3000, 2284),
(v_table_id, 7000, 3500, 2599),
(v_table_id, 7000, 4000, 2957),
(v_table_id, 7000, 4500, 3348),
(v_table_id, 7000, 5000, 3966),
(v_table_id, 7950, 2000, 2139),
(v_table_id, 7950, 2500, 2344),
(v_table_id, 7950, 3000, 2548),
(v_table_id, 7950, 3500, 2904),
(v_table_id, 7950, 4000, 3308),
(v_table_id, 7950, 4500, 3748),
(v_table_id, 7950, 5000, 4461)
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
        
(v_table_id, 3000, 2000, 954),
(v_table_id, 3000, 2500, 1039),
(v_table_id, 3000, 3000, 1183),
(v_table_id, 3000, 3500, 1273),
(v_table_id, 3000, 4000, 1529),
(v_table_id, 3000, 4500, 1756),
(v_table_id, 3000, 4900, 1873),
(v_table_id, 4000, 2000, 1180),
(v_table_id, 4000, 2500, 1290),
(v_table_id, 4000, 3000, 1572),
(v_table_id, 4000, 3500, 1686),
(v_table_id, 4000, 4000, 2008),
(v_table_id, 4000, 4500, 2322),
(v_table_id, 4000, 4900, 2475),
(v_table_id, 5000, 2000, 1528),
(v_table_id, 5000, 2500, 1662),
(v_table_id, 5000, 3000, 1887),
(v_table_id, 5000, 3500, 1966),
(v_table_id, 5000, 4000, 2353),
(v_table_id, 5000, 4500, 2756),
(v_table_id, 5000, 4900, 2943),
(v_table_id, 6000, 2000, 1694),
(v_table_id, 6000, 2500, 1852),
(v_table_id, 6000, 3000, 2118),
(v_table_id, 6000, 3500, 2282),
(v_table_id, 6000, 4000, 2735),
(v_table_id, 6000, 4500, 3225),
(v_table_id, 6000, 4900, 3447),
(v_table_id, 7000, 2000, 1921),
(v_table_id, 7000, 2500, 2102),
(v_table_id, 7000, 3000, 2410),
(v_table_id, 7000, 3500, 2599),
(v_table_id, 7000, 4000, 3116),
(v_table_id, 7000, 4500, 3695),
(v_table_id, 7000, 4900, 3951),
(v_table_id, 7950, 2000, 2139),
(v_table_id, 7950, 2500, 2344),
(v_table_id, 7950, 3000, 2690),
(v_table_id, 7950, 3500, 2904),
(v_table_id, 7950, 4000, 3486),
(v_table_id, 7950, 4500, 4153),
(v_table_id, 7950, 4900, 4445)
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
        
(v_table_id, 3000, 2000, 954),
(v_table_id, 3000, 2500, 1039),
(v_table_id, 3000, 3000, 1183),
(v_table_id, 3000, 3500, 1346),
(v_table_id, 3000, 4000, 1529),
(v_table_id, 3000, 4500, 1756),
(v_table_id, 3000, 4600, 1855),
(v_table_id, 4000, 2000, 1180),
(v_table_id, 4000, 2500, 1387),
(v_table_id, 4000, 3000, 1572),
(v_table_id, 4000, 3500, 1778),
(v_table_id, 4000, 4000, 2008),
(v_table_id, 4000, 4500, 2322),
(v_table_id, 4000, 4600, 2450),
(v_table_id, 5000, 2000, 1528),
(v_table_id, 5000, 2500, 1662),
(v_table_id, 5000, 3000, 1827),
(v_table_id, 5000, 3500, 2077),
(v_table_id, 5000, 4000, 2353),
(v_table_id, 5000, 4500, 2756),
(v_table_id, 5000, 4600, 2912),
(v_table_id, 6000, 2000, 1694),
(v_table_id, 6000, 2500, 1852),
(v_table_id, 6000, 3000, 2118),
(v_table_id, 6000, 3500, 2412),
(v_table_id, 6000, 4000, 2735),
(v_table_id, 6000, 4500, 3225),
(v_table_id, 6000, 4600, 3410),
(v_table_id, 7000, 2000, 1921),
(v_table_id, 7000, 2500, 2102),
(v_table_id, 7000, 3000, 2410),
(v_table_id, 7000, 3500, 2746),
(v_table_id, 7000, 4000, 3116),
(v_table_id, 7000, 4500, 3695),
(v_table_id, 7000, 4600, 3908),
(v_table_id, 7950, 2000, 2139),
(v_table_id, 7950, 2500, 2344),
(v_table_id, 7950, 3000, 2690),
(v_table_id, 7950, 3500, 3070),
(v_table_id, 7950, 4000, 3486),
(v_table_id, 7950, 4500, 4153),
(v_table_id, 7950, 4600, 4395)
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
        
(v_table_id, 3000, 2000, 1098),
(v_table_id, 3000, 2500, 1220),
(v_table_id, 3000, 3000, 1341),
(v_table_id, 3000, 3500, 1532),
(v_table_id, 3000, 4000, 1764),
(v_table_id, 3000, 4500, 2020),
(v_table_id, 3000, 5000, 2366),
(v_table_id, 4000, 2000, 1354),
(v_table_id, 4000, 2500, 1506),
(v_table_id, 4000, 3000, 1756),
(v_table_id, 4000, 3500, 1996),
(v_table_id, 4000, 4000, 2280),
(v_table_id, 4000, 4500, 2593),
(v_table_id, 4000, 5000, 3041),
(v_table_id, 5000, 2000, 1789),
(v_table_id, 5000, 2500, 1987),
(v_table_id, 5000, 3000, 2185),
(v_table_id, 5000, 3500, 2435),
(v_table_id, 5000, 4000, 2810),
(v_table_id, 5000, 4500, 3221),
(v_table_id, 5000, 5000, 3855),
(v_table_id, 6000, 2000, 1983),
(v_table_id, 6000, 2500, 2212),
(v_table_id, 6000, 3000, 2441),
(v_table_id, 6000, 3500, 2802),
(v_table_id, 6000, 4000, 3229),
(v_table_id, 6000, 4500, 3697),
(v_table_id, 6000, 5000, 4433),
(v_table_id, 7000, 2000, 2239),
(v_table_id, 7000, 2500, 2499),
(v_table_id, 7000, 3000, 2759),
(v_table_id, 7000, 3500, 3168),
(v_table_id, 7000, 4000, 3648),
(v_table_id, 7000, 4500, 4172),
(v_table_id, 7000, 5000, 5010),
(v_table_id, 7950, 2000, 2484),
(v_table_id, 7950, 2500, 2775),
(v_table_id, 7950, 3000, 3063),
(v_table_id, 7950, 3500, 3520),
(v_table_id, 7950, 4000, 4054),
(v_table_id, 7950, 4500, 4635),
(v_table_id, 7950, 5000, 5574)
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
        
(v_table_id, 3000, 2000, 1098),
(v_table_id, 3000, 2500, 1220),
(v_table_id, 3000, 3000, 1341),
(v_table_id, 3000, 3500, 1532),
(v_table_id, 3000, 4000, 1764),
(v_table_id, 3000, 4500, 2020),
(v_table_id, 3000, 5000, 2366),
(v_table_id, 4000, 2000, 1354),
(v_table_id, 4000, 2500, 1603),
(v_table_id, 4000, 3000, 1756),
(v_table_id, 4000, 3500, 1996),
(v_table_id, 4000, 4000, 2280),
(v_table_id, 4000, 4500, 2593),
(v_table_id, 4000, 5000, 3005),
(v_table_id, 5000, 2000, 1789),
(v_table_id, 5000, 2500, 1987),
(v_table_id, 5000, 3000, 2124),
(v_table_id, 5000, 3500, 2435),
(v_table_id, 5000, 4000, 2810),
(v_table_id, 5000, 4500, 3221),
(v_table_id, 5000, 5000, 3855),
(v_table_id, 6000, 2000, 1983),
(v_table_id, 6000, 2500, 2212),
(v_table_id, 6000, 3000, 2441),
(v_table_id, 6000, 3500, 2802),
(v_table_id, 6000, 4000, 3229),
(v_table_id, 6000, 4500, 3697),
(v_table_id, 6000, 5000, 4433),
(v_table_id, 7000, 2000, 2239),
(v_table_id, 7000, 2500, 2499),
(v_table_id, 7000, 3000, 2759),
(v_table_id, 7000, 3500, 3168),
(v_table_id, 7000, 4000, 3648),
(v_table_id, 7000, 4500, 4172),
(v_table_id, 7000, 5000, 5010),
(v_table_id, 7950, 2000, 2484),
(v_table_id, 7950, 2500, 2775),
(v_table_id, 7950, 3000, 3063),
(v_table_id, 7950, 3500, 3520),
(v_table_id, 7950, 4000, 4054),
(v_table_id, 7950, 4500, 4635),
(v_table_id, 7950, 5000, 5574)
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
        
(v_table_id, 3000, 2000, 1129),
(v_table_id, 3000, 2500, 1258),
(v_table_id, 3000, 3000, 1453),
(v_table_id, 3000, 3500, 1679),
(v_table_id, 3000, 4000, 1930),
(v_table_id, 3000, 4500, 2263),
(v_table_id, 3000, 4700, 2507),
(v_table_id, 4000, 2000, 1492),
(v_table_id, 4000, 2500, 1655),
(v_table_id, 4000, 3000, 1900),
(v_table_id, 4000, 3500, 2179),
(v_table_id, 4000, 4000, 2486),
(v_table_id, 4000, 4500, 2881),
(v_table_id, 4000, 4700, 3062),
(v_table_id, 5000, 2000, 1840),
(v_table_id, 5000, 2500, 1991),
(v_table_id, 5000, 3000, 2307),
(v_table_id, 5000, 3500, 2673),
(v_table_id, 5000, 4000, 3076),
(v_table_id, 5000, 4500, 3684),
(v_table_id, 5000, 4700, 3927),
(v_table_id, 6000, 2000, 2045),
(v_table_id, 6000, 2500, 2290),
(v_table_id, 6000, 3000, 2657),
(v_table_id, 6000, 3500, 3076),
(v_table_id, 6000, 4000, 3535),
(v_table_id, 6000, 4500, 4241),
(v_table_id, 6000, 4700, 4519),
(v_table_id, 7000, 2000, 2311),
(v_table_id, 7000, 2500, 2589),
(v_table_id, 7000, 3000, 3007),
(v_table_id, 7000, 3500, 3479),
(v_table_id, 7000, 4000, 3995),
(v_table_id, 7000, 4500, 4798),
(v_table_id, 7000, 4700, 5111),
(v_table_id, 7950, 2000, 2566),
(v_table_id, 7950, 2500, 2878),
(v_table_id, 7950, 3000, 3342),
(v_table_id, 7950, 3500, 3867),
(v_table_id, 7950, 4000, 4439),
(v_table_id, 7950, 4500, 5340),
(v_table_id, 7950, 4700, 5688)
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
        
(v_table_id, 3000, 2000, 1238),
(v_table_id, 3000, 2500, 1332),
(v_table_id, 3000, 3000, 1426),
(v_table_id, 3000, 3500, 1590),
(v_table_id, 3000, 4000, 1786),
(v_table_id, 3000, 4500, 2004),
(v_table_id, 3000, 5000, 2255),
(v_table_id, 4000, 2000, 1527),
(v_table_id, 4000, 2500, 1647),
(v_table_id, 4000, 3000, 1767),
(v_table_id, 4000, 3500, 1978),
(v_table_id, 4000, 4000, 2225),
(v_table_id, 4000, 4500, 2498),
(v_table_id, 4000, 5000, 2847),
(v_table_id, 5000, 2000, 1816),
(v_table_id, 5000, 2500, 1962),
(v_table_id, 5000, 3000, 2108),
(v_table_id, 5000, 3500, 2366),
(v_table_id, 5000, 4000, 2664),
(v_table_id, 5000, 4500, 2993),
(v_table_id, 5000, 5000, 3439),
(v_table_id, 6000, 2000, 2105),
(v_table_id, 6000, 2500, 2277),
(v_table_id, 6000, 3000, 2449),
(v_table_id, 6000, 3500, 2753),
(v_table_id, 6000, 4000, 3276),
(v_table_id, 6000, 4500, 3660),
(v_table_id, 6000, 5000, 4204),
(v_table_id, 7000, 2000, 2689),
(v_table_id, 7000, 2500, 2887),
(v_table_id, 7000, 3000, 2884),
(v_table_id, 7000, 3500, 3235),
(v_table_id, 7000, 4000, 3636),
(v_table_id, 7000, 4500, 4075),
(v_table_id, 7000, 5000, 4717)
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
        
(v_table_id, 3000, 2000, 1238),
(v_table_id, 3000, 2500, 1332),
(v_table_id, 3000, 3000, 1492),
(v_table_id, 3000, 3500, 1590),
(v_table_id, 3000, 4000, 1881),
(v_table_id, 3000, 4500, 2119),
(v_table_id, 3000, 4900, 2249),
(v_table_id, 4000, 2000, 1527),
(v_table_id, 4000, 2500, 1647),
(v_table_id, 4000, 3000, 1853),
(v_table_id, 4000, 3500, 1978),
(v_table_id, 4000, 4000, 2342),
(v_table_id, 4000, 4500, 2672),
(v_table_id, 4000, 4900, 2839),
(v_table_id, 5000, 2000, 1816),
(v_table_id, 5000, 2500, 1962),
(v_table_id, 5000, 3000, 2213),
(v_table_id, 5000, 3500, 2366),
(v_table_id, 5000, 4000, 2803),
(v_table_id, 5000, 4500, 3224),
(v_table_id, 5000, 4900, 3429),
(v_table_id, 6000, 2000, 2105),
(v_table_id, 6000, 2500, 2277),
(v_table_id, 6000, 3000, 2574),
(v_table_id, 6000, 3500, 2926),
(v_table_id, 6000, 4000, 3437),
(v_table_id, 6000, 4500, 3949),
(v_table_id, 6000, 4900, 4192),
(v_table_id, 7000, 2000, 2689),
(v_table_id, 7000, 2500, 2887),
(v_table_id, 7000, 3000, 3028),
(v_table_id, 7000, 3500, 3235),
(v_table_id, 7000, 4000, 3819),
(v_table_id, 7000, 4500, 4422),
(v_table_id, 7000, 4900, 4702)
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
        
(v_table_id, 3000, 2000, 1238),
(v_table_id, 3000, 2500, 1332),
(v_table_id, 3000, 3000, 1492),
(v_table_id, 3000, 3500, 1675),
(v_table_id, 3000, 4000, 1881),
(v_table_id, 3000, 4500, 2119),
(v_table_id, 3000, 4600, 2230),
(v_table_id, 4000, 2000, 1527),
(v_table_id, 4000, 2500, 1647),
(v_table_id, 4000, 3000, 1853),
(v_table_id, 4000, 3500, 2084),
(v_table_id, 4000, 4000, 2342),
(v_table_id, 4000, 4500, 2672),
(v_table_id, 4000, 4600, 2814),
(v_table_id, 5000, 2000, 1816),
(v_table_id, 5000, 2500, 1962),
(v_table_id, 5000, 3000, 2213),
(v_table_id, 5000, 3500, 2493),
(v_table_id, 5000, 4000, 2803),
(v_table_id, 5000, 4500, 3368),
(v_table_id, 5000, 4600, 3542),
(v_table_id, 6000, 2000, 2105),
(v_table_id, 6000, 2500, 2277),
(v_table_id, 6000, 3000, 2747),
(v_table_id, 6000, 3500, 3075),
(v_table_id, 6000, 4000, 3437),
(v_table_id, 6000, 4500, 3869),
(v_table_id, 6000, 4600, 4075),
(v_table_id, 7000, 2000, 2689),
(v_table_id, 7000, 2500, 2887),
(v_table_id, 7000, 3000, 3028),
(v_table_id, 7000, 3500, 3405),
(v_table_id, 7000, 4000, 3819),
(v_table_id, 7000, 4500, 4422),
(v_table_id, 7000, 4600, 4658)
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
        
(v_table_id, 3000, 2000, 1393),
(v_table_id, 3000, 2500, 1525),
(v_table_id, 3000, 3000, 1657),
(v_table_id, 3000, 3500, 1870),
(v_table_id, 3000, 4000, 2129),
(v_table_id, 3000, 4500, 2416),
(v_table_id, 3000, 5000, 2778),
(v_table_id, 4000, 2000, 1711),
(v_table_id, 4000, 2500, 1877),
(v_table_id, 4000, 3000, 2042),
(v_table_id, 4000, 3500, 2308),
(v_table_id, 4000, 4000, 2626),
(v_table_id, 4000, 4500, 2976),
(v_table_id, 4000, 5000, 3442),
(v_table_id, 5000, 2000, 2097),
(v_table_id, 5000, 2500, 2312),
(v_table_id, 5000, 3000, 2527),
(v_table_id, 5000, 3500, 2873),
(v_table_id, 5000, 4000, 3292),
(v_table_id, 5000, 4500, 3752),
(v_table_id, 5000, 5000, 4555),
(v_table_id, 6000, 2000, 2415),
(v_table_id, 6000, 2500, 2664),
(v_table_id, 6000, 3000, 2912),
(v_table_id, 6000, 3500, 3485),
(v_table_id, 6000, 4000, 3962),
(v_table_id, 6000, 4500, 4485),
(v_table_id, 6000, 5000, 5249),
(v_table_id, 7000, 2000, 2827),
(v_table_id, 7000, 2500, 3109),
(v_table_id, 7000, 3000, 3391),
(v_table_id, 7000, 3500, 3844),
(v_table_id, 7000, 4000, 4380),
(v_table_id, 7000, 4500, 4965),
(v_table_id, 7000, 5000, 5834)
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
        
(v_table_id, 3000, 2000, 1393),
(v_table_id, 3000, 2500, 1525),
(v_table_id, 3000, 3000, 1657),
(v_table_id, 3000, 3500, 1870),
(v_table_id, 3000, 4000, 2129),
(v_table_id, 3000, 4500, 2416),
(v_table_id, 3000, 5000, 2778),
(v_table_id, 4000, 2000, 1711),
(v_table_id, 4000, 2500, 1877),
(v_table_id, 4000, 3000, 2042),
(v_table_id, 4000, 3500, 2308),
(v_table_id, 4000, 4000, 2626),
(v_table_id, 4000, 4500, 2976),
(v_table_id, 4000, 5000, 3442),
(v_table_id, 5000, 2000, 2097),
(v_table_id, 5000, 2500, 2312),
(v_table_id, 5000, 3000, 2527),
(v_table_id, 5000, 3500, 2873),
(v_table_id, 5000, 4000, 3292),
(v_table_id, 5000, 4500, 3752),
(v_table_id, 5000, 5000, 4555),
(v_table_id, 6000, 2000, 2415),
(v_table_id, 6000, 2500, 2664),
(v_table_id, 6000, 3000, 3085),
(v_table_id, 6000, 3500, 3485),
(v_table_id, 6000, 4000, 3962),
(v_table_id, 6000, 4500, 4485),
(v_table_id, 6000, 5000, 5170),
(v_table_id, 7000, 2000, 2827),
(v_table_id, 7000, 2500, 3109),
(v_table_id, 7000, 3000, 3391),
(v_table_id, 7000, 3500, 3844),
(v_table_id, 7000, 4000, 4380),
(v_table_id, 7000, 4500, 4965),
(v_table_id, 7000, 5000, 5834)
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
        
(v_table_id, 3000, 2000, 1424),
(v_table_id, 3000, 2500, 1564),
(v_table_id, 3000, 3000, 1779),
(v_table_id, 3000, 3500, 2030),
(v_table_id, 3000, 4000, 2310),
(v_table_id, 3000, 4500, 2660),
(v_table_id, 3000, 4700, 2821),
(v_table_id, 4000, 2000, 1753),
(v_table_id, 4000, 2500, 1929),
(v_table_id, 4000, 3000, 2199),
(v_table_id, 4000, 3500, 2508),
(v_table_id, 4000, 4000, 2850),
(v_table_id, 4000, 4500, 3301),
(v_table_id, 4000, 4700, 3500),
(v_table_id, 5000, 2000, 2149),
(v_table_id, 5000, 2500, 2377),
(v_table_id, 5000, 3000, 2727),
(v_table_id, 5000, 3500, 3134),
(v_table_id, 5000, 4000, 3727),
(v_table_id, 5000, 4500, 4359),
(v_table_id, 5000, 4700, 4627),
(v_table_id, 6000, 2000, 2477),
(v_table_id, 6000, 2500, 2914),
(v_table_id, 6000, 3000, 3320),
(v_table_id, 6000, 3500, 3785),
(v_table_id, 6000, 4000, 4216),
(v_table_id, 6000, 4500, 4950),
(v_table_id, 6000, 4700, 5256),
(v_table_id, 7000, 2000, 2900),
(v_table_id, 7000, 2500, 3200),
(v_table_id, 7000, 3000, 3660),
(v_table_id, 7000, 3500, 4183),
(v_table_id, 7000, 4000, 4756),
(v_table_id, 7000, 4500, 5591),
(v_table_id, 7000, 4700, 5935)
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
        
(v_table_id, 6000, 2000, 2560),
(v_table_id, 6000, 2500, 2735),
(v_table_id, 6000, 3000, 2909),
(v_table_id, 6000, 3500, 3219),
(v_table_id, 6000, 4000, 3576),
(v_table_id, 6000, 4500, 3967),
(v_table_id, 6000, 5000, 4515),
(v_table_id, 7000, 2000, 2908),
(v_table_id, 7000, 2500, 3109),
(v_table_id, 7000, 3000, 3310),
(v_table_id, 7000, 3500, 3668),
(v_table_id, 7000, 4000, 4076),
(v_table_id, 7000, 4500, 4524),
(v_table_id, 7000, 5000, 5391)
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
        
(v_table_id, 6000, 2000, 2560),
(v_table_id, 6000, 2500, 2735),
(v_table_id, 6000, 3000, 3037),
(v_table_id, 6000, 3500, 3219),
(v_table_id, 6000, 4000, 3741),
(v_table_id, 6000, 4500, 4256),
(v_table_id, 6000, 4900, 4502),
(v_table_id, 7000, 2000, 2908),
(v_table_id, 7000, 2500, 3109),
(v_table_id, 7000, 3000, 3458),
(v_table_id, 7000, 3500, 3668),
(v_table_id, 7000, 4000, 4485),
(v_table_id, 7000, 4500, 5092),
(v_table_id, 7000, 4900, 5376)
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
        
(v_table_id, 6000, 2000, 2560),
(v_table_id, 6000, 2500, 2735),
(v_table_id, 6000, 3000, 3037),
(v_table_id, 6000, 3500, 3371),
(v_table_id, 6000, 4000, 3741),
(v_table_id, 6000, 4500, 4256),
(v_table_id, 6000, 4600, 4465),
(v_table_id, 7000, 2000, 2908),
(v_table_id, 7000, 2500, 3109),
(v_table_id, 7000, 3000, 3458),
(v_table_id, 7000, 3500, 4062),
(v_table_id, 7000, 4000, 4485),
(v_table_id, 7000, 4500, 5092),
(v_table_id, 7000, 4600, 5252)
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
        
(v_table_id, 6000, 2000, 2853),
(v_table_id, 6000, 2500, 3104),
(v_table_id, 6000, 3000, 3354),
(v_table_id, 6000, 3500, 3758),
(v_table_id, 6000, 4000, 4241),
(v_table_id, 6000, 4500, 4770),
(v_table_id, 6000, 5000, 5537),
(v_table_id, 7000, 2000, 3228),
(v_table_id, 7000, 2500, 3512),
(v_table_id, 7000, 3000, 3796),
(v_table_id, 7000, 3500, 4254),
(v_table_id, 7000, 4000, 5017),
(v_table_id, 7000, 4500, 5609),
(v_table_id, 7000, 5000, 6482)
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
        
(v_table_id, 6000, 2000, 2853),
(v_table_id, 6000, 2500, 3104),
(v_table_id, 6000, 3000, 3354),
(v_table_id, 6000, 3500, 3758),
(v_table_id, 6000, 4000, 4241),
(v_table_id, 6000, 4500, 4770),
(v_table_id, 6000, 5000, 5537),
(v_table_id, 7000, 2000, 3228),
(v_table_id, 7000, 2500, 3512),
(v_table_id, 7000, 3000, 3796),
(v_table_id, 7000, 3500, 4476),
(v_table_id, 7000, 4000, 5017),
(v_table_id, 7000, 4500, 5609),
(v_table_id, 7000, 5000, 6400)
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
        
(v_table_id, 6000, 2000, 2915),
(v_table_id, 6000, 2500, 3181),
(v_table_id, 6000, 3000, 3591),
(v_table_id, 6000, 3500, 4061),
(v_table_id, 6000, 4000, 4577),
(v_table_id, 6000, 4500, 5504),
(v_table_id, 6000, 4700, 5813),
(v_table_id, 7000, 2000, 3300),
(v_table_id, 7000, 2500, 3603),
(v_table_id, 7000, 3000, 4289),
(v_table_id, 7000, 3500, 4818),
(v_table_id, 7000, 4000, 5397),
(v_table_id, 7000, 4500, 6153),
(v_table_id, 7000, 4700, 6501)
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
        
(v_table_id, 4000, 5000, 5428),
(v_table_id, 4000, 6000, 6079),
(v_table_id, 5000, 3000, 4916),
(v_table_id, 5000, 3500, 5315),
(v_table_id, 5000, 4000, 5713),
(v_table_id, 5000, 4500, 6111),
(v_table_id, 5000, 5000, 6510),
(v_table_id, 5000, 6000, 7307),
(v_table_id, 6000, 3000, 5708),
(v_table_id, 6000, 3500, 6179),
(v_table_id, 6000, 4000, 6650),
(v_table_id, 6000, 4500, 7121),
(v_table_id, 6000, 5000, 7592),
(v_table_id, 6000, 6000, 8880),
(v_table_id, 7000, 3000, 6499),
(v_table_id, 7000, 3500, 7043),
(v_table_id, 7000, 4000, 7990),
(v_table_id, 7000, 4500, 8534),
(v_table_id, 7000, 5000, 9078),
(v_table_id, 7000, 6000, 10015)
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
        
(v_table_id, 4000, 5000, 5428),
(v_table_id, 4000, 6000, 6079),
(v_table_id, 5000, 3000, 4916),
(v_table_id, 5000, 3500, 5315),
(v_table_id, 5000, 4000, 5713),
(v_table_id, 5000, 4500, 6111),
(v_table_id, 5000, 5000, 6510),
(v_table_id, 5000, 6000, 7307),
(v_table_id, 6000, 3000, 5708),
(v_table_id, 6000, 3500, 6179),
(v_table_id, 6000, 4000, 6650),
(v_table_id, 6000, 4500, 7121),
(v_table_id, 6000, 5000, 7592),
(v_table_id, 6000, 6000, 8880),
(v_table_id, 7000, 3000, 6499),
(v_table_id, 7000, 3500, 7043),
(v_table_id, 7000, 4000, 7990),
(v_table_id, 7000, 4500, 8534),
(v_table_id, 7000, 5000, 9078),
(v_table_id, 7000, 6000, 10015)
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
        
(v_table_id, 4000, 5000, 5531),
(v_table_id, 4000, 6000, 6203),
(v_table_id, 5000, 3000, 4994),
(v_table_id, 5000, 3500, 5405),
(v_table_id, 5000, 4000, 5816),
(v_table_id, 5000, 4500, 6228),
(v_table_id, 5000, 5000, 6639),
(v_table_id, 5000, 6000, 7462),
(v_table_id, 6000, 3000, 5801),
(v_table_id, 6000, 3500, 6287),
(v_table_id, 6000, 4000, 6774),
(v_table_id, 6000, 4500, 7261),
(v_table_id, 6000, 5000, 8093),
(v_table_id, 6000, 6000, 9066),
(v_table_id, 7000, 3000, 7011),
(v_table_id, 7000, 3500, 7573),
(v_table_id, 7000, 4000, 8135),
(v_table_id, 7000, 4500, 8546),
(v_table_id, 7000, 5000, 9108),
(v_table_id, 7000, 6000, 10232)
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
            
(v_table_id, 1500, 2000, 587),
(v_table_id, 1500, 2100, 590),
(v_table_id, 1500, 2200, 592),
(v_table_id, 1500, 2300, 594),
(v_table_id, 1500, 2400, 596),
(v_table_id, 1500, 2500, 599),
(v_table_id, 1500, 2600, 601),
(v_table_id, 1500, 2700, 603),
(v_table_id, 2000, 2000, 849),
(v_table_id, 2000, 2100, 851),
(v_table_id, 2000, 2200, 853),
(v_table_id, 2000, 2300, 855),
(v_table_id, 2000, 2400, 858),
(v_table_id, 2000, 2500, 860),
(v_table_id, 2000, 2600, 862),
(v_table_id, 2000, 2700, 864),
(v_table_id, 2500, 2000, 868),
(v_table_id, 2500, 2100, 870),
(v_table_id, 2500, 2200, 873),
(v_table_id, 2500, 2300, 875),
(v_table_id, 2500, 2400, 877),
(v_table_id, 2500, 2500, 879),
(v_table_id, 2500, 2600, 882),
(v_table_id, 2500, 2700, 884),
(v_table_id, 3000, 2000, 1129),
(v_table_id, 3000, 2100, 1132),
(v_table_id, 3000, 2200, 1134),
(v_table_id, 3000, 2300, 1136),
(v_table_id, 3000, 2400, 1138),
(v_table_id, 3000, 2500, 1141),
(v_table_id, 3000, 2600, 1143),
(v_table_id, 3000, 2700, 1145),
(v_table_id, 3500, 2000, 1149),
(v_table_id, 3500, 2100, 1151),
(v_table_id, 3500, 2200, 1154),
(v_table_id, 3500, 2300, 1156),
(v_table_id, 3500, 2400, 1158),
(v_table_id, 3500, 2500, 1160),
(v_table_id, 3500, 2600, 1162),
(v_table_id, 3500, 2700, 1165),
(v_table_id, 4000, 2000, 1410),
(v_table_id, 4000, 2100, 1412),
(v_table_id, 4000, 2200, 1415),
(v_table_id, 4000, 2300, 1417),
(v_table_id, 4000, 2400, 1419),
(v_table_id, 4000, 2500, 1421),
(v_table_id, 4000, 2600, 1424),
(v_table_id, 4000, 2700, 1426),
(v_table_id, 4500, 2000, 1430),
(v_table_id, 4500, 2100, 1432),
(v_table_id, 4500, 2200, 1434),
(v_table_id, 4500, 2300, 1437),
(v_table_id, 4500, 2400, 1439),
(v_table_id, 4500, 2500, 1441),
(v_table_id, 4500, 2600, 1443),
(v_table_id, 4500, 2700, 1446),
(v_table_id, 5000, 2000, 1691),
(v_table_id, 5000, 2100, 1693),
(v_table_id, 5000, 2200, 1696),
(v_table_id, 5000, 2300, 1698),
(v_table_id, 5000, 2400, 1700),
(v_table_id, 5000, 2500, 1702),
(v_table_id, 5000, 2600, 1704),
(v_table_id, 5000, 2700, 1707),
(v_table_id, 5500, 2000, 1952),
(v_table_id, 5500, 2100, 1954),
(v_table_id, 5500, 2200, 1957),
(v_table_id, 5500, 2300, 1959),
(v_table_id, 5500, 2400, 1961),
(v_table_id, 5500, 2500, 1963),
(v_table_id, 5500, 2600, 1966),
(v_table_id, 5500, 2700, 1968),
(v_table_id, 6000, 2000, 1972),
(v_table_id, 6000, 2100, 1974),
(v_table_id, 6000, 2200, 1976),
(v_table_id, 6000, 2300, 1979),
(v_table_id, 6000, 2400, 1981),
(v_table_id, 6000, 2500, 1983),
(v_table_id, 6000, 2600, 1985),
(v_table_id, 6000, 2700, 1988),
(v_table_id, 6500, 2000, 2233),
(v_table_id, 6500, 2100, 2235),
(v_table_id, 6500, 2200, 2238),
(v_table_id, 6500, 2300, 2240),
(v_table_id, 6500, 2400, 2242),
(v_table_id, 6500, 2500, 2244),
(v_table_id, 6500, 2600, 2246),
(v_table_id, 6500, 2700, 2249),
(v_table_id, 7000, 2000, 2253),
(v_table_id, 7000, 2100, 2255),
(v_table_id, 7000, 2200, 2257),
(v_table_id, 7000, 2300, 2259),
(v_table_id, 7000, 2400, 2262),
(v_table_id, 7000, 2500, 2264),
(v_table_id, 7000, 2600, 2266),
(v_table_id, 7000, 2700, 2268),
(v_table_id, 7500, 2000, 2514),
(v_table_id, 7500, 2100, 2516),
(v_table_id, 7500, 2200, 2518),
(v_table_id, 7500, 2300, 2521),
(v_table_id, 7500, 2400, 2523),
(v_table_id, 7500, 2500, 2525),
(v_table_id, 7500, 2600, 2527),
(v_table_id, 7500, 2700, 2530),
(v_table_id, 8000, 2000, 2533),
(v_table_id, 8000, 2100, 2536),
(v_table_id, 8000, 2200, 2538),
(v_table_id, 8000, 2300, 2540),
(v_table_id, 8000, 2400, 2542),
(v_table_id, 8000, 2500, 2545),
(v_table_id, 8000, 2600, 2547),
(v_table_id, 8000, 2700, 2549),
(v_table_id, 8500, 2000, 2795),
(v_table_id, 8500, 2100, 2797),
(v_table_id, 8500, 2200, 2799),
(v_table_id, 8500, 2300, 2801),
(v_table_id, 8500, 2400, 2804),
(v_table_id, 8500, 2500, 2806),
(v_table_id, 8500, 2600, 2808),
(v_table_id, 8500, 2700, 2810)
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
            
(v_table_id, 1500, 2000, 635),
(v_table_id, 1500, 2100, 637),
(v_table_id, 1500, 2200, 639),
(v_table_id, 1500, 2300, 641),
(v_table_id, 1500, 2400, 644),
(v_table_id, 1500, 2500, 646),
(v_table_id, 1500, 2600, 648),
(v_table_id, 1500, 2700, 650),
(v_table_id, 2000, 2000, 915),
(v_table_id, 2000, 2100, 917),
(v_table_id, 2000, 2200, 919),
(v_table_id, 2000, 2300, 922),
(v_table_id, 2000, 2400, 924),
(v_table_id, 2000, 2500, 926),
(v_table_id, 2000, 2600, 928),
(v_table_id, 2000, 2700, 931),
(v_table_id, 2500, 2000, 944),
(v_table_id, 2500, 2100, 946),
(v_table_id, 2500, 2200, 948),
(v_table_id, 2500, 2300, 951),
(v_table_id, 2500, 2400, 953),
(v_table_id, 2500, 2500, 955),
(v_table_id, 2500, 2600, 957),
(v_table_id, 2500, 2700, 960),
(v_table_id, 3000, 2000, 1224),
(v_table_id, 3000, 2100, 1226),
(v_table_id, 3000, 2200, 1229),
(v_table_id, 3000, 2300, 1231),
(v_table_id, 3000, 2400, 1233),
(v_table_id, 3000, 2500, 1235),
(v_table_id, 3000, 2600, 1237),
(v_table_id, 3000, 2700, 1240),
(v_table_id, 3500, 2000, 1253),
(v_table_id, 3500, 2100, 1255),
(v_table_id, 3500, 2200, 1258),
(v_table_id, 3500, 2300, 1260),
(v_table_id, 3500, 2400, 1262),
(v_table_id, 3500, 2500, 1264),
(v_table_id, 3500, 2600, 1267),
(v_table_id, 3500, 2700, 1269),
(v_table_id, 4000, 2000, 1533),
(v_table_id, 4000, 2100, 1535),
(v_table_id, 4000, 2200, 1538),
(v_table_id, 4000, 2300, 1540),
(v_table_id, 4000, 2400, 1542),
(v_table_id, 4000, 2500, 1544),
(v_table_id, 4000, 2600, 1547),
(v_table_id, 4000, 2700, 1549),
(v_table_id, 4500, 2000, 1562),
(v_table_id, 4500, 2100, 1565),
(v_table_id, 4500, 2200, 1567),
(v_table_id, 4500, 2300, 1569),
(v_table_id, 4500, 2400, 1571),
(v_table_id, 4500, 2500, 1574),
(v_table_id, 4500, 2600, 1576),
(v_table_id, 4500, 2700, 1578),
(v_table_id, 5000, 2000, 1842),
(v_table_id, 5000, 2100, 1845),
(v_table_id, 5000, 2200, 1847),
(v_table_id, 5000, 2300, 1849),
(v_table_id, 5000, 2400, 1851),
(v_table_id, 5000, 2500, 1854),
(v_table_id, 5000, 2600, 1856),
(v_table_id, 5000, 2700, 1858),
(v_table_id, 5500, 2000, 2123),
(v_table_id, 5500, 2100, 2125),
(v_table_id, 5500, 2200, 2127),
(v_table_id, 5500, 2300, 2129),
(v_table_id, 5500, 2400, 2132),
(v_table_id, 5500, 2500, 2134),
(v_table_id, 5500, 2600, 2136),
(v_table_id, 5500, 2700, 2138),
(v_table_id, 6000, 2000, 2152),
(v_table_id, 6000, 2100, 2154),
(v_table_id, 6000, 2200, 2156),
(v_table_id, 6000, 2300, 2158),
(v_table_id, 6000, 2400, 2161),
(v_table_id, 6000, 2500, 2163),
(v_table_id, 6000, 2600, 2165),
(v_table_id, 6000, 2700, 2167),
(v_table_id, 6500, 2000, 2432),
(v_table_id, 6500, 2100, 2434),
(v_table_id, 6500, 2200, 2436),
(v_table_id, 6500, 2300, 2438),
(v_table_id, 6500, 2400, 2441),
(v_table_id, 6500, 2500, 2443),
(v_table_id, 6500, 2600, 2445),
(v_table_id, 6500, 2700, 2447),
(v_table_id, 7000, 2000, 2461),
(v_table_id, 7000, 2100, 2463),
(v_table_id, 7000, 2200, 2465),
(v_table_id, 7000, 2300, 2468),
(v_table_id, 7000, 2400, 2470),
(v_table_id, 7000, 2500, 2472),
(v_table_id, 7000, 2600, 2474),
(v_table_id, 7000, 2700, 2477),
(v_table_id, 7500, 2000, 2741),
(v_table_id, 7500, 2100, 2743),
(v_table_id, 7500, 2200, 2745),
(v_table_id, 7500, 2300, 2748),
(v_table_id, 7500, 2400, 2750),
(v_table_id, 7500, 2500, 2752),
(v_table_id, 7500, 2600, 2754),
(v_table_id, 7500, 2700, 2757),
(v_table_id, 8000, 2000, 2770),
(v_table_id, 8000, 2100, 2772),
(v_table_id, 8000, 2200, 2774),
(v_table_id, 8000, 2300, 2777),
(v_table_id, 8000, 2400, 2779),
(v_table_id, 8000, 2500, 2781),
(v_table_id, 8000, 2600, 2783),
(v_table_id, 8000, 2700, 2786),
(v_table_id, 8500, 2000, 3050),
(v_table_id, 8500, 2100, 3052),
(v_table_id, 8500, 2200, 3055),
(v_table_id, 8500, 2300, 3057),
(v_table_id, 8500, 2400, 3059),
(v_table_id, 8500, 2500, 3061),
(v_table_id, 8500, 2600, 3064),
(v_table_id, 8500, 2700, 3066)
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
        
(v_table_id, 0, 1000, 597),
(v_table_id, 0, 1500, 796),
(v_table_id, 0, 2000, 883),
(v_table_id, 0, 2500, 1068),
(v_table_id, 0, 3000, 1164),
(v_table_id, 0, 3500, 1372),
(v_table_id, 0, 4000, 1467),
(v_table_id, 0, 4500, 1673),
(v_table_id, 0, 5000, 1769)
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
        
(v_table_id, 1000, 0, 547),
(v_table_id, 2000, 0, 777),
(v_table_id, 3000, 0, 1020),
(v_table_id, 4000, 0, 1262),
(v_table_id, 5000, 0, 1515),
(v_table_id, 6000, 0, 1654),
(v_table_id, 7000, 0, 1862)
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
        
(v_table_id, 2000, 0, 1199),
(v_table_id, 2500, 0, 1287),
(v_table_id, 3000, 0, 1818),
(v_table_id, 3500, 0, 1933),
(v_table_id, 4000, 0, 2054),
(v_table_id, 4500, 0, 2175),
(v_table_id, 5000, 0, 2376),
(v_table_id, 5500, 0, 2923),
(v_table_id, 6000, 0, 3108)
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
        
(v_table_id, 0, 2000, 481),
(v_table_id, 0, 2500, 526),
(v_table_id, 0, 3000, 571),
(v_table_id, 0, 3500, 615),
(v_table_id, 0, 4000, 679),
(v_table_id, 0, 4500, 721),
(v_table_id, 0, 5000, 766),
(v_table_id, 0, 55, 39),
(v_table_id, 0, 891, 21)
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
        
(v_table_id, 3000, 2500, 1466),
(v_table_id, 3000, 3000, 1533),
(v_table_id, 3000, 3500, 1601),
(v_table_id, 3000, 4000, 1704),
(v_table_id, 3000, 4500, 1773),
(v_table_id, 3000, 5000, 1839),
(v_table_id, 3500, 2500, 1566),
(v_table_id, 3500, 3000, 1642),
(v_table_id, 3500, 3500, 1719),
(v_table_id, 3500, 4000, 1831),
(v_table_id, 3500, 4500, 1908),
(v_table_id, 3500, 5000, 1984),
(v_table_id, 4000, 2500, 1660),
(v_table_id, 4000, 3000, 1745),
(v_table_id, 4000, 3500, 1830),
(v_table_id, 4000, 4000, 1952),
(v_table_id, 4000, 4500, 2036),
(v_table_id, 4000, 5000, 2122),
(v_table_id, 4500, 2500, 1747),
(v_table_id, 4500, 3000, 1841),
(v_table_id, 4500, 3500, 1935),
(v_table_id, 4500, 4000, 2065),
(v_table_id, 4500, 4500, 2160),
(v_table_id, 4500, 5000, 2252),
(v_table_id, 5000, 2500, 1842),
(v_table_id, 5000, 3000, 1944),
(v_table_id, 5000, 3500, 2046),
(v_table_id, 5000, 4000, 2186),
(v_table_id, 5000, 4500, 2288),
(v_table_id, 5000, 5000, 2390),
(v_table_id, 5500, 2500, 1944),
(v_table_id, 5500, 3000, 2054),
(v_table_id, 5500, 3500, 2166),
(v_table_id, 5500, 4000, 2313),
(v_table_id, 5500, 4500, 2425),
(v_table_id, 5500, 5000, 2536),
(v_table_id, 6000, 2500, 2037),
(v_table_id, 6000, 3000, 2157),
(v_table_id, 6000, 3500, 2277),
(v_table_id, 6000, 4000, 2434),
(v_table_id, 6000, 4500, 2554),
(v_table_id, 6000, 5000, 2673),
(v_table_id, 6000, 2500, 2978),
(v_table_id, 6000, 3000, 3113),
(v_table_id, 6000, 3500, 3248),
(v_table_id, 6000, 4000, 3456),
(v_table_id, 6000, 4500, 3591),
(v_table_id, 6000, 5000, 3726),
(v_table_id, 7000, 2500, 3179),
(v_table_id, 7000, 3000, 3330),
(v_table_id, 7000, 3500, 3483),
(v_table_id, 7000, 4000, 3709),
(v_table_id, 7000, 4500, 3862),
(v_table_id, 7000, 5000, 4014),
(v_table_id, 8000, 2500, 3367),
(v_table_id, 8000, 3000, 3537),
(v_table_id, 8000, 3500, 3707),
(v_table_id, 8000, 4000, 3950),
(v_table_id, 8000, 4500, 4120),
(v_table_id, 8000, 5000, 4290),
(v_table_id, 9000, 2500, 3542),
(v_table_id, 9000, 3000, 3729),
(v_table_id, 9000, 3500, 3916),
(v_table_id, 9000, 4000, 4177),
(v_table_id, 9000, 4500, 4365),
(v_table_id, 9000, 5000, 4552),
(v_table_id, 10000, 2500, 3730),
(v_table_id, 10000, 3000, 3934),
(v_table_id, 10000, 3500, 4140),
(v_table_id, 10000, 4000, 4418),
(v_table_id, 10000, 4500, 4623),
(v_table_id, 10000, 5000, 4827),
(v_table_id, 11000, 2500, 3933),
(v_table_id, 11000, 3000, 4156),
(v_table_id, 11000, 3500, 4378),
(v_table_id, 11000, 4000, 4673),
(v_table_id, 11000, 4500, 4896),
(v_table_id, 11000, 5000, 5118),
(v_table_id, 12000, 2500, 4122),
(v_table_id, 12000, 3000, 4361),
(v_table_id, 12000, 3500, 4601),
(v_table_id, 12000, 4000, 4914),
(v_table_id, 12000, 4500, 5154),
(v_table_id, 12000, 5000, 5393)
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
        
(v_table_id, 3000, 0, 2),
(v_table_id, 3000, 2500, 1466),
(v_table_id, 3000, 3000, 1533),
(v_table_id, 3000, 3500, 1601),
(v_table_id, 3000, 4000, 1704),
(v_table_id, 3000, 4500, 1773),
(v_table_id, 3000, 5000, 1839),
(v_table_id, 3500, 0, 2),
(v_table_id, 3500, 2500, 1566),
(v_table_id, 3500, 3000, 1642),
(v_table_id, 3500, 3500, 1719),
(v_table_id, 3500, 4000, 1831),
(v_table_id, 3500, 4500, 1908),
(v_table_id, 3500, 5000, 1984),
(v_table_id, 4000, 0, 2),
(v_table_id, 4000, 2500, 1660),
(v_table_id, 4000, 3000, 1745),
(v_table_id, 4000, 3500, 1830),
(v_table_id, 4000, 4000, 1952),
(v_table_id, 4000, 4500, 2036),
(v_table_id, 4000, 5000, 2122),
(v_table_id, 4500, 0, 2),
(v_table_id, 4500, 2500, 1747),
(v_table_id, 4500, 3000, 1841),
(v_table_id, 4500, 3500, 1935),
(v_table_id, 4500, 4000, 2065),
(v_table_id, 4500, 4500, 2160),
(v_table_id, 4500, 5000, 2252),
(v_table_id, 5000, 0, 2),
(v_table_id, 5000, 2500, 1842),
(v_table_id, 5000, 3000, 1944),
(v_table_id, 5000, 3500, 2046),
(v_table_id, 5000, 4000, 2186),
(v_table_id, 5000, 4500, 2288),
(v_table_id, 5000, 5000, 2390),
(v_table_id, 5500, 0, 2),
(v_table_id, 5500, 2500, 1944),
(v_table_id, 5500, 3000, 2054),
(v_table_id, 5500, 3500, 2166),
(v_table_id, 5500, 4000, 2313),
(v_table_id, 5500, 4500, 2425),
(v_table_id, 5500, 5000, 2536),
(v_table_id, 6000, 0, 2),
(v_table_id, 6000, 2500, 2037),
(v_table_id, 6000, 3000, 2157),
(v_table_id, 6000, 3500, 2277),
(v_table_id, 6000, 4000, 2434),
(v_table_id, 6000, 4500, 2554),
(v_table_id, 6000, 5000, 2673),
(v_table_id, 6000, 0, 4),
(v_table_id, 6000, 2500, 2978),
(v_table_id, 6000, 3000, 3113),
(v_table_id, 6000, 3500, 3248),
(v_table_id, 6000, 4000, 3456),
(v_table_id, 6000, 4500, 3591),
(v_table_id, 6000, 5000, 3726),
(v_table_id, 7000, 0, 4),
(v_table_id, 7000, 2500, 3179),
(v_table_id, 7000, 3000, 3330),
(v_table_id, 7000, 3500, 3483),
(v_table_id, 7000, 4000, 3709),
(v_table_id, 7000, 4500, 3862),
(v_table_id, 7000, 5000, 4014),
(v_table_id, 8000, 0, 4),
(v_table_id, 8000, 2500, 3367),
(v_table_id, 8000, 3000, 3537),
(v_table_id, 8000, 3500, 3707),
(v_table_id, 8000, 4000, 3950),
(v_table_id, 8000, 4500, 4120),
(v_table_id, 8000, 5000, 4290),
(v_table_id, 9000, 0, 4),
(v_table_id, 9000, 2500, 3542),
(v_table_id, 9000, 3000, 3729),
(v_table_id, 9000, 3500, 3916),
(v_table_id, 9000, 4000, 4177),
(v_table_id, 9000, 4500, 4365),
(v_table_id, 9000, 5000, 4552),
(v_table_id, 10000, 0, 4),
(v_table_id, 10000, 2500, 3730),
(v_table_id, 10000, 3000, 3934),
(v_table_id, 10000, 3500, 4140),
(v_table_id, 10000, 4000, 4418),
(v_table_id, 10000, 4500, 4623),
(v_table_id, 10000, 5000, 4827),
(v_table_id, 11000, 0, 4),
(v_table_id, 11000, 2500, 3933),
(v_table_id, 11000, 3000, 4156),
(v_table_id, 11000, 3500, 4378),
(v_table_id, 11000, 4000, 4673),
(v_table_id, 11000, 4500, 4896),
(v_table_id, 11000, 5000, 5118),
(v_table_id, 12000, 0, 4),
(v_table_id, 12000, 2500, 4122),
(v_table_id, 12000, 3000, 4361),
(v_table_id, 12000, 3500, 4601),
(v_table_id, 12000, 4000, 4914),
(v_table_id, 12000, 4500, 5154),
(v_table_id, 12000, 5000, 5393)
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
        
(v_table_id, 1500, 1000, 656),
(v_table_id, 1500, 1250, 682),
(v_table_id, 1500, 1500, 708),
(v_table_id, 1500, 1750, 734),
(v_table_id, 1500, 2000, 760),
(v_table_id, 1500, 2250, 786),
(v_table_id, 1500, 2500, 812),
(v_table_id, 1500, 2750, 838),
(v_table_id, 1500, 3000, 864),
(v_table_id, 1750, 1000, 683),
(v_table_id, 1750, 1250, 711),
(v_table_id, 1750, 1500, 740),
(v_table_id, 1750, 1750, 768),
(v_table_id, 1750, 2000, 796),
(v_table_id, 1750, 2250, 824),
(v_table_id, 1750, 2500, 853),
(v_table_id, 1750, 2750, 881),
(v_table_id, 1750, 3000, 909),
(v_table_id, 2000, 1000, 705),
(v_table_id, 2000, 1250, 735),
(v_table_id, 2000, 1500, 766),
(v_table_id, 2000, 1750, 796),
(v_table_id, 2000, 2000, 827),
(v_table_id, 2000, 2250, 857),
(v_table_id, 2000, 2500, 888),
(v_table_id, 2000, 2750, 918),
(v_table_id, 2000, 3000, 949),
(v_table_id, 2250, 1000, 727),
(v_table_id, 2250, 1250, 760),
(v_table_id, 2250, 1500, 792),
(v_table_id, 2250, 1750, 825),
(v_table_id, 2250, 2000, 858),
(v_table_id, 2250, 2250, 890),
(v_table_id, 2250, 2500, 923),
(v_table_id, 2250, 2750, 955),
(v_table_id, 2250, 3000, 988),
(v_table_id, 2500, 1000, 749),
(v_table_id, 2500, 1250, 784),
(v_table_id, 2500, 1500, 819),
(v_table_id, 2500, 1750, 853),
(v_table_id, 2500, 2000, 888),
(v_table_id, 2500, 2250, 923),
(v_table_id, 2500, 2500, 958),
(v_table_id, 2500, 2750, 993),
(v_table_id, 2500, 3000, 1028),
(v_table_id, 2750, 1000, 774),
(v_table_id, 2750, 1250, 811),
(v_table_id, 2750, 1500, 848),
(v_table_id, 2750, 1750, 885),
(v_table_id, 2750, 2000, 922),
(v_table_id, 2750, 2250, 960),
(v_table_id, 2750, 2500, 997),
(v_table_id, 2750, 2750, 1034),
(v_table_id, 2750, 3000, 1071),
(v_table_id, 3000, 1000, 796),
(v_table_id, 3000, 1250, 835),
(v_table_id, 3000, 1500, 875),
(v_table_id, 3000, 1750, 914),
(v_table_id, 3000, 2000, 953),
(v_table_id, 3000, 2250, 992),
(v_table_id, 3000, 2500, 1032),
(v_table_id, 3000, 2750, 1071),
(v_table_id, 3000, 3000, 1110),
(v_table_id, 3250, 1000, 822),
(v_table_id, 3250, 1250, 863),
(v_table_id, 3250, 1500, 905),
(v_table_id, 3250, 1750, 946),
(v_table_id, 3250, 2000, 987),
(v_table_id, 3250, 2250, 1029),
(v_table_id, 3250, 2500, 1070),
(v_table_id, 3250, 2750, 1112),
(v_table_id, 3250, 3000, 1153),
(v_table_id, 3500, 1000, 844),
(v_table_id, 3500, 1250, 887),
(v_table_id, 3500, 1500, 931),
(v_table_id, 3500, 1750, 975),
(v_table_id, 3500, 2000, 1018),
(v_table_id, 3500, 2250, 1062),
(v_table_id, 3500, 2500, 1106),
(v_table_id, 3500, 2750, 1149),
(v_table_id, 3500, 3000, 1193),
(v_table_id, 3750, 1000, 866),
(v_table_id, 3750, 1250, 911),
(v_table_id, 3750, 1500, 957),
(v_table_id, 3750, 1750, 1003),
(v_table_id, 3750, 2000, 1049),
(v_table_id, 3750, 2250, 1095),
(v_table_id, 3750, 2500, 1141),
(v_table_id, 3750, 2750, 1187),
(v_table_id, 3750, 3000, 1232),
(v_table_id, 4000, 1000, 888),
(v_table_id, 4000, 1250, 936),
(v_table_id, 4000, 1500, 984),
(v_table_id, 4000, 1750, 1032),
(v_table_id, 4000, 2000, 1080),
(v_table_id, 4000, 2250, 1128),
(v_table_id, 4000, 2500, 1176),
(v_table_id, 4000, 2750, 1224),
(v_table_id, 4000, 3000, 1272),
(v_table_id, 4250, 1000, 913),
(v_table_id, 4250, 1250, 963),
(v_table_id, 4250, 1500, 1013),
(v_table_id, 4250, 1750, 1064),
(v_table_id, 4250, 2000, 1114),
(v_table_id, 4250, 2250, 1164),
(v_table_id, 4250, 2500, 1214),
(v_table_id, 4250, 2750, 1265),
(v_table_id, 4250, 3000, 1315),
(v_table_id, 4500, 1000, 935),
(v_table_id, 4500, 1250, 987),
(v_table_id, 4500, 1500, 1040),
(v_table_id, 4500, 1750, 1092),
(v_table_id, 4500, 2000, 1145),
(v_table_id, 4500, 2250, 1197),
(v_table_id, 4500, 2500, 1250),
(v_table_id, 4500, 2750, 1302),
(v_table_id, 4500, 3000, 1354),
(v_table_id, 4750, 1000, 960),
(v_table_id, 4750, 1250, 1015),
(v_table_id, 4750, 1500, 1070),
(v_table_id, 4750, 1750, 1124),
(v_table_id, 4750, 2000, 1179),
(v_table_id, 4750, 2250, 1234),
(v_table_id, 4750, 2500, 1288),
(v_table_id, 4750, 2750, 1343),
(v_table_id, 4750, 3000, 1398),
(v_table_id, 5000, 1000, 1005),
(v_table_id, 5000, 1250, 1062),
(v_table_id, 5000, 1500, 1118),
(v_table_id, 5000, 1750, 1175),
(v_table_id, 5000, 2000, 1232),
(v_table_id, 5000, 2250, 1289),
(v_table_id, 5000, 2500, 1346),
(v_table_id, 5000, 2750, 1403),
(v_table_id, 5000, 3000, 1459),
(v_table_id, 5250, 1000, 1031),
(v_table_id, 5250, 1250, 1090),
(v_table_id, 5250, 1500, 1149),
(v_table_id, 5250, 1750, 1208),
(v_table_id, 5250, 2000, 1267),
(v_table_id, 5250, 2250, 1326),
(v_table_id, 5250, 2500, 1385),
(v_table_id, 5250, 2750, 1444),
(v_table_id, 5250, 3000, 1503),
(v_table_id, 5500, 1000, 1054),
(v_table_id, 5500, 1250, 1115),
(v_table_id, 5500, 1500, 1177),
(v_table_id, 5500, 1750, 1238),
(v_table_id, 5500, 2000, 1299),
(v_table_id, 5500, 2250, 1360),
(v_table_id, 5500, 2500, 1422),
(v_table_id, 5500, 2750, 1483),
(v_table_id, 5500, 3000, 1544),
(v_table_id, 5750, 1000, 1077),
(v_table_id, 5750, 1250, 1141),
(v_table_id, 5750, 1500, 1204),
(v_table_id, 5750, 1750, 1267),
(v_table_id, 5750, 2000, 1331),
(v_table_id, 5750, 2250, 1394),
(v_table_id, 5750, 2500, 1458),
(v_table_id, 5750, 2750, 1521),
(v_table_id, 5750, 3000, 1585),
(v_table_id, 6000, 1000, 1100),
(v_table_id, 6000, 1250, 1166),
(v_table_id, 6000, 1500, 1231),
(v_table_id, 6000, 1750, 1297),
(v_table_id, 6000, 2000, 1363),
(v_table_id, 6000, 2250, 1428),
(v_table_id, 6000, 2500, 1494),
(v_table_id, 6000, 2750, 1559),
(v_table_id, 6000, 3000, 1625)
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
        
(v_table_id, 40004500, 3594.61746, 3840),
(v_table_id, 40004500, 529.92, 597),
(v_table_id, 40004500, 4124.53746, 4436),
(v_table_id, 40004500, 132.48000000000002, 150),
(v_table_id, 40004500, 508.4639999999998, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 2, 2),
(v_table_id, 40004500, 16, 18),
(v_table_id, 40005000, 3594.61746, 4084),
(v_table_id, 40005000, 529.92, 663),
(v_table_id, 40005000, 4124.53746, 4747),
(v_table_id, 40005000, 132.48000000000002, 166),
(v_table_id, 40005000, 508.4639999999998, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 2, 2),
(v_table_id, 40005000, 16, 20),
(v_table_id, 50003000, 3594.61746, 3583),
(v_table_id, 50003000, 529.92, 497),
(v_table_id, 50003000, 4124.53746, 4080),
(v_table_id, 50003000, 132.48000000000002, 125),
(v_table_id, 50003000, 508.4639999999998, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 2, 2),
(v_table_id, 50003000, 16, 15),
(v_table_id, 50003500, 3594.61746, 3866),
(v_table_id, 50003500, 529.92, 580),
(v_table_id, 50003500, 4124.53746, 4446),
(v_table_id, 50003500, 132.48000000000002, 145),
(v_table_id, 50003500, 508.4639999999998, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 2, 2),
(v_table_id, 50003500, 16, 18),
(v_table_id, 50004000, 3594.61746, 4150),
(v_table_id, 50004000, 529.92, 663),
(v_table_id, 50004000, 4124.53746, 4812),
(v_table_id, 50004000, 132.48000000000002, 166),
(v_table_id, 50004000, 508.4639999999998, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 2, 2),
(v_table_id, 50004000, 16, 20),
(v_table_id, 50004500, 3594.61746, 4433),
(v_table_id, 50004500, 529.92, 746),
(v_table_id, 50004500, 4124.53746, 5178),
(v_table_id, 50004500, 132.48000000000002, 187),
(v_table_id, 50004500, 508.4639999999998, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 2, 2),
(v_table_id, 50004500, 16, 23),
(v_table_id, 50005000, 3594.61746, 4716),
(v_table_id, 50005000, 529.92, 828),
(v_table_id, 50005000, 4124.53746, 5544),
(v_table_id, 50005000, 132.48000000000002, 208),
(v_table_id, 50005000, 508.4639999999998, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 2, 2),
(v_table_id, 50005000, 16, 25),
(v_table_id, 60003000, 3594.61746, 4060),
(v_table_id, 60003000, 529.92, 597),
(v_table_id, 60003000, 4124.53746, 4657),
(v_table_id, 60003000, 132.48000000000002, 150),
(v_table_id, 60003000, 508.4639999999998, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 2, 2),
(v_table_id, 60003000, 16, 18),
(v_table_id, 60003500, 3594.61746, 4382),
(v_table_id, 60003500, 529.92, 696),
(v_table_id, 60003500, 4124.53746, 5078),
(v_table_id, 60003500, 132.48000000000002, 174),
(v_table_id, 60003500, 508.4639999999998, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 2, 2),
(v_table_id, 60003500, 16, 21),
(v_table_id, 60004000, 3594.61746, 4704),
(v_table_id, 60004000, 529.92, 795),
(v_table_id, 60004000, 4124.53746, 5499),
(v_table_id, 60004000, 132.48000000000002, 199),
(v_table_id, 60004000, 508.4639999999998, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 2, 2),
(v_table_id, 60004000, 16, 24),
(v_table_id, 60004500, 3594.61746, 5026),
(v_table_id, 60004500, 529.92, 895),
(v_table_id, 60004500, 4124.53746, 5920),
(v_table_id, 60004500, 132.48000000000002, 224),
(v_table_id, 60004500, 508.4639999999998, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 2, 2),
(v_table_id, 60004500, 16, 27),
(v_table_id, 60005000, 3594.61746, 5347),
(v_table_id, 60005000, 529.92, 994),
(v_table_id, 60005000, 4124.53746, 6341),
(v_table_id, 60005000, 132.48000000000002, 249),
(v_table_id, 60005000, 508.4639999999998, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 2, 2),
(v_table_id, 60005000, 16, 30),
(v_table_id, 70003000, 3594.61746, 4538),
(v_table_id, 70003000, 529.92, 696),
(v_table_id, 70003000, 4124.53746, 5233),
(v_table_id, 70003000, 132.48000000000002, 174),
(v_table_id, 70003000, 508.4639999999998, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 2, 2),
(v_table_id, 70003000, 16, 21),
(v_table_id, 70003500, 3594.61746, 4898),
(v_table_id, 70003500, 529.92, 812),
(v_table_id, 70003500, 4124.53746, 5709),
(v_table_id, 70003500, 132.48000000000002, 203),
(v_table_id, 70003500, 508.4639999999998, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 2, 2),
(v_table_id, 70003500, 16, 25),
(v_table_id, 70004000, 3594.61746, 5479),
(v_table_id, 70004000, 529.92, 928),
(v_table_id, 70004000, 4124.53746, 6407),
(v_table_id, 70004000, 132.48000000000002, 232),
(v_table_id, 70004000, 508.4639999999998, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 2, 2),
(v_table_id, 70004000, 16, 28),
(v_table_id, 70004500, 3594.61746, 5840),
(v_table_id, 70004500, 529.92, 1044),
(v_table_id, 70004500, 4124.53746, 6883),
(v_table_id, 70004500, 132.48000000000002, 261),
(v_table_id, 70004500, 508.4639999999998, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 2, 2),
(v_table_id, 70004500, 16, 32),
(v_table_id, 70005000, 3594.61746, 6200),
(v_table_id, 70005000, 529.92, 1160),
(v_table_id, 70005000, 4124.53746, 7359),
(v_table_id, 70005000, 132.48000000000002, 290),
(v_table_id, 70005000, 508.4639999999998, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 2, 2),
(v_table_id, 70005000, 16, 35)
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
        
(v_table_id, 40004500, 3594.61746, 3840),
(v_table_id, 40004500, 529.92, 597),
(v_table_id, 40004500, 4124.53746, 4436),
(v_table_id, 40004500, 132.48000000000002, 150),
(v_table_id, 40004500, 508.4639999999998, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 2, 2),
(v_table_id, 40004500, 16, 18),
(v_table_id, 40005000, 3594.61746, 4084),
(v_table_id, 40005000, 529.92, 663),
(v_table_id, 40005000, 4124.53746, 4747),
(v_table_id, 40005000, 132.48000000000002, 166),
(v_table_id, 40005000, 508.4639999999998, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 2, 2),
(v_table_id, 40005000, 16, 20),
(v_table_id, 50003000, 3594.61746, 3583),
(v_table_id, 50003000, 529.92, 497),
(v_table_id, 50003000, 4124.53746, 4080),
(v_table_id, 50003000, 132.48000000000002, 125),
(v_table_id, 50003000, 508.4639999999998, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 2, 2),
(v_table_id, 50003000, 16, 15),
(v_table_id, 50003500, 3594.61746, 3866),
(v_table_id, 50003500, 529.92, 580),
(v_table_id, 50003500, 4124.53746, 4446),
(v_table_id, 50003500, 132.48000000000002, 145),
(v_table_id, 50003500, 508.4639999999998, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 2, 2),
(v_table_id, 50003500, 16, 18),
(v_table_id, 50004000, 3594.61746, 4150),
(v_table_id, 50004000, 529.92, 663),
(v_table_id, 50004000, 4124.53746, 4812),
(v_table_id, 50004000, 132.48000000000002, 166),
(v_table_id, 50004000, 508.4639999999998, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 2, 2),
(v_table_id, 50004000, 16, 20),
(v_table_id, 50004500, 3594.61746, 4433),
(v_table_id, 50004500, 529.92, 746),
(v_table_id, 50004500, 4124.53746, 5178),
(v_table_id, 50004500, 132.48000000000002, 187),
(v_table_id, 50004500, 508.4639999999998, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 2, 2),
(v_table_id, 50004500, 16, 23),
(v_table_id, 50005000, 3594.61746, 4716),
(v_table_id, 50005000, 529.92, 828),
(v_table_id, 50005000, 4124.53746, 5544),
(v_table_id, 50005000, 132.48000000000002, 208),
(v_table_id, 50005000, 508.4639999999998, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 2, 2),
(v_table_id, 50005000, 16, 25),
(v_table_id, 60003000, 3594.61746, 4060),
(v_table_id, 60003000, 529.92, 597),
(v_table_id, 60003000, 4124.53746, 4657),
(v_table_id, 60003000, 132.48000000000002, 150),
(v_table_id, 60003000, 508.4639999999998, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 2, 2),
(v_table_id, 60003000, 16, 18),
(v_table_id, 60003500, 3594.61746, 4382),
(v_table_id, 60003500, 529.92, 696),
(v_table_id, 60003500, 4124.53746, 5078),
(v_table_id, 60003500, 132.48000000000002, 174),
(v_table_id, 60003500, 508.4639999999998, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 2, 2),
(v_table_id, 60003500, 16, 21),
(v_table_id, 60004000, 3594.61746, 4704),
(v_table_id, 60004000, 529.92, 795),
(v_table_id, 60004000, 4124.53746, 5499),
(v_table_id, 60004000, 132.48000000000002, 199),
(v_table_id, 60004000, 508.4639999999998, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 2, 2),
(v_table_id, 60004000, 16, 24),
(v_table_id, 60004500, 3594.61746, 5026),
(v_table_id, 60004500, 529.92, 895),
(v_table_id, 60004500, 4124.53746, 5920),
(v_table_id, 60004500, 132.48000000000002, 224),
(v_table_id, 60004500, 508.4639999999998, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 2, 2),
(v_table_id, 60004500, 16, 27),
(v_table_id, 60005000, 3594.61746, 5347),
(v_table_id, 60005000, 529.92, 994),
(v_table_id, 60005000, 4124.53746, 6341),
(v_table_id, 60005000, 132.48000000000002, 249),
(v_table_id, 60005000, 508.4639999999998, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 2, 2),
(v_table_id, 60005000, 16, 30),
(v_table_id, 70003000, 3594.61746, 4538),
(v_table_id, 70003000, 529.92, 696),
(v_table_id, 70003000, 4124.53746, 5233),
(v_table_id, 70003000, 132.48000000000002, 174),
(v_table_id, 70003000, 508.4639999999998, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 2, 2),
(v_table_id, 70003000, 16, 21),
(v_table_id, 70003500, 3594.61746, 5119),
(v_table_id, 70003500, 529.92, 812),
(v_table_id, 70003500, 4124.53746, 5930),
(v_table_id, 70003500, 132.48000000000002, 203),
(v_table_id, 70003500, 508.4639999999998, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 2, 2),
(v_table_id, 70003500, 16, 25),
(v_table_id, 70004000, 3594.61746, 5479),
(v_table_id, 70004000, 529.92, 928),
(v_table_id, 70004000, 4124.53746, 6407),
(v_table_id, 70004000, 132.48000000000002, 232),
(v_table_id, 70004000, 508.4639999999998, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 2, 2),
(v_table_id, 70004000, 16, 28),
(v_table_id, 70004500, 3594.61746, 5840),
(v_table_id, 70004500, 529.92, 1044),
(v_table_id, 70004500, 4124.53746, 6883),
(v_table_id, 70004500, 132.48000000000002, 261),
(v_table_id, 70004500, 508.4639999999998, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 2, 2),
(v_table_id, 70004500, 16, 32),
(v_table_id, 70005000, 3594.61746, 6145),
(v_table_id, 70005000, 529.92, 1160),
(v_table_id, 70005000, 4124.53746, 7304),
(v_table_id, 70005000, 132.48000000000002, 290),
(v_table_id, 70005000, 508.4639999999998, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 2, 3),
(v_table_id, 70005000, 16, 35)
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
        
(v_table_id, 40004000, 3350.1037499999998, 3595),
(v_table_id, 40004000, 463.67999999999995, 530),
(v_table_id, 40004000, 3813.7837499999996, 4125),
(v_table_id, 40004000, 188.36999999999998, 216),
(v_table_id, 40004000, 444.90599999999984, 509),
(v_table_id, 40004000, 5, 5),
(v_table_id, 40004000, 2, 2),
(v_table_id, 40004000, 14, 16),
(v_table_id, 40004500, 3350.1037499999998, 3840),
(v_table_id, 40004500, 463.67999999999995, 597),
(v_table_id, 40004500, 3813.7837499999996, 4436),
(v_table_id, 40004500, 188.36999999999998, 243),
(v_table_id, 40004500, 444.90599999999984, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 2, 2),
(v_table_id, 40004500, 14, 18),
(v_table_id, 40005000, 3350.1037499999998, 4554),
(v_table_id, 40005000, 463.67999999999995, 663),
(v_table_id, 40005000, 3813.7837499999996, 5216),
(v_table_id, 40005000, 188.36999999999998, 270),
(v_table_id, 40005000, 444.90599999999984, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 2, 2),
(v_table_id, 40005000, 14, 20),
(v_table_id, 50003000, 3350.1037499999998, 3583),
(v_table_id, 50003000, 463.67999999999995, 497),
(v_table_id, 50003000, 3813.7837499999996, 4080),
(v_table_id, 50003000, 188.36999999999998, 202),
(v_table_id, 50003000, 444.90599999999984, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 2, 2),
(v_table_id, 50003000, 14, 15),
(v_table_id, 50003500, 3350.1037499999998, 3866),
(v_table_id, 50003500, 463.67999999999995, 580),
(v_table_id, 50003500, 3813.7837499999996, 4446),
(v_table_id, 50003500, 188.36999999999998, 236),
(v_table_id, 50003500, 444.90599999999984, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 2, 2),
(v_table_id, 50003500, 14, 18),
(v_table_id, 50004000, 3350.1037499999998, 4150),
(v_table_id, 50004000, 463.67999999999995, 663),
(v_table_id, 50004000, 3813.7837499999996, 4812),
(v_table_id, 50004000, 188.36999999999998, 270),
(v_table_id, 50004000, 444.90599999999984, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 2, 2),
(v_table_id, 50004000, 14, 20),
(v_table_id, 50004500, 3350.1037499999998, 4433),
(v_table_id, 50004500, 463.67999999999995, 746),
(v_table_id, 50004500, 3813.7837499999996, 5178),
(v_table_id, 50004500, 188.36999999999998, 303),
(v_table_id, 50004500, 444.90599999999984, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 2, 2),
(v_table_id, 50004500, 14, 23),
(v_table_id, 50005000, 3350.1037499999998, 5303),
(v_table_id, 50005000, 463.67999999999995, 828),
(v_table_id, 50005000, 3813.7837499999996, 6131),
(v_table_id, 50005000, 188.36999999999998, 337),
(v_table_id, 50005000, 444.90599999999984, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 2, 2),
(v_table_id, 50005000, 14, 25),
(v_table_id, 60003000, 3350.1037499999998, 4060),
(v_table_id, 60003000, 463.67999999999995, 597),
(v_table_id, 60003000, 3813.7837499999996, 4657),
(v_table_id, 60003000, 188.36999999999998, 243),
(v_table_id, 60003000, 444.90599999999984, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 2, 2),
(v_table_id, 60003000, 14, 18),
(v_table_id, 60003500, 3350.1037499999998, 4382),
(v_table_id, 60003500, 463.67999999999995, 696),
(v_table_id, 60003500, 3813.7837499999996, 5078),
(v_table_id, 60003500, 188.36999999999998, 283),
(v_table_id, 60003500, 444.90599999999984, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 2, 2),
(v_table_id, 60003500, 14, 21),
(v_table_id, 60004000, 3350.1037499999998, 4704),
(v_table_id, 60004000, 463.67999999999995, 795),
(v_table_id, 60004000, 3813.7837499999996, 5499),
(v_table_id, 60004000, 188.36999999999998, 323),
(v_table_id, 60004000, 444.90599999999984, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 2, 2),
(v_table_id, 60004000, 14, 24),
(v_table_id, 60004500, 3350.1037499999998, 5215),
(v_table_id, 60004500, 463.67999999999995, 895),
(v_table_id, 60004500, 3813.7837499999996, 6109),
(v_table_id, 60004500, 188.36999999999998, 364),
(v_table_id, 60004500, 444.90599999999984, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 2, 2),
(v_table_id, 60004500, 14, 27),
(v_table_id, 60005000, 3350.1037499999998, 6241),
(v_table_id, 60005000, 463.67999999999995, 994),
(v_table_id, 60005000, 3813.7837499999996, 7235),
(v_table_id, 60005000, 188.36999999999998, 404),
(v_table_id, 60005000, 444.90599999999984, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 2, 2),
(v_table_id, 60005000, 14, 30),
(v_table_id, 70003000, 3350.1037499999998, 4759),
(v_table_id, 70003000, 463.67999999999995, 696),
(v_table_id, 70003000, 3813.7837499999996, 5454),
(v_table_id, 70003000, 188.36999999999998, 283),
(v_table_id, 70003000, 444.90599999999984, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 2, 2),
(v_table_id, 70003000, 14, 21),
(v_table_id, 70003500, 3350.1037499999998, 5119),
(v_table_id, 70003500, 463.67999999999995, 812),
(v_table_id, 70003500, 3813.7837499999996, 5930),
(v_table_id, 70003500, 188.36999999999998, 330),
(v_table_id, 70003500, 444.90599999999984, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 2, 2),
(v_table_id, 70003500, 14, 25),
(v_table_id, 70004000, 3350.1037499999998, 5479),
(v_table_id, 70004000, 463.67999999999995, 928),
(v_table_id, 70004000, 3813.7837499999996, 6407),
(v_table_id, 70004000, 188.36999999999998, 377),
(v_table_id, 70004000, 444.90599999999984, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 2, 2),
(v_table_id, 70004000, 14, 28),
(v_table_id, 70004500, 3350.1037499999998, 5785),
(v_table_id, 70004500, 463.67999999999995, 1044),
(v_table_id, 70004500, 3813.7837499999996, 6828),
(v_table_id, 70004500, 188.36999999999998, 424),
(v_table_id, 70004500, 444.90599999999984, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 2, 3),
(v_table_id, 70004500, 14, 32),
(v_table_id, 70005000, 3350.1037499999998, 6967),
(v_table_id, 70005000, 463.67999999999995, 1160),
(v_table_id, 70005000, 3813.7837499999996, 8126),
(v_table_id, 70005000, 188.36999999999998, 471),
(v_table_id, 70005000, 444.90599999999984, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 2, 3),
(v_table_id, 70005000, 14, 35)
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
        
(v_table_id, 40004500, 4215.49002, 4461),
(v_table_id, 40004500, 529.92, 597),
(v_table_id, 40004500, 4745.41002, 5057),
(v_table_id, 40004500, 132.48000000000002, 150),
(v_table_id, 40004500, 508.4639999999998, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 4, 4),
(v_table_id, 40004500, 16, 18),
(v_table_id, 40005000, 4215.49002, 4705),
(v_table_id, 40005000, 529.92, 663),
(v_table_id, 40005000, 4745.41002, 5367),
(v_table_id, 40005000, 132.48000000000002, 166),
(v_table_id, 40005000, 508.4639999999998, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 4, 4),
(v_table_id, 40005000, 16, 20),
(v_table_id, 50003000, 4215.49002, 4257),
(v_table_id, 50003000, 529.92, 497),
(v_table_id, 50003000, 4745.41002, 4754),
(v_table_id, 50003000, 132.48000000000002, 125),
(v_table_id, 50003000, 508.4639999999998, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 4, 4),
(v_table_id, 50003000, 16, 15),
(v_table_id, 50003500, 4215.49002, 4540),
(v_table_id, 50003500, 529.92, 580),
(v_table_id, 50003500, 4745.41002, 5120),
(v_table_id, 50003500, 132.48000000000002, 145),
(v_table_id, 50003500, 508.4639999999998, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 4, 4),
(v_table_id, 50003500, 16, 18),
(v_table_id, 50004000, 4215.49002, 4823),
(v_table_id, 50004000, 529.92, 663),
(v_table_id, 50004000, 4745.41002, 5486),
(v_table_id, 50004000, 132.48000000000002, 166),
(v_table_id, 50004000, 508.4639999999998, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 4, 4),
(v_table_id, 50004000, 16, 20),
(v_table_id, 50004500, 4215.49002, 5106),
(v_table_id, 50004500, 529.92, 746),
(v_table_id, 50004500, 4745.41002, 5852),
(v_table_id, 50004500, 132.48000000000002, 187),
(v_table_id, 50004500, 508.4639999999998, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 4, 4),
(v_table_id, 50004500, 16, 23),
(v_table_id, 50005000, 4215.49002, 5389),
(v_table_id, 50005000, 529.92, 828),
(v_table_id, 50005000, 4745.41002, 6217),
(v_table_id, 50005000, 132.48000000000002, 208),
(v_table_id, 50005000, 508.4639999999998, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 4, 4),
(v_table_id, 50005000, 16, 25),
(v_table_id, 60003000, 4215.49002, 4787),
(v_table_id, 60003000, 529.92, 597),
(v_table_id, 60003000, 4745.41002, 5383),
(v_table_id, 60003000, 132.48000000000002, 150),
(v_table_id, 60003000, 508.4639999999998, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 4, 4),
(v_table_id, 60003000, 16, 18),
(v_table_id, 60003500, 4215.49002, 5109),
(v_table_id, 60003500, 529.92, 696),
(v_table_id, 60003500, 4745.41002, 5804),
(v_table_id, 60003500, 132.48000000000002, 174),
(v_table_id, 60003500, 508.4639999999998, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 4, 4),
(v_table_id, 60003500, 16, 21),
(v_table_id, 60004000, 4215.49002, 5430),
(v_table_id, 60004000, 529.92, 795),
(v_table_id, 60004000, 4745.41002, 6225),
(v_table_id, 60004000, 132.48000000000002, 199),
(v_table_id, 60004000, 508.4639999999998, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 4, 4),
(v_table_id, 60004000, 16, 24),
(v_table_id, 60004500, 4215.49002, 5752),
(v_table_id, 60004500, 529.92, 895),
(v_table_id, 60004500, 4745.41002, 6646),
(v_table_id, 60004500, 132.48000000000002, 224),
(v_table_id, 60004500, 508.4639999999998, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 4, 4),
(v_table_id, 60004500, 16, 27),
(v_table_id, 60005000, 4215.49002, 6074),
(v_table_id, 60005000, 529.92, 994),
(v_table_id, 60005000, 4745.41002, 7067),
(v_table_id, 60005000, 132.48000000000002, 249),
(v_table_id, 60005000, 508.4639999999998, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 4, 4),
(v_table_id, 60005000, 16, 30),
(v_table_id, 70003000, 4215.49002, 5317),
(v_table_id, 70003000, 529.92, 696),
(v_table_id, 70003000, 4745.41002, 6012),
(v_table_id, 70003000, 132.48000000000002, 174),
(v_table_id, 70003000, 508.4639999999998, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 4, 4),
(v_table_id, 70003000, 16, 21),
(v_table_id, 70003500, 4215.49002, 5677),
(v_table_id, 70003500, 529.92, 812),
(v_table_id, 70003500, 4745.41002, 6489),
(v_table_id, 70003500, 132.48000000000002, 203),
(v_table_id, 70003500, 508.4639999999998, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 4, 4),
(v_table_id, 70003500, 16, 25),
(v_table_id, 70004000, 4215.49002, 6480),
(v_table_id, 70004000, 529.92, 928),
(v_table_id, 70004000, 4745.41002, 7407),
(v_table_id, 70004000, 132.48000000000002, 232),
(v_table_id, 70004000, 508.4639999999998, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 4, 4),
(v_table_id, 70004000, 16, 28),
(v_table_id, 70004500, 4215.49002, 6840),
(v_table_id, 70004500, 529.92, 1044),
(v_table_id, 70004500, 4745.41002, 7883),
(v_table_id, 70004500, 132.48000000000002, 261),
(v_table_id, 70004500, 508.4639999999998, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 4, 4),
(v_table_id, 70004500, 16, 32),
(v_table_id, 70005000, 4215.49002, 7200),
(v_table_id, 70005000, 529.92, 1160),
(v_table_id, 70005000, 4745.41002, 8360),
(v_table_id, 70005000, 132.48000000000002, 290),
(v_table_id, 70005000, 508.4639999999998, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 4, 4),
(v_table_id, 70005000, 16, 35)
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
        
(v_table_id, 40004500, 4215.49002, 4461),
(v_table_id, 40004500, 529.92, 597),
(v_table_id, 40004500, 4745.41002, 5057),
(v_table_id, 40004500, 132.48000000000002, 150),
(v_table_id, 40004500, 508.4639999999998, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 4, 4),
(v_table_id, 40004500, 16, 18),
(v_table_id, 40005000, 4215.49002, 4705),
(v_table_id, 40005000, 529.92, 663),
(v_table_id, 40005000, 4745.41002, 5367),
(v_table_id, 40005000, 132.48000000000002, 166),
(v_table_id, 40005000, 508.4639999999998, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 4, 4),
(v_table_id, 40005000, 16, 20),
(v_table_id, 50003000, 4215.49002, 4257),
(v_table_id, 50003000, 529.92, 497),
(v_table_id, 50003000, 4745.41002, 4754),
(v_table_id, 50003000, 132.48000000000002, 125),
(v_table_id, 50003000, 508.4639999999998, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 4, 4),
(v_table_id, 50003000, 16, 15),
(v_table_id, 50003500, 4215.49002, 4540),
(v_table_id, 50003500, 529.92, 580),
(v_table_id, 50003500, 4745.41002, 5120),
(v_table_id, 50003500, 132.48000000000002, 145),
(v_table_id, 50003500, 508.4639999999998, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 4, 4),
(v_table_id, 50003500, 16, 18),
(v_table_id, 50004000, 4215.49002, 4823),
(v_table_id, 50004000, 529.92, 663),
(v_table_id, 50004000, 4745.41002, 5486),
(v_table_id, 50004000, 132.48000000000002, 166),
(v_table_id, 50004000, 508.4639999999998, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 4, 4),
(v_table_id, 50004000, 16, 20),
(v_table_id, 50004500, 4215.49002, 5106),
(v_table_id, 50004500, 529.92, 746),
(v_table_id, 50004500, 4745.41002, 5852),
(v_table_id, 50004500, 132.48000000000002, 187),
(v_table_id, 50004500, 508.4639999999998, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 4, 4),
(v_table_id, 50004500, 16, 23),
(v_table_id, 50005000, 4215.49002, 5389),
(v_table_id, 50005000, 529.92, 828),
(v_table_id, 50005000, 4745.41002, 6217),
(v_table_id, 50005000, 132.48000000000002, 208),
(v_table_id, 50005000, 508.4639999999998, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 4, 4),
(v_table_id, 50005000, 16, 25),
(v_table_id, 60003000, 4215.49002, 4787),
(v_table_id, 60003000, 529.92, 597),
(v_table_id, 60003000, 4745.41002, 5383),
(v_table_id, 60003000, 132.48000000000002, 150),
(v_table_id, 60003000, 508.4639999999998, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 4, 4),
(v_table_id, 60003000, 16, 18),
(v_table_id, 60003500, 4215.49002, 5109),
(v_table_id, 60003500, 529.92, 696),
(v_table_id, 60003500, 4745.41002, 5804),
(v_table_id, 60003500, 132.48000000000002, 174),
(v_table_id, 60003500, 508.4639999999998, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 4, 4),
(v_table_id, 60003500, 16, 21),
(v_table_id, 60004000, 4215.49002, 5430),
(v_table_id, 60004000, 529.92, 795),
(v_table_id, 60004000, 4745.41002, 6225),
(v_table_id, 60004000, 132.48000000000002, 199),
(v_table_id, 60004000, 508.4639999999998, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 4, 4),
(v_table_id, 60004000, 16, 24),
(v_table_id, 60004500, 4215.49002, 5752),
(v_table_id, 60004500, 529.92, 895),
(v_table_id, 60004500, 4745.41002, 6646),
(v_table_id, 60004500, 132.48000000000002, 224),
(v_table_id, 60004500, 508.4639999999998, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 4, 4),
(v_table_id, 60004500, 16, 27),
(v_table_id, 60005000, 4215.49002, 6074),
(v_table_id, 60005000, 529.92, 994),
(v_table_id, 60005000, 4745.41002, 7067),
(v_table_id, 60005000, 132.48000000000002, 249),
(v_table_id, 60005000, 508.4639999999998, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 4, 4),
(v_table_id, 60005000, 16, 30),
(v_table_id, 70003000, 4215.49002, 5317),
(v_table_id, 70003000, 529.92, 696),
(v_table_id, 70003000, 4745.41002, 6012),
(v_table_id, 70003000, 132.48000000000002, 174),
(v_table_id, 70003000, 508.4639999999998, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 4, 4),
(v_table_id, 70003000, 16, 21),
(v_table_id, 70003500, 4215.49002, 6119),
(v_table_id, 70003500, 529.92, 812),
(v_table_id, 70003500, 4745.41002, 6931),
(v_table_id, 70003500, 132.48000000000002, 203),
(v_table_id, 70003500, 508.4639999999998, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 4, 4),
(v_table_id, 70003500, 16, 25),
(v_table_id, 70004000, 4215.49002, 6480),
(v_table_id, 70004000, 529.92, 928),
(v_table_id, 70004000, 4745.41002, 7407),
(v_table_id, 70004000, 132.48000000000002, 232),
(v_table_id, 70004000, 508.4639999999998, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 4, 4),
(v_table_id, 70004000, 16, 28),
(v_table_id, 70004500, 4215.49002, 6840),
(v_table_id, 70004500, 529.92, 1044),
(v_table_id, 70004500, 4745.41002, 7883),
(v_table_id, 70004500, 132.48000000000002, 261),
(v_table_id, 70004500, 508.4639999999998, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 4, 4),
(v_table_id, 70004500, 16, 32),
(v_table_id, 70005000, 4215.49002, 7090),
(v_table_id, 70005000, 529.92, 1160),
(v_table_id, 70005000, 4745.41002, 8250),
(v_table_id, 70005000, 132.48000000000002, 290),
(v_table_id, 70005000, 508.4639999999998, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 4, 6),
(v_table_id, 70005000, 16, 35)
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
        
(v_table_id, 40004000, 3970.9763099999996, 4216),
(v_table_id, 40004000, 536.1299999999999, 613),
(v_table_id, 40004000, 4507.106309999999, 4829),
(v_table_id, 40004000, 115.92000000000002, 133),
(v_table_id, 40004000, 444.90599999999984, 509),
(v_table_id, 40004000, 5, 5),
(v_table_id, 40004000, 4, 4),
(v_table_id, 40004000, 14, 16),
(v_table_id, 40004500, 3970.9763099999996, 4461),
(v_table_id, 40004500, 536.1299999999999, 690),
(v_table_id, 40004500, 4507.106309999999, 5150),
(v_table_id, 40004500, 115.92000000000002, 150),
(v_table_id, 40004500, 444.90599999999984, 573),
(v_table_id, 40004500, 5, 5),
(v_table_id, 40004500, 4, 4),
(v_table_id, 40004500, 14, 18),
(v_table_id, 40005000, 3970.9763099999996, 5173),
(v_table_id, 40005000, 536.1299999999999, 766),
(v_table_id, 40005000, 4507.106309999999, 5939),
(v_table_id, 40005000, 115.92000000000002, 166),
(v_table_id, 40005000, 444.90599999999984, 636),
(v_table_id, 40005000, 5, 5),
(v_table_id, 40005000, 4, 4),
(v_table_id, 40005000, 14, 20),
(v_table_id, 50003000, 3970.9763099999996, 4257),
(v_table_id, 50003000, 536.1299999999999, 575),
(v_table_id, 50003000, 4507.106309999999, 4831),
(v_table_id, 50003000, 115.92000000000002, 125),
(v_table_id, 50003000, 444.90599999999984, 477),
(v_table_id, 50003000, 5, 6),
(v_table_id, 50003000, 4, 4),
(v_table_id, 50003000, 14, 15),
(v_table_id, 50003500, 3970.9763099999996, 4540),
(v_table_id, 50003500, 536.1299999999999, 671),
(v_table_id, 50003500, 4507.106309999999, 5210),
(v_table_id, 50003500, 115.92000000000002, 145),
(v_table_id, 50003500, 444.90599999999984, 557),
(v_table_id, 50003500, 5, 6),
(v_table_id, 50003500, 4, 4),
(v_table_id, 50003500, 14, 18),
(v_table_id, 50004000, 3970.9763099999996, 4823),
(v_table_id, 50004000, 536.1299999999999, 766),
(v_table_id, 50004000, 4507.106309999999, 5589),
(v_table_id, 50004000, 115.92000000000002, 166),
(v_table_id, 50004000, 444.90599999999984, 636),
(v_table_id, 50004000, 5, 6),
(v_table_id, 50004000, 4, 4),
(v_table_id, 50004000, 14, 20),
(v_table_id, 50004500, 3970.9763099999996, 5106),
(v_table_id, 50004500, 536.1299999999999, 862),
(v_table_id, 50004500, 4507.106309999999, 5968),
(v_table_id, 50004500, 115.92000000000002, 187),
(v_table_id, 50004500, 444.90599999999984, 716),
(v_table_id, 50004500, 5, 6),
(v_table_id, 50004500, 4, 4),
(v_table_id, 50004500, 14, 23),
(v_table_id, 50005000, 3970.9763099999996, 5974),
(v_table_id, 50005000, 536.1299999999999, 958),
(v_table_id, 50005000, 4507.106309999999, 6932),
(v_table_id, 50005000, 115.92000000000002, 208),
(v_table_id, 50005000, 444.90599999999984, 795),
(v_table_id, 50005000, 5, 6),
(v_table_id, 50005000, 4, 4),
(v_table_id, 50005000, 14, 25),
(v_table_id, 60003000, 3970.9763099999996, 4787),
(v_table_id, 60003000, 536.1299999999999, 690),
(v_table_id, 60003000, 4507.106309999999, 5476),
(v_table_id, 60003000, 115.92000000000002, 150),
(v_table_id, 60003000, 444.90599999999984, 573),
(v_table_id, 60003000, 5, 7),
(v_table_id, 60003000, 4, 4),
(v_table_id, 60003000, 14, 18),
(v_table_id, 60003500, 3970.9763099999996, 5109),
(v_table_id, 60003500, 536.1299999999999, 805),
(v_table_id, 60003500, 4507.106309999999, 5913),
(v_table_id, 60003500, 115.92000000000002, 174),
(v_table_id, 60003500, 444.90599999999984, 668),
(v_table_id, 60003500, 5, 7),
(v_table_id, 60003500, 4, 4),
(v_table_id, 60003500, 14, 21),
(v_table_id, 60004000, 3970.9763099999996, 5430),
(v_table_id, 60004000, 536.1299999999999, 920),
(v_table_id, 60004000, 4507.106309999999, 6349),
(v_table_id, 60004000, 115.92000000000002, 199),
(v_table_id, 60004000, 444.90599999999984, 763),
(v_table_id, 60004000, 5, 7),
(v_table_id, 60004000, 4, 4),
(v_table_id, 60004000, 14, 24),
(v_table_id, 60004500, 3970.9763099999996, 6131),
(v_table_id, 60004500, 536.1299999999999, 1034),
(v_table_id, 60004500, 4507.106309999999, 7165),
(v_table_id, 60004500, 115.92000000000002, 224),
(v_table_id, 60004500, 444.90599999999984, 859),
(v_table_id, 60004500, 5, 7),
(v_table_id, 60004500, 4, 4),
(v_table_id, 60004500, 14, 27),
(v_table_id, 60005000, 3970.9763099999996, 7155),
(v_table_id, 60005000, 536.1299999999999, 1149),
(v_table_id, 60005000, 4507.106309999999, 8304),
(v_table_id, 60005000, 115.92000000000002, 249),
(v_table_id, 60005000, 444.90599999999984, 954),
(v_table_id, 60005000, 5, 7),
(v_table_id, 60005000, 4, 4),
(v_table_id, 60005000, 14, 30),
(v_table_id, 70003000, 3970.9763099999996, 5759),
(v_table_id, 70003000, 536.1299999999999, 805),
(v_table_id, 70003000, 4507.106309999999, 6563),
(v_table_id, 70003000, 115.92000000000002, 174),
(v_table_id, 70003000, 444.90599999999984, 668),
(v_table_id, 70003000, 5, 8),
(v_table_id, 70003000, 4, 4),
(v_table_id, 70003000, 14, 21),
(v_table_id, 70003500, 3970.9763099999996, 6119),
(v_table_id, 70003500, 536.1299999999999, 939),
(v_table_id, 70003500, 4507.106309999999, 7058),
(v_table_id, 70003500, 115.92000000000002, 203),
(v_table_id, 70003500, 444.90599999999984, 779),
(v_table_id, 70003500, 5, 8),
(v_table_id, 70003500, 4, 4),
(v_table_id, 70003500, 14, 25),
(v_table_id, 70004000, 3970.9763099999996, 6480),
(v_table_id, 70004000, 536.1299999999999, 1073),
(v_table_id, 70004000, 4507.106309999999, 7552),
(v_table_id, 70004000, 115.92000000000002, 232),
(v_table_id, 70004000, 444.90599999999984, 890),
(v_table_id, 70004000, 5, 8),
(v_table_id, 70004000, 4, 4),
(v_table_id, 70004000, 14, 28),
(v_table_id, 70004500, 3970.9763099999996, 6730),
(v_table_id, 70004500, 536.1299999999999, 1207),
(v_table_id, 70004500, 4507.106309999999, 7936),
(v_table_id, 70004500, 115.92000000000002, 261),
(v_table_id, 70004500, 444.90599999999984, 1002),
(v_table_id, 70004500, 5, 8),
(v_table_id, 70004500, 4, 6),
(v_table_id, 70004500, 14, 32),
(v_table_id, 70005000, 3970.9763099999996, 7909),
(v_table_id, 70005000, 536.1299999999999, 1341),
(v_table_id, 70005000, 4507.106309999999, 9250),
(v_table_id, 70005000, 115.92000000000002, 290),
(v_table_id, 70005000, 444.90599999999984, 1113),
(v_table_id, 70005000, 5, 8),
(v_table_id, 70005000, 4, 6),
(v_table_id, 70005000, 14, 35)
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
        
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 16, 1),
(v_table_id, 40005000, 2322.423, 2515),
(v_table_id, 40005000, 2322.423, 2515),
(v_table_id, 40005000, 16, 1),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 16, 1),
(v_table_id, 50005000, 2322.423, 2750),
(v_table_id, 50005000, 2322.423, 2750),
(v_table_id, 50005000, 16, 1),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 16, 1),
(v_table_id, 60005000, 2322.423, 2978),
(v_table_id, 60005000, 2322.423, 2978),
(v_table_id, 60005000, 16, 1),
(v_table_id, 70003000, 2322.423, 2798),
(v_table_id, 70003000, 2322.423, 2798),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2322.423, 2894),
(v_table_id, 70003500, 2322.423, 2894),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2322.423, 2990),
(v_table_id, 70004000, 2322.423, 2990),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 16, 1),
(v_table_id, 70005000, 2322.423, 3403),
(v_table_id, 70005000, 2322.423, 3403),
(v_table_id, 70005000, 16, 1)
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
        
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 16, 1),
(v_table_id, 40005000, 2322.423, 2515),
(v_table_id, 40005000, 2322.423, 2515),
(v_table_id, 40005000, 16, 1),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 16, 1),
(v_table_id, 50005000, 2322.423, 2750),
(v_table_id, 50005000, 2322.423, 2750),
(v_table_id, 50005000, 16, 1),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 16, 1),
(v_table_id, 60005000, 2322.423, 2978),
(v_table_id, 60005000, 2322.423, 2978),
(v_table_id, 60005000, 16, 1),
(v_table_id, 70003000, 2322.423, 2798),
(v_table_id, 70003000, 2322.423, 2798),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2322.423, 2894),
(v_table_id, 70003500, 2322.423, 2894),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2322.423, 3211),
(v_table_id, 70004000, 2322.423, 3211),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 16, 1),
(v_table_id, 70005000, 2322.423, 3403),
(v_table_id, 70005000, 2322.423, 3403),
(v_table_id, 70005000, 16, 1)
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
        
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 2322.423, 2419),
(v_table_id, 40004500, 16, 1),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 2322.423, 2365),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 2322.423, 2461),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 2322.423, 2558),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 2322.423, 2654),
(v_table_id, 50004500, 16, 1),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 2322.423, 2593),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 2322.423, 2689),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 2322.423, 2785),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 2322.423, 2882),
(v_table_id, 60004500, 16, 1),
(v_table_id, 70003000, 2322.423, 3019),
(v_table_id, 70003000, 2322.423, 3019),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2322.423, 3115),
(v_table_id, 70003500, 2322.423, 3115),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2322.423, 3211),
(v_table_id, 70004000, 2322.423, 3211),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 2322.423, 3307),
(v_table_id, 70004500, 16, 1)
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
        
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 16, 1),
(v_table_id, 40005000, 2922.8489999999997, 3116),
(v_table_id, 40005000, 2922.8489999999997, 3116),
(v_table_id, 40005000, 16, 1),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 16, 1),
(v_table_id, 50005000, 2922.8489999999997, 3408),
(v_table_id, 50005000, 2922.8489999999997, 3408),
(v_table_id, 50005000, 16, 1),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 16, 1),
(v_table_id, 60005000, 2922.8489999999997, 3700),
(v_table_id, 60005000, 2922.8489999999997, 3700),
(v_table_id, 60005000, 16, 1),
(v_table_id, 70003000, 2922.8489999999997, 3578),
(v_table_id, 70003000, 2922.8489999999997, 3578),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2922.8489999999997, 3674),
(v_table_id, 70003500, 2922.8489999999997, 3674),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2922.8489999999997, 3770),
(v_table_id, 70004000, 2922.8489999999997, 3770),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 16, 1),
(v_table_id, 70005000, 2922.8489999999997, 4847),
(v_table_id, 70005000, 2922.8489999999997, 4847),
(v_table_id, 70005000, 16, 1)
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
        
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 16, 1),
(v_table_id, 40005000, 2922.8489999999997, 3116),
(v_table_id, 40005000, 2922.8489999999997, 3116),
(v_table_id, 40005000, 16, 1),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 16, 1),
(v_table_id, 50005000, 2922.8489999999997, 3408),
(v_table_id, 50005000, 2922.8489999999997, 3408),
(v_table_id, 50005000, 16, 1),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 16, 1),
(v_table_id, 60005000, 2922.8489999999997, 3700),
(v_table_id, 60005000, 2922.8489999999997, 3700),
(v_table_id, 60005000, 16, 1),
(v_table_id, 70003000, 2922.8489999999997, 3578),
(v_table_id, 70003000, 2922.8489999999997, 3578),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2922.8489999999997, 3674),
(v_table_id, 70003500, 2922.8489999999997, 3674),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2922.8489999999997, 4654),
(v_table_id, 70004000, 2922.8489999999997, 4654),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 16, 1),
(v_table_id, 70005000, 2922.8489999999997, 4847),
(v_table_id, 70005000, 2922.8489999999997, 4847),
(v_table_id, 70005000, 16, 1)
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
        
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 2922.8489999999997, 3019),
(v_table_id, 40004500, 16, 1),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 2922.8489999999997, 3023),
(v_table_id, 50003000, 16, 1),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 2922.8489999999997, 3120),
(v_table_id, 50003500, 16, 1),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 2922.8489999999997, 3216),
(v_table_id, 50004000, 16, 1),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 2922.8489999999997, 3312),
(v_table_id, 50004500, 16, 1),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 2922.8489999999997, 3316),
(v_table_id, 60003000, 16, 1),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 2922.8489999999997, 3412),
(v_table_id, 60003500, 16, 1),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 2922.8489999999997, 3508),
(v_table_id, 60004000, 16, 1),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 2922.8489999999997, 3604),
(v_table_id, 60004500, 16, 1),
(v_table_id, 70003000, 2922.8489999999997, 4462),
(v_table_id, 70003000, 2922.8489999999997, 4462),
(v_table_id, 70003000, 16, 1),
(v_table_id, 70003500, 2922.8489999999997, 4558),
(v_table_id, 70003500, 2922.8489999999997, 4558),
(v_table_id, 70003500, 16, 1),
(v_table_id, 70004000, 2922.8489999999997, 4654),
(v_table_id, 70004000, 2922.8489999999997, 4654),
(v_table_id, 70004000, 16, 1),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 2922.8489999999997, 4750),
(v_table_id, 70004500, 16, 1)
;
END $$;