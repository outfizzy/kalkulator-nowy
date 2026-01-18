DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verbindungsmuffe Buchse (11381) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verbindungsmuffe Buchse (11381) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 19);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Anschlussbox Somfy (11380) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Anschlussbox Somfy (11380) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 95);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Somfy Steuerung (11300) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Somfy Steuerung (11300) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 316);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dimm-Controller (11382) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dimm-Controller (11382) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 50);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fernbedienung (11383) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fernbedienung (11383) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 27);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Y-Kabel, 4er Set (11414) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Y-Kabel, 4er Set (11414) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 53);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 1m, 4er Set (11435) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 1m, 4er Set (11435) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 25);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 2m, 4er Set (11666) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 2m, 4er Set (11666) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 30);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Verlängerungskabel 3m, 4er Set (11444) (fest Preis)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Verlängerungskabel 3m, 4er Set (11444) (fest Preis)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Set","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 36);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat opal,  5X 16 mm (2,5;3;3,5;4;5 Meter) (11290)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat opal,  5X 16 mm (2,5;3;3,5;4;5 Meter) (11290)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 21);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat klar, 5X 16 mm (2,5;3;3,5;4;5 Meter) (11288)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat klar, 5X 16 mm (2,5;3;3,5;4;5 Meter) (11288)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 21);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm klar (11284)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm klar (11284)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 29);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm opal (11286)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat IR Gold, hitzeabweisend,16mm opal (11286)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 29);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Polycarbonat 16mm, smokey grey (11675)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Polycarbonat 16mm, smokey grey (11675)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 28);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Antistaubband (Polycarbonatplatten-Vorderseite)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Antistaubband (Polycarbonatplatten-Vorderseite)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"33 m1","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 33);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Dichtungsband (Polycarbonatplatte-Hinterseite)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Dichtungsband (Polycarbonatplatte-Hinterseite)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"50 m1","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 27);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Glas klar 8 mm VSG (11128)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Glas klar 8 mm VSG (11128)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"m2","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 34);
END $$;

