DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Freestanding Surcharge', 'simple', true, 'EUR', '{"provider":"Aluxe","type":"surcharge","category":"freestanding_construction","foundation":false,"pricing_method":"simple"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 3000, 0, 383),
(v_table_id, 4000, 0, 451),
(v_table_id, 5000, 0, 519),
(v_table_id, 6000, 0, 659),
(v_table_id, 7000, 0, 727);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Freestanding Surcharge (Foundation)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Freestanding Surcharge (Foundation)', 'simple', true, 'EUR', '{"provider":"Aluxe","type":"surcharge","category":"freestanding_construction","foundation":true,"pricing_method":"simple"}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 3000, 0, 460),
(v_table_id, 4000, 0, 528),
(v_table_id, 5000, 0, 596),
(v_table_id, 6000, 0, 775),
(v_table_id, 7000, 0, 842);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Zonweringspaneel';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Zonweringspaneel', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_panel","model":"Zonweringspaneel","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 0, 2000, 447),
(v_table_id, 0, 2050, 454),
(v_table_id, 0, 2100, 460),
(v_table_id, 0, 2150, 466),
(v_table_id, 0, 2200, 473),
(v_table_id, 0, 2250, 479),
(v_table_id, 0, 2300, 485),
(v_table_id, 0, 2350, 491),
(v_table_id, 0, 2400, 498),
(v_table_id, 0, 2450, 504),
(v_table_id, 0, 2500, 510),
(v_table_id, 0, 2550, 517),
(v_table_id, 0, 2600, 523),
(v_table_id, 0, 2650, 529);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fence Element (Aluminium)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fence Element (Aluminium)', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_element","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 1000, 1800, 408),
(v_table_id, 1000, 2000, 453);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Fence Element (Door)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Fence Element (Door)', 'matrix', true, 'EUR', '{"provider":"Aluxe","type":"fence_door","pricing_method":"matrix"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
(v_table_id, 1000, 1800, 646),
(v_table_id, 1000, 2000, 674);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rahmenprofil für Fenster AL8002 (Selbstbau) (11185)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rahmenprofil für Fenster AL8002 (Selbstbau) (11185)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 73);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Rahmenabdeckprofil für Fenster AL8003 (Selbstbau) (11007)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Rahmenabdeckprofil für Fenster AL8003 (Selbstbau) (11007)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 40);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - T-Rahmenprofil für Fenster AL8001 (Selbstbau) (11394)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - T-Rahmenprofil für Fenster AL8001 (Selbstbau) (11394)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 89);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - T-Abdeckprofil für Fenster AL8000 (Selbstbaufenster) (11395)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - T-Abdeckprofil für Fenster AL8000 (Selbstbaufenster) (11395)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"7000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 99);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Winkelverbinder (Selbstbaufenster) (11175)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Winkelverbinder (Selbstbaufenster) (11175)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":null,"pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Ausgleichspfosten 110x60mm (11038)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Ausgleichspfosten 110x60mm (11038)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"4000 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 105);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Koppelprofil Glas 8mm (11200)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Koppelprofil Glas 8mm (11200)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 5);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Koppelprofil Glas 10mm (11199)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Koppelprofil Glas 10mm (11199)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 5);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abtropfleiste 8mm Glas (11031)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abtropfleiste 8mm Glas (11031)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Abtropfleiste 10mm Glas (11030)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Abtropfleiste 10mm Glas (11030)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"850 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4);
END $$;



DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Anti-Kondensat-Profil 16mm (11055)';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Anti-Kondensat-Profil 16mm (11055)', 'fixed', true, 'EUR', '{"provider":"Aluxe","type":"accessory","unit":"Stk.","dimension":"980 mm","pricing_method":"fixed"}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, 4);
END $$;

