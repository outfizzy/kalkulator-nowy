-- =============================================
-- PANORAMA PRICING - Wklej do Supabase SQL Editor
-- =============================================

-- Krok 1: Uzyskaj ID product_definitions dla 'aluxe_v2_walls'
-- (Możesz najpierw sprawdzić czy istnieje)
INSERT INTO product_definitions (code, name, category, provider, description) 
VALUES ('aluxe_v2_walls', 'Aluxe V2 - Walls', 'sliding_wall', 'Aluxe', 'Wall enclosures and doors')
ON CONFLICT (code) DO NOTHING;

-- Krok 2: Sprawdź czy tabele cenowe istnieją
SELECT * FROM price_tables WHERE name LIKE '%Panorama%';

-- =============================================
-- Jeśli tabele NIE istnieją, uruchom poniższe
-- =============================================

-- Pobierz ID produktu
-- Podmień {PD_ID} na wynik z: SELECT id FROM product_definitions WHERE code = 'aluxe_v2_walls';

-- AL22 3-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL22 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 241.58 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (3-Tor)'
ON CONFLICT DO NOTHING;

-- AL22 5-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL22 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 251.05 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL22 (5-Tor)'
ON CONFLICT DO NOTHING;

-- AL23 3-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL23 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 260.52 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (3-Tor)'
ON CONFLICT DO NOTHING;

-- AL23 5-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL23 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 265.27 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (5-Tor)'
ON CONFLICT DO NOTHING;

-- AL23 7-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL23 (7-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 270.00 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL23 (7-Tor)'
ON CONFLICT DO NOTHING;

-- AL24 3-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL24 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 241.58 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (3-Tor)'
ON CONFLICT DO NOTHING;

-- AL24 5-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL24 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 246.31 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL24 (5-Tor)'
ON CONFLICT DO NOTHING;

-- AL25 3-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL25 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 279.48 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (3-Tor)'
ON CONFLICT DO NOTHING;

-- AL25 5-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL25 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 288.95 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL25 (5-Tor)'
ON CONFLICT DO NOTHING;

-- AL26 3-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL26 (3-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 260.52 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (3-Tor)'
ON CONFLICT DO NOTHING;

-- AL26 5-Tor
INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)
SELECT id, 'Aluxe V2 - Panorama AL26 (5-Tor)', 'matrix', true, 'EUR'
FROM product_definitions WHERE code = 'aluxe_v2_walls'
ON CONFLICT DO NOTHING;

INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
SELECT id, 850, 0, 265.27 FROM price_tables WHERE name = 'Aluxe V2 - Panorama AL26 (5-Tor)'
ON CONFLICT DO NOTHING;

-- =============================================
-- WERYFIKACJA - Sprawdź czy dane zostały dodane
-- =============================================
SELECT pt.name, pme.width_mm, pme.projection_mm, pme.price 
FROM price_tables pt 
JOIN price_matrix_entries pme ON pt.id = pme.price_table_id 
WHERE pt.name LIKE '%Panorama%' 
ORDER BY pt.name;
