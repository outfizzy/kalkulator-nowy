-- Migration to seed accessories for Keilfenster, Panorama Walls, and Aluminum Walls

-- 1. Create/Ensure "Systemy Ścian" Product exists
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Insert or Get Product "Systemy Ścian i Zabudowy"
  INSERT INTO product_definitions (name, code, category, provider, description)
  VALUES ('Systemy Ścian i Zabudowy', 'system_scian', 'sliding_wall', 'Inny', 'Wirtualny produkt grupujący opcje ścian i zabudów')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
  
    -- 1. Keilfenster
    -- Try to find existing table first (even if linked to Trendstyle/wrong product)
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Keilfenster - Opcje (Szablon)' LIMIT 1;
    
    IF v_table_id IS NOT NULL THEN
        -- Link to new product
        UPDATE price_tables SET product_definition_id = v_product_id WHERE id = v_table_id;
    ELSE
        -- Create new
        INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
        VALUES ('Keilfenster - Opcje (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "keilfenster"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 40.54, '{"name": "Profil Wyrównawczy U (55x29mm)", "description": "Ausgleichs U Profil für Fenster 55x29mm", "unit": "piece"}'),
        (v_table_id, 0, 0, 16.17, '{"name": "Zestaw Śrub", "description": "Schrauben-Set", "unit": "set"}'),
        (v_table_id, 0, 0, 596.13, '{"name": "Funkcja Uchylna (Kipp)", "description": "Kipp-Fenster Option", "unit": "piece"}'),
        (v_table_id, 3200, 0, 21.19, '{"name": "Osłona Keilfenster EL891", "description": "Abdeckung Keilfenster EL891 (3200mm)", "unit": "piece"}');
    END IF;

    -- 2. Panorama AL22
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Panorama AL22 - Akcesoria (Szablon)' LIMIT 1;
    
    IF v_table_id IS NOT NULL THEN
        UPDATE price_tables SET product_definition_id = v_product_id WHERE id = v_table_id;
    ELSE
        INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
        VALUES ('Panorama AL22 - Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "AL22"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 10.88, '{"name": "Szyna Dolna (3-torowa)", "description": "Laufschiene unten (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 17.27, '{"name": "Szyna Dolna (5-torowa)", "description": "Laufschiene unten (5 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 28.46, '{"name": "Szyna Górna (3-torowa)", "description": "Laufschiene oben (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 41.03, '{"name": "Szyna Górna (5-torowa)", "description": "Laufschiene oben (5 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 11.26, '{"name": "Profil Boczny", "description": "Seitenprofil", "unit": "m1"}'),
        (v_table_id, 0, 0, 7.84, '{"name": "Profil Łączący (3-tor)", "description": "Koppelprofil (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 11.35, '{"name": "Profil Łączący (5-tor)", "description": "Koppelprofil (5 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 73.64, '{"name": "Zamek Inox (Boczny)", "description": "Edelstahl Schloss (seitlich)", "unit": "piece"}'),
        (v_table_id, 0, 0, 98.19, '{"name": "Zamek Inox (Centralny)", "description": "Edelstahl Schloss (mittig)", "unit": "piece"}'),
        (v_table_id, 0, 0, 36.78, '{"name": "Gałka Drzwiowa Inox", "description": "Türknauf aus Edelstahl", "unit": "piece"}'),
        (v_table_id, 0, 0, 14.25, '{"name": "Klamka (Inox/Czarna)", "description": "Türgriff Edelstahl/Schwarz", "unit": "piece"}'),
        (v_table_id, 0, 0, 105.09, '{"name": "Szkło Planibel Grey 10mm (m2)", "description": "Planibel Grey 10mm", "unit": "m2"}'),
        (v_table_id, 0, 0, 57.00, '{"name": "Szkło ESG Klar 10mm (m2)", "description": "ESG klar 10mm", "unit": "m2"}');
    END IF;

    -- 3. Panorama AL23
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Panorama AL23 - Akcesoria (Szablon)' LIMIT 1;

    IF v_table_id IS NOT NULL THEN
        UPDATE price_tables SET product_definition_id = v_product_id WHERE id = v_table_id;
    ELSE
        INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
        VALUES ('Panorama AL23 - Akcesoria (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "AL23"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 24.47, '{"name": "Szyna Dolna (3-tor)", "description": "Laufschiene unten (3 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 30.55, '{"name": "Szyna Dolna (4-tor)", "description": "Laufschiene unten (4 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 36.62, '{"name": "Szyna Dolna (5-tor)", "description": "Laufschiene unten (5 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 43.95, '{"name": "Szyna Dolna (6-tor)", "description": "Laufschiene unten (6 tracks)", "unit": "m1"}'),
        (v_table_id, 0, 0, 105.09, '{"name": "Szkło Planibel Grey 10mm (m2)", "description": "Planibel Grau 10mm", "unit": "m2"}'),
        (v_table_id, 0, 0, 57.00, '{"name": "Szkło ESG Klar 10mm (m2)", "description": "Klar 10mm", "unit": "m2"}');
    END IF;

    -- 4. Aluminum Walls
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Ścianki Alu - Opcje (Szablon)' LIMIT 1;
    
    IF v_table_id IS NOT NULL THEN
        UPDATE price_tables SET product_definition_id = v_product_id WHERE id = v_table_id;
    ELSE
        INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
        VALUES ('Ścianki Alu - Opcje (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "alu_walls"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 40.54, '{"name": "Profil Dolny / Rama U", "description": "Unteres Profil / Rahmen U-Profil", "unit": "piece"}'),
        (v_table_id, 0, 0, 16.17, '{"name": "Zestaw Śrub", "description": "Schrauben-Set", "unit": "set"}'),
        (v_table_id, 0, 0, 921.46, '{"name": "Funkcja DK (Dreh-Kipp)", "description": "Dreh-Kipp Funktion", "unit": "piece"}'),
        (v_table_id, 0, 0, 596.13, '{"name": "Funkcja DK Front (Mała)", "description": "Dreh-Kipp Funktion", "unit": "piece"}'),
        (v_table_id, 0, 0, 1232.62, '{"name": "Drzwi DK (Duże)", "description": "Dreh-Kipp Tür groß", "unit": "piece"}');
    END IF;

  END IF;
END $$;
