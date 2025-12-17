-- Migration to seed accessories for Keilfenster, Panorama Walls, and Aluminum Walls

-- 1. Keilfenster Options
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- We link Keilfenster options to 'Trendstyle' as a default parent for now, 
  -- or we could create a dummy 'Keilfenster' product if it existed. 
  -- But usually these are attached to main roofs. Let's pick 'Trendstyle' as generic holder or try to find 'keilfenster' product if defined.
  -- Assuming they are add-ons to structures.
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Keilfenster - Opcje (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "keilfenster"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 40.54, '{"name": "Profil Wyrównawczy U (55x29mm)", "description": "Ausgleichs U Profil für Fenster 55x29mm", "unit": "piece"}'),
        (v_table_id, 0, 0, 16.17, '{"name": "Zestaw Śrub", "description": "Schrauben-Set", "unit": "set"}'),
        (v_table_id, 0, 0, 596.13, '{"name": "Funkcja Uchylna (Kipp)", "description": "Kipp-Fenster Option", "unit": "piece"}'),
        (v_table_id, 3200, 0, 21.19, '{"name": "Osłona Keilfenster EL891", "description": "Abdeckung Keilfenster EL891 (3200mm)", "unit": "piece"}');
    END IF;
  END IF;
END $$;

-- 2. Panorama AL22 Accessories
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Panorama AL22 - Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "AL22"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Bottom Track
        (v_table_id, 0, 0, 10.88, '{"name": "Szyna Dolna (3-torowa)", "description": "Laufschiene unten (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 17.27, '{"name": "Szyna Dolna (5-torowa)", "description": "Laufschiene unten (5 tracks)", "unit": "m1"}'),
        -- Top Track
        (v_table_id, 0, 0, 28.46, '{"name": "Szyna Górna (3-torowa)", "description": "Laufschiene oben (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 41.03, '{"name": "Szyna Górna (5-torowa)", "description": "Laufschiene oben (5 tracks)", "unit": "m1"}'),
        -- Profiles
        (v_table_id, 0, 0, 11.26, '{"name": "Profil Boczny", "description": "Seitenprofil", "unit": "m1"}'),
        (v_table_id, 0, 0, 7.84, '{"name": "Profil Łączący (3-tor)", "description": "Koppelprofil (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 11.35, '{"name": "Profil Łączący (5-tor)", "description": "Koppelprofil (5 tracks)", "unit": "m1"}'),
        -- Handles & Locks
        (v_table_id, 0, 0, 73.64, '{"name": "Zamek Inox (Boczny)", "description": "Edelstahl Schloss (seitlich)", "unit": "piece"}'),
        (v_table_id, 0, 0, 98.19, '{"name": "Zamek Inox (Centralny)", "description": "Edelstahl Schloss (mittig)", "unit": "piece"}'),
        (v_table_id, 0, 0, 36.78, '{"name": "Gałka Drzwiowa Inox", "description": "Türknauf aus Edelstahl", "unit": "piece"}'),
        (v_table_id, 0, 0, 14.25, '{"name": "Klamka (Inox/Czarna)", "description": "Türgriff Edelstahl/Schwarz", "unit": "piece"}'),
        -- Glass
        (v_table_id, 0, 0, 105.09, '{"name": "Szkło Planibel Grey 10mm (m2)", "description": "Planibel Grey 10mm", "unit": "m2"}'),
        (v_table_id, 0, 0, 57.00, '{"name": "Szkło ESG Klar 10mm (m2)", "description": "ESG klar 10mm", "unit": "m2"}');
    END IF;
  END IF;
END $$;

-- 3. Panorama AL23 Accessories
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Panorama AL23 - Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "AL23"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Tracks
        (v_table_id, 0, 0, 24.47, '{"name": "Szyna Dolna (3-tor)", "description": "Laufschiene unten (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 30.55, '{"name": "Szyna Dolna (4-tor)", "description": "Laufschiene unten (4 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 36.62, '{"name": "Szyna Dolna (5-tor)", "description": "Laufschiene unten (5 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 43.95, '{"name": "Szyna Dolna (6-tor)", "description": "Laufschiene unten (6 tracks)", "unit": "m1"}'),
        -- Glass
        (v_table_id, 0, 0, 105.09, '{"name": "Szkło Planibel Grey 10mm (m2)", "description": "Planibel Grau 10mm", "unit": "m2"}'),
        (v_table_id, 0, 0, 57.00, '{"name": "Szkło ESG Klar 10mm (m2)", "description": "Klar 10mm", "unit": "m2"}');
         -- (Simplified list for AL23, can add more later if needed)
    END IF;
  END IF;
END $$;

-- 4. Aluminum Walls Options
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Ścianki Alu - Opcje (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "alu_walls"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 40.54, '{"name": "Profil Dolny / Rama U", "description": "Unteres Profil / Rahmen U-Profil", "unit": "piece"}'),
        (v_table_id, 0, 0, 16.17, '{"name": "Zestaw Śrub", "description": "Schrauben-Set", "unit": "set"}'),
        (v_table_id, 0, 0, 921.46, '{"name": "Funkcja DK (Dreh-Kipp)", "description": "Dreh-Kipp Funktion", "unit": "piece"}'),
        (v_table_id, 0, 0, 596.13, '{"name": "Funkcja DK Front (Mała)", "description": "Dreh-Kipp Funktion", "unit": "piece"}'),
        (v_table_id, 0, 0, 1232.62, '{"name": "Drzwi DK (Duże)", "description": "Dreh-Kipp Tür groß", "unit": "piece"}');
    END IF;
  END IF;
END $$;
