-- Migration to seed standard accessories from hardcoded files to DB

-- 1. Create Component List for Orangestyle
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Find Orangestyle Product ID
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'orangestyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    -- Check if table exists, if not create
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Standardowe Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list"}'::jsonb)
    ON CONFLICT DO NOTHING -- If unique constraint exists (unlikely on name)
    RETURNING id INTO v_table_id;

    -- If we didn't get an ID (already exists?), try to fetch it
    IF v_table_id IS NULL THEN
        SELECT id INTO v_table_id FROM price_tables WHERE product_definition_id = v_product_id AND name = 'Standardowe Akcesoria (Szablon)' LIMIT 1;
    END IF;

    -- Insert Entries
    IF v_table_id IS NOT NULL THEN
        -- Clear existing entries for this table to avoid duplicates on re-run
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Rinne (Gutters)
        (v_table_id, 3000, 0, 83.49, '{"name": "Rynna (Rinne) 3000mm", "description": "Rinne Orangestyle 3000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 4000, 0, 111.31, '{"name": "Rynna (Rinne) 4000mm", "description": "Rinne Orangestyle 4000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 5000, 0, 139.15, '{"name": "Rynna (Rinne) 5000mm", "description": "Rinne Orangestyle 5000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 6000, 0, 166.97, '{"name": "Rynna (Rinne) 6000mm", "description": "Rinne Orangestyle 6000 mm", "unit": "piece", "system": "Orangestyle"}'),
        
        -- Wandanschluss (Wall Connection)
        (v_table_id, 3000, 0, 59.28, '{"name": "Profil Ścienny 3000mm", "description": "Wandanschluss 3000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 4000, 0, 79.04, '{"name": "Profil Ścienny 4000mm", "description": "Wandanschluss 4000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 5000, 0, 98.80, '{"name": "Profil Ścienny 5000mm", "description": "Wandanschluss 5000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 6000, 0, 118.56, '{"name": "Profil Ścienny 6000mm", "description": "Wandanschluss 6000 mm", "unit": "piece", "system": "Orangestyle"}'),

        -- Posts
        (v_table_id, 2400, 0, 58.37, '{"name": "Słup (Pfosten) 2400mm", "description": "Pfosten 2400 mm", "unit": "piece"}'),
        (v_table_id, 3000, 0, 72.96, '{"name": "Słup (Pfosten) 3000mm", "description": "Pfosten 3000 mm", "unit": "piece"}'),
        (v_table_id, 6000, 0, 145.92, '{"name": "Słup (Pfosten) 6000mm", "description": "Pfosten 6000 mm", "unit": "piece"}'),

        -- Rafters (Sparren)
        (v_table_id, 2400, 0, 63.82, '{"name": "Krokiew (Sparren) 2400mm", "description": "Sparren 80x55x2400 mm", "unit": "piece"}'),
        (v_table_id, 2900, 0, 77.12, '{"name": "Krokiew (Sparren) 2900mm", "description": "Sparren 80x55x2900 mm", "unit": "piece"}'),
        (v_table_id, 3400, 0, 90.41, '{"name": "Krokiew (Sparren) 3400mm", "description": "Sparren 80x55x3400 mm", "unit": "piece"}'),
        (v_table_id, 3900, 0, 103.71, '{"name": "Krokiew (Sparren) 3900mm", "description": "Sparren 80x55x3900 mm", "unit": "piece"}'),
        (v_table_id, 3900, 0, 139.63, '{"name": "Krokiew XL 3900mm", "description": "XL Sparren 100x55x3900 mm", "unit": "piece"}'),
        (v_table_id, 4900, 0, 175.44, '{"name": "Krokiew XL 4900mm", "description": "XL Sparren 100x55x4900 mm", "unit": "piece"}'),

        -- Other Accessories
        (v_table_id, 0, 0, 6.52, '{"name": "Zatyczki Rynny (Set)", "description": "Abdeckkappe Rinne Set", "unit": "set"}'),
        (v_table_id, 0, 0, 3.95, '{"name": "Zatyczki Ścienne (Set)", "description": "Abdeckkappe Wandanschluss Set", "unit": "set"}'),
        (v_table_id, 1000, 0, 4.31, '{"name": "Uszczelka Ścienna (mb)", "description": "Dichtung Wandanschluss", "unit": "meter"}'),
        (v_table_id, 1000, 0, 0.76, '{"name": "Uszczelka Poli (mb)", "description": "Dichtung Polycarbonat", "unit": "meter"}'),
        (v_table_id, 1000, 0, 2.44, '{"name": "Uszczelka Szkło (mb)", "description": "Dichtung Glas", "unit": "meter"}');
    END IF;
  END IF;
END $$;

-- 2. Create Component List for Trendstyle
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Find Product ID
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Standardowe Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NULL THEN
        SELECT id INTO v_table_id FROM price_tables WHERE product_definition_id = v_product_id AND name = 'Standardowe Akcesoria (Szablon)' LIMIT 1;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Posts
        (v_table_id, 2400, 0, 58.37, '{"name": "Słup 110x110 2400mm", "description": "Pfosten Trendline 110x110x2400 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 3000, 0, 72.96, '{"name": "Słup 110x110 3000mm", "description": "Pfosten Trendline 110x110x3000 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 6000, 0, 145.92, '{"name": "Słup 110x110 6000mm", "description": "Pfosten Trendline 110x110x6000 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 3900, 0, 139.63, '{"name": "Słup 100x55 3900mm", "description": "Pfosten Trendline 100x55x3900 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 4900, 0, 175.44, '{"name": "Słup 100x55 4900mm", "description": "Pfosten Trendline 100x55x4900 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        
        -- Covers (Abdeckleiste)
        (v_table_id, 2500, 0, 18.30, '{"name": "Maskownica 2500mm", "description": "Abdeckleiste 2500 mm", "unit": "Stk."}'),
        (v_table_id, 3000, 0, 21.95, '{"name": "Maskownica 3000mm", "description": "Abdeckleiste 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 29.28, '{"name": "Maskownica 4000mm", "description": "Abdeckleiste 4000 mm", "unit": "Stk."}'),
        (v_table_id, 7000, 0, 51.23, '{"name": "Maskownica 7000mm", "description": "Abdeckleiste 7000 mm", "unit": "Stk."}'),
        
        -- Gutters (Rinne)
        (v_table_id, 3000, 0, 198.90, '{"name": "Rynna 3000mm", "description": "Rinne Trendline 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 265.20, '{"name": "Rynna 4000mm", "description": "Rinne Trendline 4000 mm", "unit": "Stk."}'),
        (v_table_id, 5000, 0, 331.51, '{"name": "Rynna 5000mm", "description": "Rinne Trendline 5000 mm", "unit": "Stk."}'),
        (v_table_id, 6000, 0, 397.81, '{"name": "Rynna 6000mm", "description": "Rinne Trendline 6000 mm", "unit": "Stk."}'),
        (v_table_id, 7000, 0, 464.11, '{"name": "Rynna 7000mm", "description": "Rinne Trendline 7000 mm", "unit": "Stk."}'),
        
        -- Profile (Zierleiste Klassik)
        (v_table_id, 3000, 0, 48.03, '{"name": "Listwa Ozdobna 3000mm", "description": "Zierleiste Klassik 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 64.04, '{"name": "Listwa Ozdobna 4000mm", "description": "Zierleiste Klassik 4000 mm", "unit": "Stk."}');

    END IF;
  END IF;
END $$;
-- Migration to seed standard accessories from hardcoded files to DB

-- 1. Create Component List for Orangestyle
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Find Orangestyle Product ID
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'orangestyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    -- Check if table exists, if not create
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Standardowe Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list"}'::jsonb)
    ON CONFLICT DO NOTHING -- If unique constraint exists (unlikely on name)
    RETURNING id INTO v_table_id;

    -- If we didn't get an ID (already exists?), try to fetch it
    IF v_table_id IS NULL THEN
        SELECT id INTO v_table_id FROM price_tables WHERE product_definition_id = v_product_id AND name = 'Standardowe Akcesoria (Szablon)' LIMIT 1;
    END IF;

    -- Insert Entries
    IF v_table_id IS NOT NULL THEN
        -- Clear existing entries for this table to avoid duplicates on re-run
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Rinne (Gutters)
        (v_table_id, 3000, 0, 83.49, '{"name": "Rynna (Rinne) 3000mm", "description": "Rinne Orangestyle 3000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 4000, 0, 111.31, '{"name": "Rynna (Rinne) 4000mm", "description": "Rinne Orangestyle 4000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 5000, 0, 139.15, '{"name": "Rynna (Rinne) 5000mm", "description": "Rinne Orangestyle 5000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 6000, 0, 166.97, '{"name": "Rynna (Rinne) 6000mm", "description": "Rinne Orangestyle 6000 mm", "unit": "piece", "system": "Orangestyle"}'),
        
        -- Wandanschluss (Wall Connection)
        (v_table_id, 3000, 0, 59.28, '{"name": "Profil Ścienny 3000mm", "description": "Wandanschluss 3000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 4000, 0, 79.04, '{"name": "Profil Ścienny 4000mm", "description": "Wandanschluss 4000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 5000, 0, 98.80, '{"name": "Profil Ścienny 5000mm", "description": "Wandanschluss 5000 mm", "unit": "piece", "system": "Orangestyle"}'),
        (v_table_id, 6000, 0, 118.56, '{"name": "Profil Ścienny 6000mm", "description": "Wandanschluss 6000 mm", "unit": "piece", "system": "Orangestyle"}'),

        -- Posts
        (v_table_id, 2400, 0, 58.37, '{"name": "Słup (Pfosten) 2400mm", "description": "Pfosten 2400 mm", "unit": "piece"}'),
        (v_table_id, 3000, 0, 72.96, '{"name": "Słup (Pfosten) 3000mm", "description": "Pfosten 3000 mm", "unit": "piece"}'),
        (v_table_id, 6000, 0, 145.92, '{"name": "Słup (Pfosten) 6000mm", "description": "Pfosten 6000 mm", "unit": "piece"}'),

        -- Rafters (Sparren)
        (v_table_id, 2400, 0, 63.82, '{"name": "Krokiew (Sparren) 2400mm", "description": "Sparren 80x55x2400 mm", "unit": "piece"}'),
        (v_table_id, 2900, 0, 77.12, '{"name": "Krokiew (Sparren) 2900mm", "description": "Sparren 80x55x2900 mm", "unit": "piece"}'),
        (v_table_id, 3400, 0, 90.41, '{"name": "Krokiew (Sparren) 3400mm", "description": "Sparren 80x55x3400 mm", "unit": "piece"}'),
        (v_table_id, 3900, 0, 103.71, '{"name": "Krokiew (Sparren) 3900mm", "description": "Sparren 80x55x3900 mm", "unit": "piece"}'),
        (v_table_id, 3900, 0, 139.63, '{"name": "Krokiew XL 3900mm", "description": "XL Sparren 100x55x3900 mm", "unit": "piece"}'),
        (v_table_id, 4900, 0, 175.44, '{"name": "Krokiew XL 4900mm", "description": "XL Sparren 100x55x4900 mm", "unit": "piece"}'),

        -- Other Accessories
        (v_table_id, 0, 0, 6.52, '{"name": "Zatyczki Rynny (Set)", "description": "Abdeckkappe Rinne Set", "unit": "set"}'),
        (v_table_id, 0, 0, 3.95, '{"name": "Zatyczki Ścienne (Set)", "description": "Abdeckkappe Wandanschluss Set", "unit": "set"}'),
        (v_table_id, 1000, 0, 4.31, '{"name": "Uszczelka Ścienna (mb)", "description": "Dichtung Wandanschluss", "unit": "meter"}'),
        (v_table_id, 1000, 0, 0.76, '{"name": "Uszczelka Poli (mb)", "description": "Dichtung Polycarbonat", "unit": "meter"}'),
        (v_table_id, 1000, 0, 2.44, '{"name": "Uszczelka Szkło (mb)", "description": "Dichtung Glas", "unit": "meter"}');
    END IF;
  END IF;
END $$;

-- 2. Create Component List for Trendstyle
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Find Product ID
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Standardowe Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NULL THEN
        SELECT id INTO v_table_id FROM price_tables WHERE product_definition_id = v_product_id AND name = 'Standardowe Akcesoria (Szablon)' LIMIT 1;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;

        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Posts
        (v_table_id, 2400, 0, 58.37, '{"name": "Słup 110x110 2400mm", "description": "Pfosten Trendline 110x110x2400 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 3000, 0, 72.96, '{"name": "Słup 110x110 3000mm", "description": "Pfosten Trendline 110x110x3000 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 6000, 0, 145.92, '{"name": "Słup 110x110 6000mm", "description": "Pfosten Trendline 110x110x6000 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 3900, 0, 139.63, '{"name": "Słup 100x55 3900mm", "description": "Pfosten Trendline 100x55x3900 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        (v_table_id, 4900, 0, 175.44, '{"name": "Słup 100x55 4900mm", "description": "Pfosten Trendline 100x55x4900 mm", "unit": "Stk.", "system": "Trendstyle"}'),
        
        -- Covers (Abdeckleiste)
        (v_table_id, 2500, 0, 18.30, '{"name": "Maskownica 2500mm", "description": "Abdeckleiste 2500 mm", "unit": "Stk."}'),
        (v_table_id, 3000, 0, 21.95, '{"name": "Maskownica 3000mm", "description": "Abdeckleiste 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 29.28, '{"name": "Maskownica 4000mm", "description": "Abdeckleiste 4000 mm", "unit": "Stk."}'),
        (v_table_id, 7000, 0, 51.23, '{"name": "Maskownica 7000mm", "description": "Abdeckleiste 7000 mm", "unit": "Stk."}'),
        
        -- Gutters (Rinne)
        (v_table_id, 3000, 0, 198.90, '{"name": "Rynna 3000mm", "description": "Rinne Trendline 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 265.20, '{"name": "Rynna 4000mm", "description": "Rinne Trendline 4000 mm", "unit": "Stk."}'),
        (v_table_id, 5000, 0, 331.51, '{"name": "Rynna 5000mm", "description": "Rinne Trendline 5000 mm", "unit": "Stk."}'),
        (v_table_id, 6000, 0, 397.81, '{"name": "Rynna 6000mm", "description": "Rinne Trendline 6000 mm", "unit": "Stk."}'),
        (v_table_id, 7000, 0, 464.11, '{"name": "Rynna 7000mm", "description": "Rinne Trendline 7000 mm", "unit": "Stk."}'),
        
        -- Profile (Zierleiste Klassik)
        (v_table_id, 3000, 0, 48.03, '{"name": "Listwa Ozdobna 3000mm", "description": "Zierleiste Klassik 3000 mm", "unit": "Stk."}'),
        (v_table_id, 4000, 0, 64.04, '{"name": "Listwa Ozdobna 4000mm", "description": "Zierleiste Klassik 4000 mm", "unit": "Stk."}');

    END IF;
  END IF;
END $$;
