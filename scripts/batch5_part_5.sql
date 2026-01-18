DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas klar 10mm VSG (11131)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas klar 10mm VSG (11131)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 39);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas matt 8 mm VSG (11129)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas matt 8 mm VSG (11129)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 42);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas matt 10mm VSG (11132)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas matt 10mm VSG (11132)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 47);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas Stopsol klar 10 mm VSG (11391)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas Stopsol klar 10 mm VSG (11391)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 65);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas planibel grey 8mm VSG (11905)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas planibel grey 8mm VSG (11905)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 62);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Iso Glas 33.1-10-33.1 (11508)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Iso Glas 33.1-10-33.1 (11508)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 116);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Iso Glas 33.1-10-33.1 24mm Matt (11509)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Iso Glas 33.1-10-33.1 24mm Matt (11509)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 141);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Selbstschneidene Schrauben (Torx) inkl. Dichtung in RAL Farbe (11423)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Selbstschneidene Schrauben (Torx) inkl. Dichtung in RAL Farbe (11423)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"25 Stk.","dimension":"5,5x27","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 21);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Keilfenster';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Keilfenster', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 17);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Panoramaschiebewände (11333)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Panoramaschiebewände (11333)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 19);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Markisen (11336)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Markisen (11336)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 18);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Abdeckkappen (11080)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Abdeckkappen (11080)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"16 Stk.","dimension":"3,5x19","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 9);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dachschrauben (Torx) inkl. Dichtung in RAL Farbe (11400)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dachschrauben (Torx) inkl. Dichtung in RAL Farbe (11400)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"25 Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 19);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset freistehende Lösung (11325)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset freistehende Lösung (11325)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 34);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Orangeline / Trendline / Topline (11328)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Orangeline / Trendline / Topline (11328)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 43);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset erweiterung Topline XL';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset erweiterung Topline XL', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 44);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Schraubenset Designline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Schraubenset Designline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 55);
END $$;

