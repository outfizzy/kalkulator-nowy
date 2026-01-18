-- Seed Logical Price Tables and Product Definitions

-- 1. Ensure Product Definitions Exist
INSERT INTO product_definitions (code, name, category, provider, description) VALUES
('aufdachmarkise_zip', 'Markiza Dachowa (1 Silnik)', 'awning', 'Manual', 'Markiza montowana na dachu (1 silnik)'),
('aufdachmarkise_zip_2m', 'Markiza Dachowa (2 Silniki)', 'awning', 'Manual', 'Markiza montowana na dachu (2 silniki - duże gabaryty)'),
('unterdachmarkise_zip', 'Markiza Poddachowa (1 Silnik)', 'awning', 'Manual', 'Markiza montowana pod dachem (1 silnik)'),
('unterdachmarkise_zip_2m', 'Markiza Poddachowa (2 Silniki)', 'awning', 'Manual', 'Markiza montowana pod dachem (2 silniki - duże gabaryty)'),
('zip_screen', 'Roleta ZIP (Pionowa)', 'screen', 'Manual', 'Roleta pionowa typu ZIP'),
('sliding_doors_system', 'Ściany Przesuwne (Szklane)', 'sliding_wall', 'Manual', 'System ścian przesuwnych'),
('walls_aluminum_system', 'Zabudowa Stała (Alu/Ściany)', 'sliding_wall', 'Manual', 'Stała zabudowa aluminiowa'),
('panorama_system', 'Szyby Panoramiczne (Panorama)', 'sliding_wall', 'Manual', 'System szyb panoramicznych'),
('keilfenster_system', 'Kliny / Trójkąty (Keilfenster)', 'sliding_wall', 'Manual', 'Okna trójkątne (Kliny)'),
('lighting_system', 'Oświetlenie (LED)', 'lighting', 'Manual', 'System oświetlenia LED'),
('heating_system', 'Ogrzewanie (Promienniki)', 'heating', 'Manual', 'Promienniki ciepła'),
('wpc_floor_system', 'Podłoga WPC', 'floor', 'Manual', 'Deska kompozytowa WPC')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

-- 2. Create "Cennik BAZOWY" for each definition
-- Only insert if NO table exists for this product yet (to avoid duplicates if run multiple times)
-- We check by product_definition_id

DO $$
DECLARE
    prod_code text;
    prod_id uuid;
    table_name text;
    table_type text;
BEGIN
    FOR prod_code IN SELECT unnest(ARRAY[
        'aufdachmarkise_zip', 
        'aufdachmarkise_zip_2m', 
        'unterdachmarkise_zip', 
        'unterdachmarkise_zip_2m', 
        'zip_screen', 
        'sliding_doors_system', 
        'walls_aluminum_system', 
        'panorama_system', 
        'keilfenster_system',
        'lighting_system',
        'heating_system',
        'wpc_floor_system'
    ])
    LOOP
        -- Get Product ID
        SELECT id INTO prod_id FROM product_definitions WHERE code = prod_code;
        
        -- Determine Table Name & Type
        SELECT name INTO table_name FROM product_definitions WHERE id = prod_id;
        table_name := 'Cennik BAZOWY - ' || table_name;
        
        -- Default type 'matrix', but some might be 'addons' if we supported that better?
        -- For now, Importer uses 'matrix' mode for almost everything or 'loose_parts'.
        -- Standardize on 'matrix' for structured pricing, 'addons' isn't really used as a TYPE in price_tables usually, 
        -- mostly 'matrix' or just list. Let's use 'matrix'.
        table_type := 'matrix';

        -- Insert if not exists
        IF prod_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM price_tables WHERE product_definition_id = prod_id) THEN
                INSERT INTO price_tables (name, product_definition_id, type, is_active, currency, created_at)
                VALUES (table_name, prod_id, table_type, true, 'EUR', now());
                RAISE NOTICE 'Created table for %', prod_code;
            ELSE
                RAISE NOTICE 'Table already exists for %', prod_code;
            END IF;
        END IF;

    END LOOP;
END $$;
