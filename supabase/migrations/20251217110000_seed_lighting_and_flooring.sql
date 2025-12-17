-- Migration to seed Lighting and WPC Flooring components

-- 1. Lighting Options
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  -- Link to Trendstyle as a representative parent (lighting fits all)
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Oświetlenie i Ogrzewanie (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "lighting"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        (v_table_id, 0, 0, 150.00, '{"name": "LED Spot (szt.)", "description": "LED Spots Punktowe", "unit": "piece"}'),
        (v_table_id, 0, 0, 80.00,  '{"name": "LED Listwa (mb)", "description": "LED Listwa Taśma", "unit": "meter"}'),
        (v_table_id, 0, 0, 450.00, '{"name": "Promiennik Ciepła", "description": "Heizstrahler", "unit": "piece"}');
    END IF;
  END IF;
END $$;

-- 2. WPC Flooring Options
DO $$
DECLARE
  v_product_id uuid;
  v_table_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM product_definitions WHERE code = 'trendstyle' LIMIT 1;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO price_tables (name, product_definition_id, is_active, configuration, attributes)
    VALUES ('Podłoga WPC (Szablon)', v_product_id, true, '{}'::jsonb, '{"table_type": "component_list", "system": "wpc_floor"}'::jsonb)
    RETURNING id INTO v_table_id;

    IF v_table_id IS NOT NULL THEN
        INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
        -- Flooring Types (Price per m2)
        (v_table_id, 0, 0, 80.00,  '{"name": "Deska Standard (m2)", "description": "WPC Standard (Komorowa)", "unit": "m2", "type": "material"}'),
        (v_table_id, 0, 0, 120.00, '{"name": "Deska Premium (m2)", "description": "WPC Premium (Pełna)", "unit": "m2", "type": "material"}'),
        (v_table_id, 0, 0, 100.00, '{"name": "Deska 3D Structure (m2)", "description": "WPC 3D Structure", "unit": "m2", "type": "material"}'),
        
        -- Installation Options (Price per m2)
        (v_table_id, 0, 0, 40.00,  '{"name": "Montaż na profilach (m2)", "description": "Montaż na profilach (Fundament Klienta)", "unit": "m2", "type": "installation"}'),
        (v_table_id, 0, 0, 90.00,  '{"name": "Montaż + Fundament (m2)", "description": "Montaż na profilach + Fundament", "unit": "m2", "type": "installation"}');
    END IF;
  END IF;
END $$;
