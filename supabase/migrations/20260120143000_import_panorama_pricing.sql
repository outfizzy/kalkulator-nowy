-- Panorama Walls Pricing Data Import
-- Migration: 20260120143000_import_panorama_pricing.sql
-- This migration adds pricing data for Panorama sliding walls

-- Ensure product definition exists
INSERT INTO product_definitions (code, name, category, provider, description) VALUES
  ('aluxe_v2_walls', 'Aluxe V2 - Walls', 'sliding_wall', 'Aluxe', 'Wall enclosures and doors')
ON CONFLICT (code) DO NOTHING;

-- Create price tables for Panorama products
DO $$
DECLARE
  pd_id UUID;
  table_id UUID;
BEGIN
  -- Get product definition ID
  SELECT id INTO pd_id FROM product_definitions WHERE code = 'aluxe_v2_walls';
  
  -- AL22 3-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL22 (3-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 241.58)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL22 5-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL22 (5-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 251.05)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL23 3-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL23 (3-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 260.52)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL23 5-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL23 (5-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 265.27)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL23 7-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL23 (7-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 270.00)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL24 3-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL24 (3-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 241.58)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL24 5-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL24 (5-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 246.31)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL25 3-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL25 (3-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 279.48)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL25 5-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL25 (5-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 288.95)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL26 3-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL26 (3-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 260.52)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- AL26 5-Tor
  INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
  VALUES (pd_id, 'Aluxe V2 - Panorama AL26 (5-Tor)', 'matrix', true, 'EUR')
  ON CONFLICT DO NOTHING
  RETURNING id INTO table_id;
  
  IF table_id IS NOT NULL THEN
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (table_id, 850, 0, 265.27)
    ON CONFLICT DO NOTHING;
  END IF;
  
END $$;
