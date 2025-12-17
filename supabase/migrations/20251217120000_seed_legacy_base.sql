
-- Migration to seed "Legacy" Base Prices for Keilfenster, Aluminum Walls, and Sliding Doors
-- Using data extracted from src/data/keilfenster.ts and src/data/aluminium_walls.ts

DO $$
DECLARE
  v_prod_walls uuid;
  v_table_keil uuid;
  v_table_alu_side uuid;
  v_table_alu_front uuid;
  v_table_alu_slide uuid;
BEGIN
  -- 1. Ensure Product "Systemy Ścian i Zabudowy" exists (created in previous migration, but safe to check)
  SELECT id INTO v_prod_walls FROM product_definitions WHERE code = 'system_scian';
  IF v_prod_walls IS NULL THEN
      INSERT INTO product_definitions (name, code, category, provider, description)
      VALUES ('Systemy Ścian i Zabudowy', 'system_scian', 'sliding_wall', 'Inny', 'Wirtualny produkt grupujący opcje ścian i zabudów')
      RETURNING id INTO v_prod_walls;
  END IF;

  -- 2. Create/Update Tables for Base Matrices

  -- Keilfenster Base
  SELECT id INTO v_table_keil FROM price_tables WHERE name = 'Keilfenster - Cennik Bazowy';
  IF v_table_keil IS NULL THEN
      INSERT INTO price_tables (name, product_definition_id, is_active, type, attributes)
      VALUES ('Keilfenster - Cennik Bazowy', v_prod_walls, true, 'matrix', '{"system": "keilfenster_base"}')
      RETURNING id INTO v_table_keil;
  END IF;
  
  DELETE FROM price_matrix_entries WHERE price_table_id = v_table_keil;
  INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
  (v_table_keil, 2000, 0, 481.65, '{"surcharge_matt": 8.12, "surcharge_ig": 63.31}'),
  (v_table_keil, 2500, 0, 527.25, '{"surcharge_matt": 10.15, "surcharge_ig": 79.14}'),
  (v_table_keil, 3000, 0, 571.90, '{"surcharge_matt": 12.18, "surcharge_ig": 94.97}'),
  (v_table_keil, 3500, 0, 616.55, '{"surcharge_matt": 14.21, "surcharge_ig": 110.79}'),
  (v_table_keil, 4000, 0, 680.20, '{"surcharge_matt": 16.25, "surcharge_ig": 126.62}'),
  (v_table_keil, 4500, 0, 722.95, '{"surcharge_matt": 18.28, "surcharge_ig": 142.45}'),
  (v_table_keil, 5000, 0, 767.60, '{"surcharge_matt": 20.31, "surcharge_ig": 158.28}');

  -- Alu Seitenwand Base
  SELECT id INTO v_table_alu_side FROM price_tables WHERE name = 'Ściana Alu Boczna - Cennik Bazowy';
  IF v_table_alu_side IS NULL THEN
      INSERT INTO price_tables (name, product_definition_id, is_active, type, attributes)
      VALUES ('Ściana Alu Boczna - Cennik Bazowy', v_prod_walls, true, 'matrix', '{"system": "alu_seitenwand_base"}')
      RETURNING id INTO v_table_alu_side;
  END IF;

  DELETE FROM price_matrix_entries WHERE price_table_id = v_table_alu_side;
  INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
  (v_table_alu_side, 1000, 0, 598.50, '{"surcharge_matt": 20.31, "surcharge_ig": 158.28, "surcharge_sprosse": 82.67}'),
  (v_table_alu_side, 1500, 0, 798.00, '{"surcharge_matt": 30.46, "surcharge_ig": 237.41, "surcharge_sprosse": 124.01}'),
  (v_table_alu_side, 2000, 0, 885.40, '{"surcharge_matt": 40.61, "surcharge_ig": 316.55, "surcharge_sprosse": 165.35}'),
  (v_table_alu_side, 2500, 0, 1070.65, '{"surcharge_matt": 50.77, "surcharge_ig": 395.69, "surcharge_sprosse": 207.29}'),
  (v_table_alu_side, 3000, 0, 1166.60, '{"surcharge_matt": 60.92, "surcharge_ig": 474.83, "surcharge_sprosse": 249.23}'),
  (v_table_alu_side, 3500, 0, 1375.60, '{"surcharge_matt": 71.07, "surcharge_ig": 553.97, "surcharge_sprosse": 289.96}'),
  (v_table_alu_side, 4000, 0, 1470.60, '{"surcharge_matt": 81.23, "surcharge_ig": 633.10, "surcharge_sprosse": 330.68}'),
  (v_table_alu_side, 4500, 0, 1676.75, '{"surcharge_matt": 91.38, "surcharge_ig": 712.24, "surcharge_sprosse": 372.03}'),
  (v_table_alu_side, 5000, 0, 1773.65, '{"surcharge_matt": 101.53, "surcharge_ig": 791.38, "surcharge_sprosse": 413.35}');

  -- Alu Frontwand Base
  SELECT id INTO v_table_alu_front FROM price_tables WHERE name = 'Ściana Alu Frontowa - Cennik Bazowy';
  IF v_table_alu_front IS NULL THEN
      INSERT INTO price_tables (name, product_definition_id, is_active, type, attributes)
      VALUES ('Ściana Alu Frontowa - Cennik Bazowy', v_prod_walls, true, 'matrix', '{"system": "alu_frontwand_base"}')
      RETURNING id INTO v_table_alu_front;
  END IF;

  DELETE FROM price_matrix_entries WHERE price_table_id = v_table_alu_front;
  INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
  (v_table_alu_front, 1000, 0, 548.15, '{"surcharge_matt": 19.49, "surcharge_ig": 151.94, "surcharge_sprosse": 82.67}'),
  (v_table_alu_front, 2000, 0, 779.00, '{"surcharge_matt": 38.99, "surcharge_ig": 303.89, "surcharge_sprosse": 165.35}'),
  (v_table_alu_front, 3000, 0, 1022.20, '{"surcharge_matt": 58.48, "surcharge_ig": 455.83, "surcharge_sprosse": 249.23}'),
  (v_table_alu_front, 4000, 0, 1265.40, '{"surcharge_matt": 77.98, "surcharge_ig": 607.78, "surcharge_sprosse": 330.68}'),
  (v_table_alu_front, 5000, 0, 1519.05, '{"surcharge_matt": 97.47, "surcharge_ig": 759.72, "surcharge_sprosse": 413.35}'),
  (v_table_alu_front, 6000, 0, 1657.75, '{"surcharge_matt": 116.96, "surcharge_ig": 911.67, "surcharge_sprosse": 497.25}'),
  (v_table_alu_front, 7000, 0, 1866.75, '{"surcharge_matt": 136.46, "surcharge_ig": 1063.61, "surcharge_sprosse": 579.91}');

  -- Alu Schiebetuer Base
  SELECT id INTO v_table_alu_slide FROM price_tables WHERE name = 'Ściana Przesuwna Alu - Cennik Bazowy';
  IF v_table_alu_slide IS NULL THEN
      INSERT INTO price_tables (name, product_definition_id, is_active, type, attributes)
      VALUES ('Ściana Przesuwna Alu - Cennik Bazowy', v_prod_walls, true, 'matrix', '{"system": "alu_schiebetuer_base"}')
      RETURNING id INTO v_table_alu_slide;
  END IF;

  DELETE FROM price_matrix_entries WHERE price_table_id = v_table_alu_slide;
  INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, properties) VALUES
  (v_table_alu_slide, 2000, 0, 1201.75, '{"surcharge_matt": 42.24, "surcharge_ig": 329.21, "config": "2-teilig"}'),
  (v_table_alu_slide, 2500, 0, 1290.10, '{"surcharge_matt": 52.80, "surcharge_ig": 411.52, "config": "2-teilig"}'),
  (v_table_alu_slide, 3000, 0, 1822.10, '{"surcharge_matt": 63.36, "surcharge_ig": 493.82, "config": "2-3-teilig"}'),
  (v_table_alu_slide, 3500, 0, 1938.00, '{"surcharge_matt": 73.91, "surcharge_ig": 576.12, "config": "3-teilig"}'),
  (v_table_alu_slide, 4000, 0, 2059.60, '{"surcharge_matt": 84.47, "surcharge_ig": 658.43, "config": "3-4-teilig"}'),
  (v_table_alu_slide, 4500, 0, 2180.25, '{"surcharge_matt": 95.03, "surcharge_ig": 740.73, "config": "3-4-teilig"}'),
  (v_table_alu_slide, 5000, 0, 2382.60, '{"surcharge_matt": 105.59, "surcharge_ig": 823.03, "config": "4-teilig"}'),
  (v_table_alu_slide, 5500, 0, 2930.75, '{"surcharge_matt": 116.15, "surcharge_ig": 905.34, "config": "4-6-teilig"}'),
  (v_table_alu_slide, 6000, 0, 3116.00, '{"surcharge_matt": 126.71, "surcharge_ig": 987.64, "config": "4-6-teilig"}');

END $$;
