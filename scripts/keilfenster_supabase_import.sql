
-- =================================================================
-- KEILFENSTER (WEDGE) REAL DATA IMPORT (Based on Image)
-- =================================================================


-- 1A. Base Table: Aluxe V2 - Wedge (Glass) [Glas 44.2]
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Wedge (Glass)', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass)');

DO $$
DECLARE
    tid uuid;
BEGIN
    SELECT id INTO tid FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass)';
    
    -- Clear existing entries for this table to avoid conflict errors
    DELETE FROM price_matrix_entries WHERE price_table_id = tid;

    -- Insert new values
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    SELECT tid, 0, v.proj, v.price 
    FROM (VALUES 
        (2000, 480.31),
        (2500, 525.79),
        (3000, 570.31),
        (3500, 614.84),
        (4000, 678.31),
        (4500, 720.95),
        (5000, 765.48)
    ) as v(proj, price);
END $$;

-- 1B. Surcharge Table: Aluxe V2 - Wedge (Glass) Surcharge Matt
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Wedge (Glass) Surcharge Matt', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass) Surcharge Matt');

DO $$
DECLARE
    tid uuid;
BEGIN
    SELECT id INTO tid FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass) Surcharge Matt';
    
    DELETE FROM price_matrix_entries WHERE price_table_id = tid;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    SELECT tid, 0, v.proj, v.price 
    FROM (VALUES 
        (2000, 3.73),
        (2500, 4.66),
        (3000, 5.59),
        (3500, 6.52),
        (4000, 7.45),
        (4500, 8.38),
        (5000, 9.32)
    ) as v(proj, price);
END $$;

-- 1C. Surcharge Table: Aluxe V2 - Wedge (Glass) Surcharge Iso
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT pd.id, 'Aluxe V2 - Wedge (Glass) Surcharge Iso', 'matrix', true, 'EUR'
FROM product_definitions pd WHERE pd.code = 'aluxe_v2_walls'
AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass) Surcharge Iso');

DO $$
DECLARE
    tid uuid;
BEGIN
    SELECT id INTO tid FROM price_tables WHERE name = 'Aluxe V2 - Wedge (Glass) Surcharge Iso';
    
    DELETE FROM price_matrix_entries WHERE price_table_id = tid;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    SELECT tid, 0, v.proj, v.price 
    FROM (VALUES 
        (2000, 37.20),
        (2500, 46.50),
        (3000, 55.80),
        (3500, 65.11),
        (4000, 74.41),
        (4500, 83.71),
        (5000, 93.01)
    ) as v(proj, price);
END $$;

