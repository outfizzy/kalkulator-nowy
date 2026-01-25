-- Migration: Import Zonweringspaneel (Sonnenschutzpaneel) pricing
-- Sun shading panels for Panorama systems (AL22-AL26)
-- Panel width: 600-1100mm, Height: 2000-2650mm

DO $$
DECLARE
    product_id uuid;
    table_id uuid;
BEGIN
    -- 1. Get or create product definition
    SELECT id INTO product_id FROM product_definitions WHERE code = 'sonnenschutzpaneel';
    
    IF product_id IS NULL THEN
        INSERT INTO product_definitions (name, code, category, provider, description)
        VALUES (
            'Sonnenschutzpaneel',
            'sonnenschutzpaneel',
            'accessory',
            'Aluxe',
            'Sonnenschutzpaneel für Panorama-Systeme (AL22-AL26). Paneelbreite: 600-1100mm auf Maß.'
        )
        RETURNING id INTO product_id;
        RAISE NOTICE 'Created product: Sonnenschutzpaneel (ID: %)', product_id;
    ELSE
        RAISE NOTICE 'Found existing product: Sonnenschutzpaneel (ID: %)', product_id;
    END IF;

    -- 2. Get or create price table
    SELECT id INTO table_id FROM price_tables WHERE name = 'Aluxe V2 - Sonnenschutzpaneel';
    
    IF table_id IS NULL THEN
        INSERT INTO price_tables (name, product_definition_id, is_active, attributes)
        VALUES (
            'Aluxe V2 - Sonnenschutzpaneel',
            product_id,
            true,
            jsonb_build_object(
                'type', 'height_list',
                'panel_width_min', 600,
                'panel_width_max', 1100,
                'compatible_systems', ARRAY['AL22', 'AL23', 'AL24', 'AL25', 'AL26'],
                'sheet_source', 'Zonweringspaneel'
            )
        )
        RETURNING id INTO table_id;
        RAISE NOTICE 'Created price table: Aluxe V2 - Sonnenschutzpaneel (ID: %)', table_id;
    ELSE
        -- Update attributes
        UPDATE price_tables SET 
            attributes = jsonb_build_object(
                'type', 'height_list',
                'panel_width_min', 600,
                'panel_width_max', 1100,
                'compatible_systems', ARRAY['AL22', 'AL23', 'AL24', 'AL25', 'AL26'],
                'sheet_source', 'Zonweringspaneel'
            ),
            is_active = true
        WHERE id = table_id;
        RAISE NOTICE 'Updated existing price table (ID: %)', table_id;
    END IF;

    -- 3. Clear existing entries for this table
    DELETE FROM price_matrix_entries WHERE price_table_id = table_id;

    -- 4. Insert price entries (height-based pricing from Excel)
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price, structure_price, properties)
    VALUES
        (table_id, 2000, 0, 446.75, 446.75, '{"height_mm": 2000}'::jsonb),
        (table_id, 2050, 0, 453.07, 453.07, '{"height_mm": 2050}'::jsonb),
        (table_id, 2100, 0, 459.38, 459.38, '{"height_mm": 2100}'::jsonb),
        (table_id, 2150, 0, 465.70, 465.70, '{"height_mm": 2150}'::jsonb),
        (table_id, 2200, 0, 472.01, 472.01, '{"height_mm": 2200}'::jsonb),
        (table_id, 2250, 0, 478.32, 478.32, '{"height_mm": 2250}'::jsonb),
        (table_id, 2300, 0, 484.64, 484.64, '{"height_mm": 2300}'::jsonb),
        (table_id, 2350, 0, 490.96, 490.96, '{"height_mm": 2350}'::jsonb),
        (table_id, 2400, 0, 497.28, 497.28, '{"height_mm": 2400}'::jsonb),
        (table_id, 2450, 0, 503.59, 503.59, '{"height_mm": 2450}'::jsonb),
        (table_id, 2500, 0, 509.90, 509.90, '{"height_mm": 2500}'::jsonb),
        (table_id, 2550, 0, 516.21, 516.21, '{"height_mm": 2550}'::jsonb),
        (table_id, 2600, 0, 522.54, 522.54, '{"height_mm": 2600}'::jsonb),
        (table_id, 2650, 0, 528.85, 528.85, '{"height_mm": 2650}'::jsonb);

    RAISE NOTICE 'Imported 14 price entries for Sonnenschutzpaneel';
END $$;
