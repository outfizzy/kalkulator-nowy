-- Schiebetür Surcharge Tables: Matt and Isolierglas
-- Data from AluxePreisliste.xlsx -> SchiebetürR sheet
-- Surcharges are ADDITIVE to base price (Aluxe V2 - Sliding Door)

BEGIN;

-- ================================================
-- 1. Surcharge Matt (VSG matt over VSG klar)
-- ================================================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sliding Door Surcharge Matt';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sliding Door Surcharge Matt', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Sliding Door","type":"surcharge","surcharge_type":"matt","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 2000, 0, 19.38),
        (v_table_id, 2500, 0, 24.22),
        (v_table_id, 3000, 0, 29.06),
        (v_table_id, 3500, 0, 33.91),
        (v_table_id, 4000, 0, 38.75),
        (v_table_id, 4500, 0, 43.59),
        (v_table_id, 5000, 0, 48.44),
        (v_table_id, 5500, 0, 53.28),
        (v_table_id, 6000, 0, 58.13);
END $$;

-- ================================================
-- 2. Surcharge Isolierglas (over VSG klar)
-- ================================================
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sliding Door Surcharge Iso';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sliding Door Surcharge Iso', 'matrix', true, 'EUR',
        '{"provider":"Aluxe","model_family":"Sliding Door","type":"surcharge","surcharge_type":"iso","structure_type":"linear"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 2000, 0, 193.46),
        (v_table_id, 2500, 0, 241.82),
        (v_table_id, 3000, 0, 290.19),
        (v_table_id, 3500, 0, 338.55),
        (v_table_id, 4000, 0, 386.91),
        (v_table_id, 4500, 0, 435.28),
        (v_table_id, 5000, 0, 483.64),
        (v_table_id, 5500, 0, 532.01),
        (v_table_id, 6000, 0, 580.37);
END $$;

COMMIT;
