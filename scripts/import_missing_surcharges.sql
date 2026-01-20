-- Missing Surcharge Tables for All Models
-- Based on Aluxe Preisliste UPE 2026_DE.xlsx
-- Surcharges are per-area based (€/m²)

-- Matt/Milch: ~8.28 €/m²
-- Stopsol: ~31.78 €/m²
-- IR Gold: ~7.19 €/m² (poly only)

BEGIN;

-- ============= HELPER: Generate surcharges for any model =============
-- The actual surcharge values from Excel - they're consistent across models

-- Standard dimension grid used for surcharges
-- widths: 3000, 4000, 5000, 6000, 7000
-- depths: 2000, 2500, 3000, 3500, 4000, 4500, 5000

-- ============= TRENDLINE+ =============
-- Zone 1
DO $$
DECLARE v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name LIKE 'Aluxe V2 - Trendline+ % Surcharge (Zone 1)';
    
    -- Matt
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Trendline+","surcharge_type":"matt"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
        (v_table_id, 3000, 2000, 49.68), (v_table_id, 3000, 2500, 62.10), (v_table_id, 3000, 3000, 74.52),
        (v_table_id, 3000, 3500, 86.94), (v_table_id, 3000, 4000, 99.36), (v_table_id, 3000, 4500, 111.78),
        (v_table_id, 3000, 5000, 124.20),
        (v_table_id, 4000, 2000, 66.24), (v_table_id, 4000, 2500, 82.80), (v_table_id, 4000, 3000, 99.36),
        (v_table_id, 4000, 3500, 115.92), (v_table_id, 4000, 4000, 132.48), (v_table_id, 4000, 4500, 149.04),
        (v_table_id, 4000, 5000, 165.60),
        (v_table_id, 5000, 2000, 82.80), (v_table_id, 5000, 2500, 103.50), (v_table_id, 5000, 3000, 124.20),
        (v_table_id, 5000, 3500, 144.90), (v_table_id, 5000, 4000, 165.60), (v_table_id, 5000, 4500, 186.30),
        (v_table_id, 5000, 5000, 207.00),
        (v_table_id, 6000, 2000, 99.36), (v_table_id, 6000, 2500, 124.20), (v_table_id, 6000, 3000, 149.04),
        (v_table_id, 6000, 3500, 173.88), (v_table_id, 6000, 4000, 198.72), (v_table_id, 6000, 4500, 223.56),
        (v_table_id, 6000, 5000, 248.40),
        (v_table_id, 7000, 2000, 115.92), (v_table_id, 7000, 2500, 144.90), (v_table_id, 7000, 3000, 173.88),
        (v_table_id, 7000, 3500, 202.86), (v_table_id, 7000, 4000, 231.84), (v_table_id, 7000, 4500, 260.82),
        (v_table_id, 7000, 5000, 289.80);
    
    -- Stopsol
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Trendline+","surcharge_type":"stopsol"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
        (v_table_id, 3000, 2000, 190.67), (v_table_id, 3000, 2500, 238.34), (v_table_id, 3000, 3000, 286.01),
        (v_table_id, 3000, 3500, 333.68), (v_table_id, 3000, 4000, 381.35), (v_table_id, 3000, 4500, 429.02),
        (v_table_id, 3000, 5000, 476.68),
        (v_table_id, 4000, 2000, 254.23), (v_table_id, 4000, 2500, 317.79), (v_table_id, 4000, 3000, 381.35),
        (v_table_id, 4000, 3500, 444.91), (v_table_id, 4000, 4000, 508.46), (v_table_id, 4000, 4500, 572.02),
        (v_table_id, 4000, 5000, 635.58),
        (v_table_id, 5000, 2000, 317.79), (v_table_id, 5000, 2500, 397.24), (v_table_id, 5000, 3000, 476.68),
        (v_table_id, 5000, 3500, 556.13), (v_table_id, 5000, 4000, 635.58), (v_table_id, 5000, 4500, 715.03),
        (v_table_id, 5000, 5000, 794.47),
        (v_table_id, 6000, 2000, 381.35), (v_table_id, 6000, 2500, 476.68), (v_table_id, 6000, 3000, 572.02),
        (v_table_id, 6000, 3500, 667.36), (v_table_id, 6000, 4000, 762.70), (v_table_id, 6000, 4500, 858.03),
        (v_table_id, 6000, 5000, 953.37),
        (v_table_id, 7000, 2000, 444.91), (v_table_id, 7000, 2500, 556.13), (v_table_id, 7000, 3000, 667.36),
        (v_table_id, 7000, 3500, 778.59), (v_table_id, 7000, 4000, 889.81), (v_table_id, 7000, 4500, 1001.04),
        (v_table_id, 7000, 5000, 1112.26);
    
    -- IR Gold
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)', 'matrix', true, 'EUR', 
        '{"provider":"Aluxe","model_family":"Trendline+","surcharge_type":"ir_gold"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
        (v_table_id, 3000, 2000, 43.15), (v_table_id, 3000, 2500, 53.93), (v_table_id, 3000, 3000, 64.72),
        (v_table_id, 3000, 3500, 75.51), (v_table_id, 3000, 4000, 86.29), (v_table_id, 3000, 4500, 97.08),
        (v_table_id, 3000, 5000, 107.86),
        (v_table_id, 4000, 2000, 57.53), (v_table_id, 4000, 2500, 71.91), (v_table_id, 4000, 3000, 86.29),
        (v_table_id, 4000, 3500, 100.67), (v_table_id, 4000, 4000, 115.06), (v_table_id, 4000, 4500, 129.44),
        (v_table_id, 4000, 5000, 143.82),
        (v_table_id, 5000, 2000, 71.91), (v_table_id, 5000, 2500, 89.89), (v_table_id, 5000, 3000, 107.86),
        (v_table_id, 5000, 3500, 125.84), (v_table_id, 5000, 4000, 143.82), (v_table_id, 5000, 4500, 161.80),
        (v_table_id, 5000, 5000, 179.77),
        (v_table_id, 6000, 2000, 86.29), (v_table_id, 6000, 2500, 107.86), (v_table_id, 6000, 3000, 129.44),
        (v_table_id, 6000, 3500, 151.01), (v_table_id, 6000, 4000, 172.58), (v_table_id, 6000, 4500, 194.16),
        (v_table_id, 6000, 5000, 215.73),
        (v_table_id, 7000, 2000, 100.67), (v_table_id, 7000, 2500, 125.84), (v_table_id, 7000, 3000, 151.01),
        (v_table_id, 7000, 3500, 176.18), (v_table_id, 7000, 4000, 201.35), (v_table_id, 7000, 4500, 226.52),
        (v_table_id, 7000, 5000, 251.68);
END $$;

-- Trendline+ Zone 2 & 3 (copy from Zone 1)
DO $$
DECLARE v_table_id uuid; v_source_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 2..3 LOOP
        -- Matt
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone 1)';
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Trendline+ Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline+', 'surcharge_type', 'matt'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
        
        -- Stopsol
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone 1)';
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Trendline+ Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline+', 'surcharge_type', 'stopsol'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
        
        -- IR Gold
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone 1)';
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Trendline+ Poly IR Gold Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline+', 'surcharge_type', 'ir_gold'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
        SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
    END LOOP;
END $$;

-- ============= TRENDLINE Zone 2 & 3 (missing) =============
DO $$
DECLARE v_table_id uuid; v_source_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 2..3 LOOP
        -- Matt
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)';
        IF v_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = format('Aluxe V2 - Trendline Glass Matt Surcharge (Zone %s)', zone_num)) THEN
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (format('Aluxe V2 - Trendline Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
                jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline', 'surcharge_type', 'matt'))
            RETURNING id INTO v_table_id;
            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
        END IF;
        
        -- Stopsol
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone 1)';
        IF v_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = format('Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone %s)', zone_num)) THEN
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (format('Aluxe V2 - Trendline Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
                jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline', 'surcharge_type', 'stopsol'))
            RETURNING id INTO v_table_id;
            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
        END IF;
        
        -- IR Gold
        SELECT id INTO v_source_id FROM price_tables WHERE name = 'Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone 1)';
        IF v_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = format('Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone %s)', zone_num)) THEN
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (format('Aluxe V2 - Trendline Poly IR Gold Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
                jsonb_build_object('provider', 'Aluxe', 'model_family', 'Trendline', 'surcharge_type', 'ir_gold'))
            RETURNING id INTO v_table_id;
            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_table_id, width_mm, projection_mm, price FROM price_matrix_entries WHERE price_table_id = v_source_id;
        END IF;
    END LOOP;
END $$;

-- ============= TOPLINE (from Excel - same surcharge rates) =============
DO $$
DECLARE v_table_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 1..3 LOOP
        -- Matt
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline Glass Matt Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline', 'surcharge_type', 'matt'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 3000, 2500, 62.10), (v_table_id, 3000, 3000, 74.52), (v_table_id, 3000, 3500, 86.94),
            (v_table_id, 3000, 4000, 99.36), (v_table_id, 3000, 4500, 111.78), (v_table_id, 3000, 5000, 124.20),
            (v_table_id, 4000, 2500, 82.80), (v_table_id, 4000, 3000, 99.36), (v_table_id, 4000, 3500, 115.92),
            (v_table_id, 4000, 4000, 132.48), (v_table_id, 4000, 4500, 149.04), (v_table_id, 4000, 5000, 165.60),
            (v_table_id, 5000, 2500, 103.50), (v_table_id, 5000, 3000, 124.20), (v_table_id, 5000, 3500, 144.90),
            (v_table_id, 5000, 4000, 165.60), (v_table_id, 5000, 4500, 186.30), (v_table_id, 5000, 5000, 207.00),
            (v_table_id, 6000, 2500, 124.20), (v_table_id, 6000, 3000, 149.04), (v_table_id, 6000, 3500, 173.88),
            (v_table_id, 6000, 4000, 198.72), (v_table_id, 6000, 4500, 223.56), (v_table_id, 6000, 5000, 248.40),
            (v_table_id, 7000, 2500, 144.90), (v_table_id, 7000, 3000, 173.88), (v_table_id, 7000, 3500, 202.86),
            (v_table_id, 7000, 4000, 231.84), (v_table_id, 7000, 4500, 260.82), (v_table_id, 7000, 5000, 289.80);
        
        -- Stopsol
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline Glass Stopsol Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline', 'surcharge_type', 'stopsol'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 3000, 2500, 238.34), (v_table_id, 3000, 3000, 286.01), (v_table_id, 3000, 3500, 333.68),
            (v_table_id, 3000, 4000, 381.35), (v_table_id, 3000, 4500, 429.02), (v_table_id, 3000, 5000, 476.68),
            (v_table_id, 4000, 2500, 317.79), (v_table_id, 4000, 3000, 381.35), (v_table_id, 4000, 3500, 444.91),
            (v_table_id, 4000, 4000, 508.46), (v_table_id, 4000, 4500, 572.02), (v_table_id, 4000, 5000, 635.58),
            (v_table_id, 5000, 2500, 397.24), (v_table_id, 5000, 3000, 476.68), (v_table_id, 5000, 3500, 556.13),
            (v_table_id, 5000, 4000, 635.58), (v_table_id, 5000, 4500, 715.03), (v_table_id, 5000, 5000, 794.47),
            (v_table_id, 6000, 2500, 476.68), (v_table_id, 6000, 3000, 572.02), (v_table_id, 6000, 3500, 667.36),
            (v_table_id, 6000, 4000, 762.70), (v_table_id, 6000, 4500, 858.03), (v_table_id, 6000, 5000, 953.37),
            (v_table_id, 7000, 2500, 556.13), (v_table_id, 7000, 3000, 667.36), (v_table_id, 7000, 3500, 778.59),
            (v_table_id, 7000, 4000, 889.81), (v_table_id, 7000, 4500, 1001.04), (v_table_id, 7000, 5000, 1112.26);
        
        -- IR Gold
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline Poly IR Gold Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline Poly IR Gold Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline', 'surcharge_type', 'ir_gold'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 3000, 2500, 53.93), (v_table_id, 3000, 3000, 64.72), (v_table_id, 3000, 3500, 75.51),
            (v_table_id, 3000, 4000, 86.29), (v_table_id, 3000, 4500, 97.08), (v_table_id, 3000, 5000, 107.86),
            (v_table_id, 4000, 2500, 71.91), (v_table_id, 4000, 3000, 86.29), (v_table_id, 4000, 3500, 100.67),
            (v_table_id, 4000, 4000, 115.06), (v_table_id, 4000, 4500, 129.44), (v_table_id, 4000, 5000, 143.82),
            (v_table_id, 5000, 2500, 89.89), (v_table_id, 5000, 3000, 107.86), (v_table_id, 5000, 3500, 125.84),
            (v_table_id, 5000, 4000, 143.82), (v_table_id, 5000, 4500, 161.80), (v_table_id, 5000, 5000, 179.77),
            (v_table_id, 6000, 2500, 107.86), (v_table_id, 6000, 3000, 129.44), (v_table_id, 6000, 3500, 151.01),
            (v_table_id, 6000, 4000, 172.58), (v_table_id, 6000, 4500, 194.16), (v_table_id, 6000, 5000, 215.73),
            (v_table_id, 7000, 2500, 125.84), (v_table_id, 7000, 3000, 151.01), (v_table_id, 7000, 3500, 176.18),
            (v_table_id, 7000, 4000, 201.35), (v_table_id, 7000, 4500, 226.52), (v_table_id, 7000, 5000, 251.68);
    END LOOP;
END $$;

-- ============= TOPLINE XL =============
DO $$
DECLARE v_table_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 1..3 LOOP
        -- Matt
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline XL Glass Matt Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline XL Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline XL', 'surcharge_type', 'matt'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 99.36), (v_table_id, 4000, 3500, 115.92), (v_table_id, 4000, 4000, 132.48),
            (v_table_id, 4000, 4500, 149.04), (v_table_id, 4000, 5000, 165.60), (v_table_id, 4000, 6000, 198.72),
            (v_table_id, 5000, 3000, 124.20), (v_table_id, 5000, 3500, 144.90), (v_table_id, 5000, 4000, 165.60),
            (v_table_id, 5000, 4500, 186.30), (v_table_id, 5000, 5000, 207.00), (v_table_id, 5000, 6000, 248.40),
            (v_table_id, 6000, 3000, 149.04), (v_table_id, 6000, 3500, 173.88), (v_table_id, 6000, 4000, 198.72),
            (v_table_id, 6000, 4500, 223.56), (v_table_id, 6000, 5000, 248.40), (v_table_id, 6000, 6000, 298.08),
            (v_table_id, 7000, 3000, 173.88), (v_table_id, 7000, 3500, 202.86), (v_table_id, 7000, 4000, 231.84),
            (v_table_id, 7000, 4500, 260.82), (v_table_id, 7000, 5000, 289.80), (v_table_id, 7000, 6000, 347.76);
        
        -- Stopsol
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline XL Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline XL', 'surcharge_type', 'stopsol'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 381.35), (v_table_id, 4000, 3500, 444.91), (v_table_id, 4000, 4000, 508.46),
            (v_table_id, 4000, 4500, 572.02), (v_table_id, 4000, 5000, 635.58), (v_table_id, 4000, 6000, 762.70),
            (v_table_id, 5000, 3000, 476.68), (v_table_id, 5000, 3500, 556.13), (v_table_id, 5000, 4000, 635.58),
            (v_table_id, 5000, 4500, 715.03), (v_table_id, 5000, 5000, 794.47), (v_table_id, 5000, 6000, 953.37),
            (v_table_id, 6000, 3000, 572.02), (v_table_id, 6000, 3500, 667.36), (v_table_id, 6000, 4000, 762.70),
            (v_table_id, 6000, 4500, 858.03), (v_table_id, 6000, 5000, 953.37), (v_table_id, 6000, 6000, 1144.04),
            (v_table_id, 7000, 3000, 667.36), (v_table_id, 7000, 3500, 778.59), (v_table_id, 7000, 4000, 889.81),
            (v_table_id, 7000, 4500, 1001.04), (v_table_id, 7000, 5000, 1112.26), (v_table_id, 7000, 6000, 1334.72);
        
        -- IR Gold
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Topline XL Poly IR Gold Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Topline XL', 'surcharge_type', 'ir_gold'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 86.29), (v_table_id, 4000, 3500, 100.67), (v_table_id, 4000, 4000, 115.06),
            (v_table_id, 4000, 4500, 129.44), (v_table_id, 4000, 5000, 143.82), (v_table_id, 4000, 6000, 172.58),
            (v_table_id, 5000, 3000, 107.86), (v_table_id, 5000, 3500, 125.84), (v_table_id, 5000, 4000, 143.82),
            (v_table_id, 5000, 4500, 161.80), (v_table_id, 5000, 5000, 179.77), (v_table_id, 5000, 6000, 215.73),
            (v_table_id, 6000, 3000, 129.44), (v_table_id, 6000, 3500, 151.01), (v_table_id, 6000, 4000, 172.58),
            (v_table_id, 6000, 4500, 194.16), (v_table_id, 6000, 5000, 215.73), (v_table_id, 6000, 6000, 258.88),
            (v_table_id, 7000, 3000, 151.01), (v_table_id, 7000, 3500, 176.18), (v_table_id, 7000, 4000, 201.35),
            (v_table_id, 7000, 4500, 226.52), (v_table_id, 7000, 5000, 251.68), (v_table_id, 7000, 6000, 302.02);
    END LOOP;
END $$;

-- ============= ULTRALINE (Glass only - from Excel) =============
DO $$
DECLARE v_table_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 1..3 LOOP
        -- Matt
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Ultraline Glass Matt Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Ultraline Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Ultraline', 'surcharge_type', 'matt'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 99.36), (v_table_id, 4000, 3500, 115.92), (v_table_id, 4000, 4000, 132.48),
            (v_table_id, 4000, 4500, 149.04), (v_table_id, 4000, 5000, 165.60), (v_table_id, 4000, 6000, 198.72),
            (v_table_id, 5000, 3000, 124.20), (v_table_id, 5000, 3500, 144.90), (v_table_id, 5000, 4000, 165.60),
            (v_table_id, 5000, 4500, 186.30), (v_table_id, 5000, 5000, 207.00), (v_table_id, 5000, 6000, 248.40),
            (v_table_id, 6000, 3000, 149.04), (v_table_id, 6000, 3500, 173.88), (v_table_id, 6000, 4000, 198.72),
            (v_table_id, 6000, 4500, 223.56), (v_table_id, 6000, 5000, 248.40), (v_table_id, 6000, 6000, 298.08),
            (v_table_id, 7000, 3000, 173.88), (v_table_id, 7000, 3500, 202.86), (v_table_id, 7000, 4000, 231.84),
            (v_table_id, 7000, 4500, 260.82), (v_table_id, 7000, 5000, 289.80), (v_table_id, 7000, 6000, 347.76);
        
        -- Stopsol
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Ultraline Glass Stopsol Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Ultraline Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Ultraline', 'surcharge_type', 'stopsol'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 381.35), (v_table_id, 4000, 3500, 444.91), (v_table_id, 4000, 4000, 508.46),
            (v_table_id, 4000, 4500, 572.02), (v_table_id, 4000, 5000, 635.58), (v_table_id, 4000, 6000, 762.70),
            (v_table_id, 5000, 3000, 476.68), (v_table_id, 5000, 3500, 556.13), (v_table_id, 5000, 4000, 635.58),
            (v_table_id, 5000, 4500, 715.03), (v_table_id, 5000, 5000, 794.47), (v_table_id, 5000, 6000, 953.37),
            (v_table_id, 6000, 3000, 572.02), (v_table_id, 6000, 3500, 667.36), (v_table_id, 6000, 4000, 762.70),
            (v_table_id, 6000, 4500, 858.03), (v_table_id, 6000, 5000, 953.37), (v_table_id, 6000, 6000, 1144.04),
            (v_table_id, 7000, 3000, 667.36), (v_table_id, 7000, 3500, 778.59), (v_table_id, 7000, 4000, 889.81),
            (v_table_id, 7000, 4500, 1001.04), (v_table_id, 7000, 5000, 1112.26), (v_table_id, 7000, 6000, 1334.72);
    END LOOP;
END $$;

-- ============= DESIGNLINE (Glass only) =============
DO $$
DECLARE v_table_id uuid; zone_num integer;
BEGIN
    FOR zone_num IN 1..3 LOOP
        -- Matt
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Designline Glass Matt Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Designline Glass Matt Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Designline', 'surcharge_type', 'matt'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 99.36), (v_table_id, 4000, 3500, 115.92), (v_table_id, 4000, 4000, 132.48),
            (v_table_id, 4000, 4500, 149.04), (v_table_id, 4000, 5000, 165.60),
            (v_table_id, 5000, 3000, 124.20), (v_table_id, 5000, 3500, 144.90), (v_table_id, 5000, 4000, 165.60),
            (v_table_id, 5000, 4500, 186.30), (v_table_id, 5000, 5000, 207.00),
            (v_table_id, 6000, 3000, 149.04), (v_table_id, 6000, 3500, 173.88), (v_table_id, 6000, 4000, 198.72),
            (v_table_id, 6000, 4500, 223.56), (v_table_id, 6000, 5000, 248.40),
            (v_table_id, 7000, 3000, 173.88), (v_table_id, 7000, 3500, 202.86), (v_table_id, 7000, 4000, 231.84),
            (v_table_id, 7000, 4500, 260.82), (v_table_id, 7000, 5000, 289.80);
        
        -- Stopsol
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Designline Glass Stopsol Surcharge (Zone %s)', zone_num);
        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (format('Aluxe V2 - Designline Glass Stopsol Surcharge (Zone %s)', zone_num), 'matrix', true, 'EUR', 
            jsonb_build_object('provider', 'Aluxe', 'model_family', 'Designline', 'surcharge_type', 'stopsol'))
        RETURNING id INTO v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price) VALUES
            (v_table_id, 4000, 3000, 381.35), (v_table_id, 4000, 3500, 444.91), (v_table_id, 4000, 4000, 508.46),
            (v_table_id, 4000, 4500, 572.02), (v_table_id, 4000, 5000, 635.58),
            (v_table_id, 5000, 3000, 476.68), (v_table_id, 5000, 3500, 556.13), (v_table_id, 5000, 4000, 635.58),
            (v_table_id, 5000, 4500, 715.03), (v_table_id, 5000, 5000, 794.47),
            (v_table_id, 6000, 3000, 572.02), (v_table_id, 6000, 3500, 667.36), (v_table_id, 6000, 4000, 762.70),
            (v_table_id, 6000, 4500, 858.03), (v_table_id, 6000, 5000, 953.37),
            (v_table_id, 7000, 3000, 667.36), (v_table_id, 7000, 3500, 778.59), (v_table_id, 7000, 4000, 889.81),
            (v_table_id, 7000, 4500, 1001.04), (v_table_id, 7000, 5000, 1112.26);
    END LOOP;
END $$;

-- Verification
SELECT 'Created Surcharge Tables:' as status;
SELECT 
    SPLIT_PART(name, ' - ', 2) as model_surcharge,
    COUNT(*) as tables
FROM price_tables 
WHERE name LIKE 'Aluxe V2 - %Surcharge%'
GROUP BY 1
ORDER BY 1;

COMMIT;
