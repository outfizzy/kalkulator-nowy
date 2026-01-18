DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC 90° Bogen (11077)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC 90° Bogen (11077)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 5);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC 45° Bogen (11076)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC 45° Bogen (11076)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - PVC T-Stück';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - PVC T-Stück', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 6);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Laubfänger (11168/11169)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Laubfänger (11168/11169)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"Ø 80 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 5);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Clean Box (11470)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Clean Box (11470)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":1,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 43);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Deep Clean Box (11469)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Deep Clean Box (11469)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":1,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 69);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Lackstift (11214)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Lackstift (11214)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"nur standard Farben","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 15);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sprühdose';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sprühdose', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"nur standard Farben","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 29);
END $$;