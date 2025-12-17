-- Migration to seed Lighting, Flooring and Accesssories components

-- 1. Create/Ensure "Oświetlenie i Ogrzewanie" Product
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  INSERT INTO product_definitions (name, code, category, provider, description)
  VALUES ('Oświetlenie i Ogrzewanie', 'oswietlenie_ogrzewanie', 'accessory', 'Inny', 'Kategoria grupująca opcje oświetlenia i ogrzewania')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    -- Try to find existing table first
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Oświetlenie i Ogrzewanie (Szablon)' LIMIT 1;

    IF v_table_id IS NOT NULL THEN
        -- Update existing to new product and ensure type
        UPDATE price_tables SET product_definition_id = v_product_id, type = 'simple' WHERE id = v_table_id;
    ELSE
        -- Insert new
        INSERT INTO price_tables (name, product_definition_id, is_active, type, configuration, attributes)
        VALUES ('Oświetlenie i Ogrzewanie (Szablon)', v_product_id, true, 'simple', '{}'::jsonb, '{"table_type": "component_list", "system": "lighting"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 150.00, '{"name": "LED Spot (szt.)", "description": "LED Spots Punktowe", "unit": "piece"}'),
        (v_table_id, 0, 0, 80.00,  '{"name": "LED Listwa (mb)", "description": "LED Listwa Taśma", "unit": "meter"}'),
        (v_table_id, 0, 0, 450.00, '{"name": "Promiennik Ciepła", "description": "Heizstrahler", "unit": "piece"}');
    END IF;
  END IF;
END $$;

-- 2. Create/Ensure "Systemy Podłogowe" Product
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  INSERT INTO product_definitions (name, code, category, provider, description)
  VALUES ('Systemy Podłogowe', 'systemy_podlogowe', 'other', 'Inny', 'Kategoria grupująca systemy podłogowe WPC')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    -- Try to find existing table first
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Podłoga WPC (Szablon)' LIMIT 1;

    IF v_table_id IS NOT NULL THEN
        -- Update existing to new product
        UPDATE price_tables SET product_definition_id = v_product_id, type = 'simple' WHERE id = v_table_id;
    ELSE
        -- Insert new
        INSERT INTO price_tables (name, product_definition_id, is_active, type, configuration, attributes)
        VALUES ('Podłoga WPC (Szablon)', v_product_id, true, 'simple', '{}'::jsonb, '{"table_type": "component_list", "system": "wpc_floor"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Flooring Types (Price per m2 - COST PRICE)
        (v_table_id, 0, 0, 80.00,  '{"name": "Deska Standard (m2)", "description": "WPC Standard (Komorowa)", "unit": "m2", "type": "material"}'),
        (v_table_id, 0, 0, 120.00, '{"name": "Deska Premium (m2)", "description": "WPC Premium (Pełna)", "unit": "m2", "type": "material"}'),
        (v_table_id, 0, 0, 100.00, '{"name": "Deska 3D Structure (m2)", "description": "WPC 3D Structure", "unit": "m2", "type": "material"}'),
        
        -- Installation Options (Price per m2)
        (v_table_id, 0, 0, 40.00,  '{"name": "Montaż na profilach (m2)", "description": "Montaż na profilach (Fundament Klienta)", "unit": "m2", "type": "installation"}'),
        (v_table_id, 0, 0, 90.00,  '{"name": "Montaż + Fundament (m2)", "description": "Montaż na profilach + Fundament", "unit": "m2", "type": "installation"}');
    END IF;
  END IF;
END $$;

-- 3. Create/Ensure "Sterowanie i Dodatki" Product
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  INSERT INTO product_definitions (name, code, category, provider, description)
  VALUES ('Sterowanie i Dodatki', 'sterowanie_dodatki', 'accessory', 'Somfy/Inne', 'Piloty, czujniki i inne dodatki')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    -- Try to find existing table first
    SELECT id INTO v_table_id FROM price_tables WHERE name = 'Sterowanie i Dodatki (Szablon)' LIMIT 1;

    IF v_table_id IS NOT NULL THEN
        -- Update existing to new product
        UPDATE price_tables SET product_definition_id = v_product_id, type = 'simple' WHERE id = v_table_id;
    ELSE
        -- Insert new
        INSERT INTO price_tables (name, product_definition_id, is_active, type, configuration, attributes)
        VALUES ('Sterowanie i Dodatki (Szablon)', v_product_id, true, 'simple', '{}'::jsonb, '{"table_type": "component_list", "system": "control"}'::jsonb)
        RETURNING id INTO v_table_id;
    END IF;

    IF v_table_id IS NOT NULL THEN
        DELETE FROM price_matrix_entries WHERE price_table_id = v_table_id;
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 120.00, '{"name": "Pilot 1-kanałowy", "description": "Pilot Somfy Situo 1", "unit": "piece"}'),
        (v_table_id, 0, 0, 180.00, '{"name": "Pilot 5-kanałowy", "description": "Pilot Somfy Situo 5", "unit": "piece"}'),
        (v_table_id, 0, 0, 250.00, '{"name": "Czujnik Wiatru", "description": "Eolis 3D WireFree", "unit": "piece"}'),
        (v_table_id, 0, 0, 45.00,  '{"name": "Środek czyszczący", "description": "Zestaw do czyszczenia (1L)", "unit": "piece"}');
    END IF;
  END IF;
END $$;
