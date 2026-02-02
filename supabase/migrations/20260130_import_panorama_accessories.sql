-- Panorama Accessories Import
-- Migration: 20260130_import_panorama_accessories.sql
-- Source: AluxePreisliste.xlsx (Panorama AL23R sheet)

-- Create product definition for Panorama accessories if not exists
INSERT INTO product_definitions (code, name, category, provider, description) VALUES
  ('panorama_accessories', 'Panorama Accessories', 'accessory', 'Aluxe', 'Accessories for Panorama sliding wall systems')
ON CONFLICT (code) DO NOTHING;

-- Insert Panorama accessories into product_components
DO $$
DECLARE
  pd_id UUID;
BEGIN
  SELECT id INTO pd_id FROM product_definitions WHERE code = 'panorama_accessories';
  
  -- Lock types (Schloss)
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_lock_side', 'Edelstahl Schloss (seitlich öffnend)', 73.44, 'piece', true),
    (pd_id, 'panorama_lock_center', 'Edelstahl Schloss (mittig öffnend)', 97.92, 'piece', true)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

  -- Handle types
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_knauf_edelstahl', 'Türknauf Edelstahl', 36.68, 'piece', true),
    (pd_id, 'panorama_griff_edelstahl', 'Türgriff Edelstahl oder Schwarz', 14.21, 'piece', true)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

  -- Locking mechanism
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_verriegelung', 'Verriegelung AL22/23/24', 9.80, 'piece', true)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

  -- Steel-Look profiles and accessories
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_steel_u_profil', 'Steel-Look U Profil 2400mm RAL 7016/9005', 18.95, 'piece', true),
    (pd_id, 'panorama_steel_u_profil_brush', 'Steel-Look U Profil 2400mm mit Bürstendichtung', 18.95, 'piece', true),
    (pd_id, 'panorama_steel_brush_seal', 'Bürstendichtung für Steel-Look Profile', 0.98, 'm1', true),
    (pd_id, 'panorama_steel_horiz_strip', 'Steel-Look horizontal Strip RAL 7016/9005', 3.79, 'm1', true),
    (pd_id, 'panorama_steel_tape', 'Steel-Look Tape 50m', 19.90, 'roll', true)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

  -- Glass options (surcharge vs standard Klar 10mm)
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_glass_planibel_grau', 'Planibel Grau 10mm (Aufpreis)', 47.95, 'm2', true), -- 104.80 - 56.84 = 47.96 surcharge
    (pd_id, 'panorama_glass_klar', 'Klar 10mm (Standard)', 56.84, 'm2', false)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

  -- Per-meter profiles (for loose material / custom orders)
  -- AL23 prices as base reference
  INSERT INTO product_components (product_definition_id, component_key, description, base_price, unit, is_optional)
  VALUES 
    (pd_id, 'panorama_rail_bottom_3tor', 'Laufschiene unten (3-Tor)', 24.41, 'm1', true),
    (pd_id, 'panorama_rail_bottom_4tor', 'Laufschiene unten (4-Tor)', 30.47, 'm1', true),
    (pd_id, 'panorama_rail_bottom_5tor', 'Laufschiene unten (5-Tor)', 36.52, 'm1', true),
    (pd_id, 'panorama_rail_bottom_6tor', 'Laufschiene unten (6-Tor)', 43.82, 'm1', true),
    (pd_id, 'panorama_rail_bottom_7tor', 'Laufschiene unten (7-Tor)', 51.13, 'm1', true),
    (pd_id, 'panorama_rail_top_3tor', 'Laufschiene oben (3-Tor)', 28.39, 'm1', true),
    (pd_id, 'panorama_rail_top_4tor', 'Laufschiene oben (4-Tor)', 34.63, 'm1', true),
    (pd_id, 'panorama_rail_top_5tor', 'Laufschiene oben (5-Tor)', 40.91, 'm1', true),
    (pd_id, 'panorama_rail_top_6tor', 'Laufschiene oben (6-Tor)', 49.45, 'm1', true),
    (pd_id, 'panorama_rail_top_7tor', 'Laufschiene oben (7-Tor)', 57.72, 'm1', true),
    (pd_id, 'panorama_side_profile', 'Seitenprofil', 11.22, 'm1', true),
    (pd_id, 'panorama_koppel_profile_3tor', 'Koppelprofil/Keilfenster (3-Tor)', 7.81, 'm1', true),
    (pd_id, 'panorama_koppel_profile_4tor', 'Koppelprofil/Keilfenster (4-Tor)', 9.57, 'm1', true),
    (pd_id, 'panorama_koppel_profile_5tor', 'Koppelprofil/Keilfenster (5-Tor)', 11.32, 'm1', true)
  ON CONFLICT (component_key) DO UPDATE SET base_price = EXCLUDED.base_price, description = EXCLUDED.description;

END $$;
