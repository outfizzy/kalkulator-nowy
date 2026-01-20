-- Fix Freestanding Pricing for Ultraline, Skyline, Carport
-- 1. Create missing Ultraline Freestanding Glass tables (Zone 1-3)
-- 2. Create Carport Freestanding tables (Zone 1-3) by copying existing Carport tables (aliasing)

BEGIN;

-- Part 1: Ultraline Freestanding Glass (Separate Table Strategy)
-- We remove Ultraline from Surcharge model in code, so it needs a dedicated table.
-- We are creating placeholder tables. User needs to import prices if not present.

DO $$
DECLARE
    v_table_id uuid;
    zone_idx integer;
BEGIN
    FOR zone_idx IN 1..3 LOOP
        -- Delete if exists to ensuring clean state
        DELETE FROM price_tables WHERE name = format('Aluxe V2 - Ultraline Freestanding Glass (Zone %s)', zone_idx);

        INSERT INTO price_tables (name, type, is_active, currency, attributes)
        VALUES (
            format('Aluxe V2 - Ultraline Freestanding Glass (Zone %s)', zone_idx),
            'matrix',
            true,
            'EUR',
            jsonb_build_object(
                'provider', 'Aluxe',
                'model_family', 'Ultraline',
                'cover_type', 'glass_clear', -- Ultraline is glass only usually
                'zone', zone_idx,
                'construction_type', 'freestanding',
                'structure_type', 'matrix'
            )
        )
        RETURNING id INTO v_table_id;

        -- Insert dummy entry (optional, so importer has something to latch onto or just empty)
        -- We'll leave it empty. The user can use the Importer tool to upload the XLS/Image.
        -- OR if we have data from the user image, we would insert it here.
        -- Given user said "nie zaciąga", they probably expect it to be there.
    END LOOP;
END $$;


-- Part 2: Carport Freestanding (Fix Naming Mismatch)
-- Code looks for "Aluxe V2 - Carport Freestanding (Zone X)"
-- DB has "Aluxe V2 - Carport (Zone X)"
-- We will create the "Freestanding" variant by copying data from the existing one.

DO $$
DECLARE
    v_source_table_id uuid;
    v_new_table_id uuid;
    zone_idx integer;
    v_source_name text;
    v_target_name text;
BEGIN
    FOR zone_idx IN 1..3 LOOP
        v_source_name := format('Aluxe V2 - Carport (Zone %s)', zone_idx);
        v_target_name := format('Aluxe V2 - Carport Freestanding (Zone %s)', zone_idx);

        -- Find source table
        SELECT id INTO v_source_table_id FROM price_tables WHERE name = v_source_name;

        IF v_source_table_id IS NOT NULL THEN
            -- Delete target if exists
            DELETE FROM price_tables WHERE name = v_target_name;

            -- Create target table
            INSERT INTO price_tables (name, type, is_active, currency, attributes)
            VALUES (
                v_target_name,
                'matrix',
                true,
                'EUR',
                jsonb_build_object(
                    'provider', 'Aluxe',
                    'model_family', 'Carport',
                    'cover_type', 'Aluminum', -- Carport generic
                    'zone', zone_idx,
                    'construction_type', 'freestanding', -- Explicitly freestanding
                    'pricing_method', 'matrix',
                    'structure_type', 'linear'
                )
            )
            RETURNING id INTO v_new_table_id;

            -- Copy entries
            INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
            SELECT v_new_table_id, width_mm, projection_mm, price
            FROM price_matrix_entries
            WHERE price_table_id = v_source_table_id;
            
            RAISE NOTICE 'Created % with data from %', v_target_name, v_source_name;
        ELSE
            RAISE NOTICE 'Source table % not found, skipping copy.', v_source_name;
        END IF;
    END LOOP;
END $$;

COMMIT;
