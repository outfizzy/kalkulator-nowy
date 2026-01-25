-- Designline Schiebeeinheit (Sliding Roof Glass) Surcharge Import
-- Generated: 2026-01-24
-- Source: AluxePreisliste.xlsx - Designline Zone 1R/2R/3R Column E

BEGIN;

-- Create Schiebeeinheit Surcharge Table
-- Pricing is per FIELD, based on projection (depth) dimension
-- Formula from Excel: projection_mm * 0.0891 EUR
-- Same price across all zones (verified in Excel)

DO $$
DECLARE
    v_table_id uuid;
BEGIN
    -- Cleanup existing
    DELETE FROM price_tables WHERE name ILIKE '%Designline%Schiebeeinheit%';
    DELETE FROM price_tables WHERE name ILIKE '%Designline%Sliding Roof%';

    -- Create new table
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES (
        'Aluxe V2 - Designline Schiebeeinheit (Sliding Roof)',
        'matrix',
        true,
        'EUR',
        '{"provider": "Aluxe", "model_family": "Designline", "type": "surcharge", "category": "sliding_roof", "pricing_method": "simple", "description": "Aufpreis pro Feld für Schiebeeinheit (przesuwne szyby na dachu)"}'::jsonb
    )
    RETURNING id INTO v_table_id;

    -- Insert price points (width_mm=0, projection_mm=depth)
    -- Prices extracted from Excel with data_only=True
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        (v_table_id, 0, 2500, 222.75),
        (v_table_id, 0, 3000, 267.30),
        (v_table_id, 0, 3500, 311.85),
        (v_table_id, 0, 4000, 356.40),
        (v_table_id, 0, 4500, 400.95),
        (v_table_id, 0, 5000, 445.50);

    RAISE NOTICE 'Created Designline Schiebeeinheit surcharge table with % entries', 6;
END $$;

COMMIT;

-- Verification query
-- SELECT pt.name, pme.projection_mm, pme.price 
-- FROM price_tables pt 
-- JOIN price_matrix_entries pme ON pt.id = pme.price_table_id 
-- WHERE pt.name ILIKE '%Schiebeeinheit%'
-- ORDER BY pme.projection_mm;
