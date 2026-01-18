DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Konstruktions Profil 190x117 mm (fest Preis) (11099)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Konstruktions Profil 190x117 mm (fest Preis) (11099)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 600);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Klickleiste f. Konstruktions- u. Designlinepfosten (11190)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Klickleiste f. Konstruktions- u. Designlinepfosten (11190)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"4830 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 35);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Leiste Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Leiste Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"3500 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 21);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinne Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinne Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 83);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Wandprofil Woodline';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Wandprofil Woodline', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 53);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abdichtprofil (11590)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abdichtprofil (11590)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 19);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 7016 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 7016 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 46);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9010 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9010 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 46);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9007 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9007 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"25x25x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 46);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 7016 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 7016 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 62);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9010 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9010 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 62);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - RAL 9007 Feinstruktur / Matt';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - RAL 9007 Feinstruktur / Matt', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"50x50x6000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 62);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Sparrenverstärkung XL, Stahl (verzinkt) (11903)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Sparrenverstärkung XL, Stahl (verzinkt) (11903)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"70x50x3mm 3900mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 53);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline (11373)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline (11373)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"90x10x4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 61);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline+, Trendline und Sparren Designline (11372)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Orangeline+, Trendline und Sparren Designline (11372)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"110x10x4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 96);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Trendline+ (11365)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Trendline+ (11365)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"120x10x4900 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 99);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Ultraline und Topline (11408)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rinnenverstärkung, Stahl (verzinkt) Ultraline und Topline (11408)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"140x40x5000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 138);
END $$;

